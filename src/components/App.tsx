import { useEffect } from "react";
import { useFileStore, startAutoSave } from "@/store/useFileStore";
import { useTemplateStore } from "@/store/useTemplateStore";
import { useViewStore } from "@/store/useViewStore";
import { WelcomeScreen } from "./WelcomeScreen";
import { Workspace } from "./Workspace";

export function App() {
  const appMode = useFileStore((s) => s.appMode);

  useEffect(() => {
    useFileStore.getState().hydrateFromStorage();
    useTemplateStore.getState().hydrateFromStorage();
    useViewStore.getState().hydrateFromStorage();
    startAutoSave();
  }, []);

  if (appMode === "welcome") return <WelcomeScreen />;
  return <Workspace />;
}
