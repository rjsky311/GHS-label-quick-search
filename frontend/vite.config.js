import os from "node:os";
import path from "node:path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

function createViteHealthCheckPlugin() {
  const startedAt = Date.now();
  const status = {
    state: "idle",
    errors: [],
    warnings: [],
    lastCompileTime: null,
    lastSuccessTime: null,
    compileDuration: 0,
    totalCompiles: 0,
    firstCompileTime: null,
  };

  const markCompileStart = () => {
    const now = Date.now();
    status.state = "compiling";
    status.lastCompileTime = now;
    if (!status.firstCompileTime) {
      status.firstCompileTime = now;
    }
  };

  const markCompileSuccess = () => {
    const now = Date.now();
    status.state = "success";
    status.lastSuccessTime = now;
    status.totalCompiles += 1;
    status.errors = [];
    status.compileDuration = status.lastCompileTime ? now - status.lastCompileTime : 0;
  };

  const markCompileFailure = (error) => {
    const now = Date.now();
    status.state = "failed";
    status.errors = error
      ? [
          {
            message: error.message || String(error),
            stack: error.stack || null,
          },
        ]
      : [];
    status.compileDuration = status.lastCompileTime ? now - status.lastCompileTime : 0;
  };

  const getStatus = () => ({
    ...status,
    isHealthy: status.state === "success",
    errorCount: status.errors.length,
    warningCount: status.warnings.length,
    hasCompiled: status.totalCompiles > 0,
  });

  const getSimpleStatus = () => ({
    state: status.state,
    isHealthy: status.state === "success",
    errorCount: status.errors.length,
    warningCount: status.warnings.length,
  });

  const formatBytes = (bytes) => {
    if (bytes === 0) return "0 B";
    const units = ["B", "KB", "MB", "GB"];
    const unitIndex = Math.min(
      Math.floor(Math.log(bytes) / Math.log(1024)),
      units.length - 1
    );
    const value = bytes / 1024 ** unitIndex;
    return `${Math.round(value * 100) / 100} ${units[unitIndex]}`;
  };

  const formatDuration = (ms) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const registerGetRoute = (server, route, handler) => {
    server.middlewares.use((req, res, next) => {
      const pathname = req.url?.split("?")[0];
      if (req.method !== "GET" || pathname !== route) {
        next();
        return;
      }

      const response = {
        status(code) {
          res.statusCode = code;
          return response;
        },
        json(payload) {
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          res.end(JSON.stringify(payload));
        },
        send(payload) {
          if (typeof payload === "object") {
            response.json(payload);
            return;
          }
          res.setHeader("Content-Type", "text/plain; charset=utf-8");
          res.end(String(payload));
        },
      };

      handler(req, response);
    });
  };

  return {
    name: "ghs-vite-health-check",
    configureServer(server) {
      markCompileStart();
      markCompileSuccess();

      const setupRoutes = () => {
        registerGetRoute(server, "/health", (_req, res) => {
          const current = getStatus();
          const uptime = Date.now() - startedAt;
          const memUsage = process.memoryUsage();

          res.json({
            status: current.isHealthy ? "healthy" : "unhealthy",
            timestamp: new Date().toISOString(),
            uptime: {
              seconds: Math.floor(uptime / 1000),
              formatted: formatDuration(uptime),
            },
            vite: {
              state: current.state,
              isHealthy: current.isHealthy,
              hasCompiled: current.hasCompiled,
              errors: current.errorCount,
              warnings: current.warningCount,
              lastCompileTime: current.lastCompileTime
                ? new Date(current.lastCompileTime).toISOString()
                : null,
              lastSuccessTime: current.lastSuccessTime
                ? new Date(current.lastSuccessTime).toISOString()
                : null,
              compileDuration: current.compileDuration ? `${current.compileDuration}ms` : null,
              totalCompiles: current.totalCompiles,
              firstCompileTime: current.firstCompileTime
                ? new Date(current.firstCompileTime).toISOString()
                : null,
            },
            server: {
              nodeVersion: process.version,
              platform: os.platform(),
              arch: os.arch(),
              cpus: os.cpus().length,
              memory: {
                heapUsed: formatBytes(memUsage.heapUsed),
                heapTotal: formatBytes(memUsage.heapTotal),
                rss: formatBytes(memUsage.rss),
                external: formatBytes(memUsage.external),
              },
              systemMemory: {
                total: formatBytes(os.totalmem()),
                free: formatBytes(os.freemem()),
                used: formatBytes(os.totalmem() - os.freemem()),
              },
            },
            environment: process.env.NODE_ENV || "development",
          });
        });

        registerGetRoute(server, "/health/simple", (_req, res) => {
          const current = getSimpleStatus();
          if (current.state === "success") {
            res.status(200).send("OK");
            return;
          }
          if (current.state === "compiling" || current.state === "idle") {
            res.status(200).send(current.state.toUpperCase());
            return;
          }
          res.status(503).send("ERROR");
        });

        registerGetRoute(server, "/health/ready", (_req, res) => {
          const current = getSimpleStatus();
          if (current.state === "success") {
            res.status(200).json({ ready: true, state: current.state });
            return;
          }
          res.status(503).json({
            ready: false,
            state: current.state,
            reason:
              current.state === "compiling" ? "Compilation in progress" : "Compilation failed",
          });
        });

        registerGetRoute(server, "/health/live", (_req, res) => {
          res.status(200).json({
            alive: true,
            timestamp: new Date().toISOString(),
          });
        });

        registerGetRoute(server, "/health/errors", (_req, res) => {
          const current = getStatus();
          res.json({
            errorCount: current.errorCount,
            warningCount: current.warningCount,
            errors: current.errors,
            warnings: current.warnings,
            state: current.state,
          });
        });

        registerGetRoute(server, "/health/stats", (_req, res) => {
          const current = getStatus();
          const uptime = Date.now() - startedAt;
          res.json({
            totalCompiles: current.totalCompiles,
            averageCompileTime:
              current.totalCompiles > 0
                ? `${Math.round(uptime / current.totalCompiles)}ms`
                : null,
            lastCompileDuration: current.compileDuration
              ? `${current.compileDuration}ms`
              : null,
            firstCompileTime: current.firstCompileTime
              ? new Date(current.firstCompileTime).toISOString()
              : null,
            serverUptime: formatDuration(uptime),
          });
        });
      };

      setupRoutes();
      server.watcher.on("change", markCompileStart);
      server.watcher.on("add", markCompileStart);
      server.watcher.on("unlink", markCompileStart);
    },
    handleHotUpdate() {
      markCompileSuccess();
    },
    buildStart() {
      markCompileStart();
    },
    buildEnd(error) {
      if (error) {
        markCompileFailure(error);
        return;
      }
      markCompileSuccess();
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const backendUrl =
    (env.VITE_BACKEND_URL || env.REACT_APP_BACKEND_URL || "").trim();
  const pilotAdminEnabled =
    (env.VITE_ENABLE_PILOT_ADMIN || "").trim().toLowerCase() === "true";
  const workspaceSyncEnabled =
    (env.VITE_ENABLE_WORKSPACE_SYNC || "").trim().toLowerCase() === "true";

  return {
    plugins: [
      react(),
      env.ENABLE_HEALTH_CHECK === "true" ? createViteHealthCheckPlugin() : null,
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
      },
    },
    build: {
      outDir: "build",
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes("node_modules")) return undefined;
            if (id.includes("react") || id.includes("scheduler")) return "vendor-react";
            if (id.includes("lucide-react")) return "vendor-icons";
            if (id.includes("i18next")) return "vendor-i18n";
            if (id.includes("axios") || id.includes("sonner")) return "vendor-app";
            return "vendor";
          },
        },
      },
    },
    envPrefix: ["VITE_", "REACT_APP_"],
    define: {
      "globalThis.__APP_BACKEND_URL__": JSON.stringify(backendUrl),
      "globalThis.__APP_PILOT_ADMIN_ENABLED__": JSON.stringify(pilotAdminEnabled),
      "globalThis.__APP_WORKSPACE_SYNC_ENABLED__": JSON.stringify(workspaceSyncEnabled),
    },
  };
});
