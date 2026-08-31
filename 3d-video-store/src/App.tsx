import { useState } from "react";
import { StoreScene } from "./components/3d/StoreScene";
import { Sidebar } from "./components/ui/Sidebar";
import { MovieInfoPanel } from "./components/ui/MovieInfoPanel";
import { NavigationArrows } from "./components/ui/NavigationArrows";
import { NavigationHelp } from "./components/ui/NavigationHelp";
import { BottomHelp } from "./components/ui/BottomHelp";
import { TopBar } from "./components/ui/TopBar";
import { MovieSelectionProvider } from "./hooks/useMovieSelection";
import { useKeyboardControls } from "./hooks/useKeyboardControls";

function StoreUI() {
  useKeyboardControls();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="fixed inset-0 pointer-events-none flex flex-col p-3 sm:p-4 gap-2 sm:gap-3">
      <TopBar />

      <div className="flex-1 flex gap-3 min-h-0">
        <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
        <div className="flex-1" />
        <MovieInfoPanel />
      </div>

      <div className="flex items-end justify-between shrink-0 gap-2 max-md:mb-[48vh]">
        <NavigationHelp />
        <div className="flex flex-col items-center gap-2 mx-auto lg:mx-0">
          <NavigationArrows />
          <BottomHelp onMenuClick={() => setMenuOpen(true)} />
        </div>
        <div className="hidden lg:block w-[220px]" />
      </div>
    </div>
  );
}

function App() {
  return (
    <MovieSelectionProvider>
      <div className="relative h-dvh w-screen overflow-hidden bg-nlf-black">
        <StoreScene />
        <StoreUI />
      </div>
    </MovieSelectionProvider>
  );
}

export default App;
