import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "@/components/App";
import "@/styles/globals.css";
import "@/utils/logger"; // Initialize logger early — side-effect import
import { setupDeepDebug } from "@/utils/debugVideo";
setupDeepDebug();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
