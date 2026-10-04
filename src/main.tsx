import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import ErrorBoundary from "./components/ErrorBoundary";

// last-resort inline CSS so a JS crash can never leave a stark white page
document.body.style.margin = "0";
document.body.style.background = "#07051a";

// index.html loads the font stylesheet non-blocking (media="print"); apply it here as well
// so fonts still arrive if inline event handlers are blocked by a content policy.
document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"][media="print"]').forEach((link) => {
  link.media = "all";
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);
