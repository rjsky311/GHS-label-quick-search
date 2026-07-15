import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, "../..");

const removedUiComponents = [
  "accordion",
  "alert-dialog",
  "alert",
  "aspect-ratio",
  "avatar",
  "badge",
  "breadcrumb",
  "calendar",
  "card",
  "carousel",
  "checkbox",
  "collapsible",
  "command",
  "context-menu",
  "dialog",
  "drawer",
  "dropdown-menu",
  "form",
  "hover-card",
  "input-otp",
  "input",
  "label",
  "menubar",
  "navigation-menu",
  "pagination",
  "popover",
  "progress",
  "radio-group",
  "resizable",
  "scroll-area",
  "select",
  "separator",
  "sheet",
  "skeleton",
  "slider",
  "sonner",
  "switch",
  "table",
  "tabs",
  "textarea",
  "toast",
  "toaster",
  "toggle-group",
  "toggle",
  "tooltip",
];

const removedDirectDependencies = [
  "@hookform/resolvers",
  "@radix-ui/react-accordion",
  "@radix-ui/react-alert-dialog",
  "@radix-ui/react-aspect-ratio",
  "@radix-ui/react-avatar",
  "@radix-ui/react-checkbox",
  "@radix-ui/react-collapsible",
  "@radix-ui/react-context-menu",
  "@radix-ui/react-dialog",
  "@radix-ui/react-dropdown-menu",
  "@radix-ui/react-hover-card",
  "@radix-ui/react-label",
  "@radix-ui/react-menubar",
  "@radix-ui/react-navigation-menu",
  "@radix-ui/react-popover",
  "@radix-ui/react-progress",
  "@radix-ui/react-radio-group",
  "@radix-ui/react-scroll-area",
  "@radix-ui/react-select",
  "@radix-ui/react-separator",
  "@radix-ui/react-slider",
  "@radix-ui/react-switch",
  "@radix-ui/react-tabs",
  "@radix-ui/react-toast",
  "@radix-ui/react-toggle",
  "@radix-ui/react-toggle-group",
  "@radix-ui/react-tooltip",
  "cmdk",
  "date-fns",
  "embla-carousel-react",
  "input-otp",
  "next-themes",
  "react-day-picker",
  "react-hook-form",
  "react-resizable-panels",
  "react-router-dom",
  "recharts",
  "vaul",
  "zod",
];

test("dead UI scaffolds and their direct dependencies are absent", () => {
  const uiRoot = path.join(frontendRoot, "src/components/ui");
  for (const name of removedUiComponents) {
    assert.equal(fs.existsSync(path.join(uiRoot, `${name}.jsx`)), false, name);
  }

  const packageJson = JSON.parse(
    fs.readFileSync(path.join(frontendRoot, "package.json"), "utf8"),
  );
  for (const name of removedDirectDependencies) {
    assert.equal(packageJson.dependencies?.[name], undefined, name);
  }
  assert.equal(fs.existsSync(path.join(uiRoot, "button.jsx")), true);
});
