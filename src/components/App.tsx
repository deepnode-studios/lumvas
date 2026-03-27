import { useEffect } from "react";
import { useFileStore, startAutoSave } from "@/store/useFileStore";
import { useLumvasStore } from "@/store/useLumvasStore";
import { useTemplateStore } from "@/store/useTemplateStore";
import { useViewStore } from "@/store/useViewStore";
import { WelcomeScreen } from "./WelcomeScreen";
import { Workspace } from "./Workspace";
import { VideoWorkspace } from "./video/VideoWorkspace";

export function App() {
  const appMode = useFileStore((s) => s.appMode);
  const contentType = useLumvasStore((s) => s.contentType);

  useEffect(() => {
    useFileStore.getState().hydrateFromStorage();
    useTemplateStore.getState().hydrateFromStorage();
    useViewStore.getState().hydrateFromStorage();
    startAutoSave();
  }, []);

  if (appMode === "welcome") return <WelcomeScreen />;
  if (contentType === "video") return <VideoWorkspace />;
  return <Workspace />;
}
