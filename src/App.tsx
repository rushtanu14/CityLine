import { useMemo, useState } from "react";
import { CommandView } from "./components/CommandView";
import { CityScene } from "./components/CityScene";
import { OverlayHud } from "./components/OverlayHud";
import { findNeighborhood, hazards, type HazardId } from "./data/cityData";
import { getIntroState } from "./lib/introSequence";
import { useScrollProgress } from "./lib/useScrollProgress";

function App() {
  const scrollMetrics = useScrollProgress();
  const introState = useMemo(
    () => getIntroState(scrollMetrics.introProgress),
    [scrollMetrics.introProgress],
  );
  const [activeHazard, setActiveHazard] = useState<HazardId>("flood");
  const [selectedNeighborhoodId, setSelectedNeighborhoodId] = useState("seaport");
  const selectedNeighborhood = useMemo(
    () => findNeighborhood(selectedNeighborhoodId),
    [selectedNeighborhoodId],
  );
  const activeLayer = useMemo(
    () => hazards.find((hazard) => hazard.id === activeHazard) ?? hazards[0],
    [activeHazard],
  );

  const scrollToCommand = () => {
    document.getElementById("command")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="app-shell">
      <CityScene
        activeHazard={activeHazard}
        introState={introState}
        scrollProgress={scrollMetrics.introProgress}
        selectedNeighborhoodId={selectedNeighborhoodId}
      />
      <div className="scene-scrim" aria-hidden="true" />
      <OverlayHud
        activeHazard={activeHazard}
        commandActive={scrollMetrics.commandActive}
        introState={introState}
        onCommandJump={scrollToCommand}
        onHazardChange={setActiveHazard}
        onNeighborhoodChange={setSelectedNeighborhoodId}
        scrollProgress={scrollMetrics.introProgress}
        selectedNeighborhoodId={selectedNeighborhoodId}
      />

      <main>
        <section
          className="scroll-stage"
          aria-label={`CityLine flood sequence for ${selectedNeighborhood.borough}: ${activeLayer.summary}`}
        />
        <CommandView
          activeHazard={activeHazard}
          onHazardChange={setActiveHazard}
          onNeighborhoodChange={setSelectedNeighborhoodId}
          selectedNeighborhoodId={selectedNeighborhoodId}
        />
      </main>
    </div>
  );
}

export default App;
