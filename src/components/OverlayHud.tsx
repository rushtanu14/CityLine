import {
  ArrowUpRight,
  Crosshair,
  Gauge,
  Layers,
  MapPin,
  Navigation,
  RadioTower,
  Search,
  ShieldAlert,
  Siren,
} from "lucide-react";
import type { CSSProperties } from "react";
import {
  findNeighborhood,
  findRoute,
  hazards,
  type HazardId,
} from "../data/cityData";
import { introBeats, type IntroState } from "../lib/introSequence";

type OverlayHudProps = {
  activeHazard: HazardId;
  commandActive: boolean;
  introState: IntroState;
  selectedNeighborhoodId: string;
  scrollProgress: number;
  onHazardChange: (hazard: HazardId) => void;
  onNeighborhoodChange: (id: string) => void;
  onCommandJump: () => void;
};

export function OverlayHud({
  activeHazard,
  commandActive,
  introState,
  selectedNeighborhoodId,
  scrollProgress,
  onHazardChange,
  onNeighborhoodChange,
  onCommandJump,
}: OverlayHudProps) {
  const neighborhood = findNeighborhood(selectedNeighborhoodId);
  const route = findRoute(neighborhood.recommendedRouteId);
  const story = introState.beat;
  const StoryIcon = story.icon;
  const supportVisible = scrollProgress >= 0.08;
  const riskVisible = introState.beat.id === "route-act" || introState.beat.id === "neighborhood";
  const compactHero = scrollProgress >= 0.62;

  return (
    <div className={commandActive ? "intro-hud intro-hud--hidden" : "intro-hud"}>
      <header className="topbar">
        <button className="brand-lockup" type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
          <span className="brand-mark">
            <RadioTower size={20} strokeWidth={1.8} />
          </span>
          <span>
            <strong>CityLine</strong>
            <small>NYC Flood Ops</small>
          </span>
        </button>
        <nav className="topbar-actions" aria-label="CityLine modes">
          <button type="button" onClick={onCommandJump}>
            <Gauge size={17} />
            Command
          </button>
          <button type="button" onClick={onCommandJump}>
            <Navigation size={17} />
            Route
          </button>
          <button type="button" onClick={onCommandJump}>
            <Layers size={17} />
            Layers
          </button>
        </nav>
      </header>

      <section
        className={compactHero ? "hero-overlay hero-overlay--route" : "hero-overlay"}
        aria-label="CityLine emergency view"
      >
        <div className="hero-kicker">
          <Siren size={18} />
          <span>{story.eyebrow}</span>
        </div>
        <h1>{story.title}</h1>
        <div className="hero-gridline" />
        <div className="hero-summary">
          <span>{story.label}</span>
          <p>{story.body}</p>
          <strong>{story.statLabel}: {story.statValue}</strong>
        </div>
      </section>

      <aside className="story-monitor" aria-label="Flood sequence status">
        <div className="story-monitor__head">
          <StoryIcon size={18} />
          <span>Sequence {String(introState.beatIndex + 1).padStart(2, "0")}</span>
        </div>
        <div className="story-steps">
          {introBeats.map((beat, index) => {
            const Icon = beat.icon;
            return (
              <div className={index === introState.beatIndex ? "story-step story-step--active" : "story-step"} key={beat.id}>
                <Icon size={15} />
                <span>{beat.label}</span>
              </div>
            );
          })}
        </div>
      </aside>

      <aside className={supportVisible ? "intro-support is-visible" : "intro-support"} aria-label="Current sequence data">
        <div className="intro-support__head">
          <StoryIcon size={18} />
          <span>{story.supportTitle}</span>
        </div>

        {!riskVisible ? (
          <div className="support-list">
            {story.supportItems.map((item) => (
              <div className={`support-row support-row--${item.tone ?? "info"}`} key={`${story.id}-${item.label}`}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        ) : (
          <div className="support-route">
            <div className="risk-lens__top">
              <div>
                <span>Address lens</span>
                <strong>{neighborhood.name}</strong>
              </div>
              <Crosshair size={21} />
            </div>

            <label className="address-select">
              <Search size={17} />
              <select value={selectedNeighborhoodId} onChange={(event) => onNeighborhoodChange(event.target.value)}>
                <option value="seaport">19 Fulton St / Seaport</option>
                <option value="red-hook">199 Van Brunt St / Red Hook</option>
                <option value="lic">46-01 5th St / LIC</option>
              </select>
            </label>

            <div className="risk-score">
              <span>{neighborhood.riskScore}</span>
              <div>
                <strong>{neighborhood.dangerLevel} flood risk</strong>
                <small>{neighborhood.floodDepth} projected street depth / {neighborhood.confidence} confidence</small>
              </div>
            </div>

            <div className="route-strip">
              <MapPin size={18} />
              <div>
                <strong>{route.name}</strong>
                <span>{route.travelTime} / {route.status}</span>
              </div>
              <ArrowUpRight size={16} />
            </div>

            <button className="primary-command" type="button" onClick={onCommandJump}>
              <Navigation size={18} />
              Open command view
            </button>
          </div>
        )}
      </aside>

      <section className={riskVisible ? "hazard-dock is-visible" : "hazard-dock"} aria-label="Hazard layers">
        {hazards.map((hazard) => {
          const Icon = hazard.icon;
          const active = hazard.id === activeHazard;
          return (
            <button
              className={active ? "hazard-chip hazard-chip--active" : "hazard-chip"}
              key={hazard.id}
              type="button"
              onClick={() => onHazardChange(hazard.id)}
              style={{ "--hazard-accent": hazard.accent } as CSSProperties}
            >
              <Icon size={17} />
              <span>{hazard.name}</span>
            </button>
          );
        })}
      </section>

      <div className="scroll-rail" aria-hidden="true">
        <span style={{ height: `${Math.max(scrollProgress * 100, 4)}%` }} />
      </div>
      <div className={riskVisible ? "resident-mobile-bar is-visible" : "resident-mobile-bar"}>
        <ShieldAlert size={18} />
        <span>{neighborhood.name}: {neighborhood.dangerLevel}</span>
        <button type="button" onClick={onCommandJump}>Route</button>
      </div>
    </div>
  );
}
