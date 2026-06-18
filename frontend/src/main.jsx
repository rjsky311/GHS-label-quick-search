import React from "react";
import ReactDOM from "react-dom/client";
import { i18nReady } from "@/i18n";
import "@/index.css";
import App from "@/App";
import ErrorBoundary from "@/components/ErrorBoundary";

const renderApp = () => {
  const root = ReactDOM.createRoot(document.getElementById("root"));
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>,
  );
};

i18nReady.then(renderApp).catch((error) => {
  console.error("Failed to initialize translations", error);
  renderApp();
});
