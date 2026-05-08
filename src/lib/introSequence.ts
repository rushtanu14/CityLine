import { AlertTriangle, CloudRain, MapPin, Navigation, Waves, type LucideIcon } from "lucide-react";

export type IntroBeatId = "alert" | "rainfall" | "street-flood" | "neighborhood" | "route-act";

export type IntroBeat = {
  id: IntroBeatId;
  label: string;
  eyebrow: string;
  title: string;
  body: string;
  statLabel: string;
  statValue: string;
  icon: LucideIcon;
  supportTitle: string;
  supportItems: Array<{
    label: string;
    value: string;
    tone?: "danger" | "info" | "safe";
  }>;
};

export type IntroState = {
  beat: IntroBeat;
  beatIndex: number;
  beatProgress: number;
  progress: number;
  floodProgress: number;
  rainIntensity: number;
  routeProgress: number;
  neighborhoodProgress: number;
};

const clamp01 = (value: number) => Math.min(Math.max(value, 0), 1);

export const introBeats: IntroBeat[] = [
  {
    id: "alert",
    label: "Alert",
    eyebrow: "Flash flood warning / Manhattan edge zone",
    title: "CityLine",
    body: "A coastal warning hits lower Manhattan before the first streets close.",
    statLabel: "Surge window",
    statValue: "34 min",
    icon: AlertTriangle,
    supportTitle: "Emergency signal",
    supportItems: [
      { label: "Warning", value: "FLOOD-04", tone: "danger" },
      { label: "Transit", value: "Watch entries", tone: "info" },
      { label: "Shelters", value: "Opening", tone: "safe" },
    ],
  },
  {
    id: "rainfall",
    label: "Rainfall",
    eyebrow: "Rain bands over the harbor",
    title: "Rain becomes a system failure.",
    body: "Drainage, tide, and transit entries begin interacting instead of failing one by one.",
    statLabel: "Rainfall rate",
    statValue: "3.2 in/hr",
    icon: CloudRain,
    supportTitle: "Storm inputs",
    supportItems: [
      { label: "Rain", value: "3.2 in/hr", tone: "info" },
      { label: "Tide", value: "+6.8 ft", tone: "danger" },
      { label: "Drainage", value: "Saturating", tone: "danger" },
    ],
  },
  {
    id: "street-flood",
    label: "Street Flood",
    eyebrow: "Low streets fill first",
    title: "The street grid starts choosing sides.",
    body: "Water cuts through road channels, subway access, and tunnel approaches before it reaches towers.",
    statLabel: "Projected depth",
    statValue: "3.8 ft",
    icon: Waves,
    supportTitle: "Impact layer",
    supportItems: [
      { label: "Roads", value: "2 restricted", tone: "danger" },
      { label: "Subway", value: "1 closed", tone: "danger" },
      { label: "Power", value: "Watch band", tone: "info" },
    ],
  },
  {
    id: "neighborhood",
    label: "Neighborhood",
    eyebrow: "Address risk lens",
    title: "The camera drops from city scale to block scale.",
    body: "CityLine turns the flood model into a resident-readable neighborhood reveal.",
    statLabel: "Risk score",
    statValue: "88 / Severe",
    icon: MapPin,
    supportTitle: "Local readout",
    supportItems: [
      { label: "Address", value: "19 Fulton St", tone: "info" },
      { label: "Depth", value: "3.8 ft", tone: "danger" },
      { label: "Confidence", value: "82%", tone: "safe" },
    ],
  },
  {
    id: "route-act",
    label: "Route + Act",
    eyebrow: "Safe path generated",
    title: "A route appears before the city locks up.",
    body: "Shelters, hospitals, blocked streets, and action steps resolve into one practical route.",
    statLabel: "Safe route",
    statValue: "12 min",
    icon: Navigation,
    supportTitle: "Resident action",
    supportItems: [
      { label: "Route", value: "Constrained", tone: "info" },
      { label: "Shelters", value: "2 nearby", tone: "safe" },
      { label: "Action", value: "Leave low streets", tone: "safe" },
    ],
  },
];

export function getIntroState(progress: number): IntroState {
  const normalized = clamp01(progress);
  const scaled = normalized * introBeats.length;
  const beatIndex = Math.min(Math.floor(scaled), introBeats.length - 1);
  const beatProgress = beatIndex === introBeats.length - 1 ? clamp01(scaled - beatIndex) : scaled - beatIndex;

  return {
    beat: introBeats[beatIndex],
    beatIndex,
    beatProgress,
    progress: normalized,
    floodProgress: clamp01((normalized - 0.24) / 0.52),
    rainIntensity: clamp01((normalized - 0.12) / 0.34),
    routeProgress: clamp01((normalized - 0.66) / 0.22),
    neighborhoodProgress: clamp01((normalized - 0.48) / 0.28),
  };
}
