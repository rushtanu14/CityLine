import {
  Activity,
  ArrowUpRight,
  Building2,
  CheckCircle2,
  CircleAlert,
  CloudRain,
  Crosshair,
  Gauge,
  HeartPulse,
  Hospital,
  Layers3,
  Map,
  Navigation,
  RadioTower,
  Route as RouteIcon,
  School,
  ShieldAlert,
  SlidersHorizontal,
  TrainFront,
  Waves,
} from "lucide-react";
import type { CSSProperties } from "react";
import {
  facilities,
  findNeighborhood,
  findRoute,
  getFacilitiesFor,
  hazards,
  infrastructure,
  neighborhoods,
  type HazardId,
} from "../data/cityData";

type CommandViewProps = {
  activeHazard: HazardId;
  selectedNeighborhoodId: string;
  onHazardChange: (hazard: HazardId) => void;
  onNeighborhoodChange: (id: string) => void;
};

export function CommandView({
  activeHazard,
  selectedNeighborhoodId,
  onHazardChange,
  onNeighborhoodChange,
}: CommandViewProps) {
  const neighborhood = findNeighborhood(selectedNeighborhoodId);
  const route = findRoute(neighborhood.recommendedRouteId);
  const selectedShelters = getFacilitiesFor(neighborhood.nearestShelterIds);
  const selectedHospitals = getFacilitiesFor(neighborhood.nearestHospitalIds);
  const commandSteps = ["Alert", "Address", "Risk", "Route", "Act"];

  return (
    <section className="command-view" id="command" aria-label="CityLine command view">
      <div className="command-heading">
        <div>
          <span>CityLine command</span>
          <h2>Resident emergency flow</h2>
        </div>
        <div className="source-strip">
          <RadioTower size={17} />
          <span>Curated NYC scene</span>
          <strong>Public-data hooks ready</strong>
        </div>
      </div>

      <div className="command-stepper" aria-label="CityLine emergency workflow">
        {commandSteps.map((step, index) => (
          <div className="command-step" key={step}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{step}</strong>
          </div>
        ))}
      </div>

      <div className="mode-grid">
        <button className="mode-button mode-button--active" type="button">
          <Crosshair size={18} />
          Address Risk Lens
        </button>
        <button className="mode-button" type="button">
          <SlidersHorizontal size={18} />
          Scenario Simulator
        </button>
        <button className="mode-button" type="button">
          <Gauge size={18} />
          Live Dashboard
        </button>
        <button className="mode-button" type="button">
          <Map size={18} />
          Resilience Planner
        </button>
      </div>

      <div className="command-layout">
        <section className="command-panel command-panel--primary">
          <div className="panel-label">
            <CircleAlert size={17} />
            Resident risk result
          </div>
          <div className="address-picker">
            {neighborhoods.map((item) => (
              <button
                className={item.id === selectedNeighborhoodId ? "address-pill address-pill--active" : "address-pill"}
                key={item.id}
                type="button"
                onClick={() => onNeighborhoodChange(item.id)}
              >
                <span>{item.borough}</span>
                <strong>{item.name}</strong>
              </button>
            ))}
          </div>

          <div className="risk-detail">
            <div className="risk-orb">
              <span>{neighborhood.riskScore}</span>
              <small>risk</small>
            </div>
            <div>
              <h3>{neighborhood.addressLabel}</h3>
              <p>{neighborhood.summary}</p>
              <div className="risk-tags">
                <span>{neighborhood.floodDepth} flood depth</span>
                <span>{neighborhood.dangerLevel}</span>
                <span>{neighborhood.confidence} confidence</span>
              </div>
            </div>
          </div>

          <div className="reason-grid">
            {neighborhood.riskReasons.map((reason) => (
              <div className="reason-item" key={reason}>
                <ShieldAlert size={16} />
                <span>{reason}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="command-panel command-panel--route">
          <div className="panel-label">
            <RouteIcon size={17} />
            Safe route
          </div>
          <div className="route-head">
            <div>
              <span>{route.startLabel}</span>
              <strong>{route.endLabel}</strong>
            </div>
            <strong>{route.travelTime}</strong>
          </div>
          <div className="route-map" aria-hidden="true">
            <div className="route-node route-node--start" />
            <div className="route-line" />
            <div className="route-node route-node--end" />
            <Navigation size={20} />
          </div>
          <p>{route.routeReason}</p>
          <div className="blocked-list">
            {route.blockedSegments.map((segment) => (
              <span key={segment}>
                <TrainFront size={14} />
                {segment}
              </span>
            ))}
          </div>
        </section>

        <section className="command-panel command-panel--actions">
          <div className="panel-label">
            <CheckCircle2 size={17} />
            Act now
          </div>
          <div className="action-list">
            {neighborhood.actionSteps.map((step, index) => (
              <div className="action-item" key={step}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{step}</strong>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="layer-layout">
        <section className="command-panel">
          <div className="panel-label">
            <Layers3 size={17} />
            Hazard layers
          </div>
          <div className="hazard-layer-grid">
            {hazards.map((hazard) => {
              const Icon = hazard.icon;
              return (
                <button
                  className={hazard.id === activeHazard ? "layer-tile layer-tile--active" : "layer-tile"}
                  key={hazard.id}
                  type="button"
                  onClick={() => onHazardChange(hazard.id)}
                  style={{ "--layer-color": hazard.accent } as CSSProperties}
                >
                  <Icon size={21} />
                  <span>{hazard.name}</span>
                  <strong>{hazard.severity}</strong>
                  <small>{hazard.source}</small>
                </button>
              );
            })}
          </div>
        </section>

        <section className="command-panel">
          <div className="panel-label">
            <Building2 size={17} />
            Infrastructure status
          </div>
          <div className="infrastructure-list">
            {infrastructure.map((asset) => (
              <div className="infrastructure-item" key={asset.id}>
                <span className={`status-dot status-dot--${asset.riskLevel.toLowerCase()}`} />
                <div>
                  <strong>{asset.name}</strong>
                  <small>{asset.dependencyNotes}</small>
                </div>
                <span>{asset.status}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="facility-layout">
        <section className="command-panel">
          <div className="panel-label">
            <Building2 size={17} />
            Shelter routing
          </div>
          <div className="facility-grid">
            {selectedShelters.map((facility) => (
              <FacilityTile key={facility.id} facility={facility} />
            ))}
          </div>
        </section>
        <section className="command-panel">
          <div className="panel-label">
            <Hospital size={17} />
            Medical and community nodes
          </div>
          <div className="facility-grid">
            {selectedHospitals.map((facility) => (
              <FacilityTile key={facility.id} facility={facility} />
            ))}
            {facilities
              .filter((facility) => facility.type === "school" || facility.type === "cooling_center")
              .slice(0, 1)
              .map((facility) => (
                <FacilityTile key={facility.id} facility={facility} />
              ))}
          </div>
        </section>
      </div>

      <section className="scenario-band" aria-label="Scenario simulator preview">
        <div className="scenario-copy">
          <span>Scenario simulator</span>
          <h3>Storm tide + rainfall + closures</h3>
          <p>V1 treats these as curated demo controls. The next pass can bind each control to public data and real scenario math.</p>
        </div>
        <div className="scenario-controls" aria-label="Scenario control preview">
          <ScenarioGauge icon={CloudRain} label="Rainfall" value="3.2 in/hr" />
          <ScenarioGauge icon={Waves} label="Tide surge" value="+6.8 ft" />
          <ScenarioGauge icon={TrainFront} label="Transit closed" value="2 nodes" />
          <ScenarioGauge icon={HeartPulse} label="Shelter load" value="61%" />
        </div>
      </section>

      <section className="resume-band" aria-label="CityLine resume positioning">
        <div>
          <span>Resume angle</span>
          <strong>Real-world civic impact + public-data depth</strong>
        </div>
        <p>
          Built CityLine, a civic resilience web platform that helps residents understand emergency risk, safe routes,
          shelters, and preparedness actions using public hazard, infrastructure, and emergency-resource data in an
          immersive 3D city interface.
        </p>
        <ArrowUpRight size={24} />
      </section>
    </section>
  );
}

function FacilityTile({ facility }: { facility: (typeof facilities)[number] }) {
  const Icon = facility.type === "hospital" ? Hospital : facility.type === "school" ? School : Building2;

  return (
    <div className="facility-tile">
      <Icon size={18} />
      <div>
        <strong>{facility.name}</strong>
        <span>{facility.status} / {facility.capacity}</span>
        <small>{facility.notes}</small>
      </div>
    </div>
  );
}

function ScenarioGauge({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
}) {
  return (
    <div className="scenario-gauge">
      <Icon size={19} />
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
