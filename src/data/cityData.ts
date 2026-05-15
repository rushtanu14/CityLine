import {
  Activity,
  AlertTriangle,
  Building2,
  CloudRain,
  Flame,
  Hospital,
  MapPin,
  RadioTower,
  ShieldAlert,
  ThermometerSun,
  TrainFront,
  Waves,
  Zap,
  type LucideIcon,
} from "lucide-react";

export type HazardId = "flood" | "wildfire" | "earthquake" | "heat";

export type NeighborhoodRisk = {
  id: string;
  name: string;
  borough: string;
  addressLabel: string;
  scene: [number, number];
  floodDepth: string;
  riskScore: number;
  dangerLevel: "Moderate" | "High" | "Severe";
  confidence: string;
  status: string;
  summary: string;
  riskReasons: string[];
  actionSteps: string[];
  recommendedRouteId: string;
  nearestShelterIds: string[];
  nearestHospitalIds: string[];
};

export type Route = {
  id: string;
  name: string;
  startLabel: string;
  endLabel: string;
  path: Array<[number, number]>;
  status: "Open" | "Constrained" | "Blocked";
  travelTime: string;
  blockedSegments: string[];
  routeReason: string;
};

export type Facility = {
  id: string;
  name: string;
  type: "shelter" | "hospital" | "school" | "cooling_center" | "emergency_site";
  scene: [number, number];
  capacity: string;
  status: "Open" | "Near capacity" | "Standby";
  notes: string;
};

export type InfrastructureAsset = {
  id: string;
  name: string;
  type: "road" | "subway" | "bridge" | "tunnel" | "power" | "drainage";
  status: "Open" | "Watch" | "Restricted" | "Closed";
  riskLevel: "Low" | "Medium" | "High";
  dependencyNotes: string;
  source?: string;
  lastUpdated?: string;
};

export type HazardLayer = {
  id: HazardId;
  name: string;
  icon: LucideIcon;
  severity: string;
  confidence: string;
  summary: string;
  source: string;
  accent: string;
};

export type TransitClosure = {
  id: string;
  neighborhoodId: string;
  affectedAssetId: string;
  mode: "subway" | "road" | "bridge" | "tunnel" | "ferry" | "pedestrian_access";
  headline: string;
  assetLabel: string;
  status: "Watch" | "Restricted" | "Closed";
  severity: "Advisory" | "Watch" | "Warning";
  summary: string;
  source: string;
  lastUpdated: string;
  expiresAt: string;
  fallbackLabel: string;
};

export type WeatherAlert = {
  id: string;
  neighborhoodId: string;
  hazardType: "storm_surge" | "rainfall" | "wind" | "heat" | "smoke" | "air_quality";
  headline: string;
  severity: "Watch" | "Warning" | "Severe";
  affectedArea: string;
  summary: string;
  source: string;
  issuedAt: string;
  expiresAt: string;
  confidence: string;
};

export const hazards: HazardLayer[] = [
  {
    id: "flood",
    name: "Flood surge",
    icon: Waves,
    severity: "Severe",
    confidence: "NYC coastal model",
    summary: "Storm tide pushes water through low streets, subway entries, and tunnel approaches.",
    source: "NOAA / NYC Open Data",
    accent: "#4fd7ff",
  },
  {
    id: "wildfire",
    name: "Wildfire smoke",
    icon: Flame,
    severity: "Preview",
    confidence: "LA expansion layer",
    summary: "Smoke plume and evacuation constraints for the future Los Angeles demo city.",
    source: "Cal Fire + AirNow hooks",
    accent: "#ff6546",
  },
  {
    id: "earthquake",
    name: "Earthquake grid",
    icon: Zap,
    severity: "Preview",
    confidence: "Structural preview",
    summary: "Bridge, tunnel, hospital, and power checks after a city-scale shock event.",
    source: "USGS feed hooks",
    accent: "#f7c85b",
  },
  {
    id: "heat",
    name: "Heat / air",
    icon: ThermometerSun,
    severity: "Preview",
    confidence: "Public health preview",
    summary: "Heat index, air quality, cooling centers, and vulnerable block clusters.",
    source: "EPA AirNow hooks",
    accent: "#8ddf72",
  },
];

export const neighborhoods: NeighborhoodRisk[] = [
  {
    id: "seaport",
    name: "South Street Seaport",
    borough: "Manhattan",
    addressLabel: "19 Fulton St, New York, NY",
    scene: [-6, -3],
    floodDepth: "3.8 ft",
    riskScore: 88,
    dangerLevel: "Severe",
    confidence: "82%",
    status: "Evacuate before tunnel closures",
    summary: "Low elevation, East River exposure, and subway access points create a fast isolation risk.",
    riskReasons: [
      "East River edge exposure",
      "Subway stairwell intake risk",
      "FDR Drive constraint within 18 min",
    ],
    actionSteps: [
      "Leave low streets before surge peak",
      "Move north and west toward marked high ground",
      "Avoid tunnel approaches and underpasses",
    ],
    recommendedRouteId: "seaport-route",
    nearestShelterIds: ["shelter-36", "shelter-pace"],
    nearestHospitalIds: ["hospital-bellevue"],
  },
  {
    id: "red-hook",
    name: "Red Hook Waterfront",
    borough: "Brooklyn",
    addressLabel: "199 Van Brunt St, Brooklyn, NY",
    scene: [5, 5],
    floodDepth: "4.5 ft",
    riskScore: 92,
    dangerLevel: "Severe",
    confidence: "78%",
    status: "Route early before basin fills",
    summary: "Waterfront blocks and limited exits can isolate residents if streets fill together.",
    riskReasons: [
      "Low waterfront blocks",
      "Limited northbound exits",
      "Shelter route narrows at Hamilton Ave",
    ],
    actionSteps: [
      "Use inland route before street pooling",
      "Check shelter capacity before departure",
      "Avoid shoreline roads after first closure notice",
    ],
    recommendedRouteId: "red-hook-route",
    nearestShelterIds: ["shelter-ps15", "shelter-bk-tech"],
    nearestHospitalIds: ["hospital-nyu-brooklyn"],
  },
  {
    id: "lic",
    name: "Long Island City",
    borough: "Queens",
    addressLabel: "46-01 5th St, Queens, NY",
    scene: [7, -5],
    floodDepth: "2.4 ft",
    riskScore: 74,
    dangerLevel: "High",
    confidence: "80%",
    status: "Watch subway and bridge ramps",
    summary: "Waterfront exposure is high, but nearby high-ground routes remain viable if taken early.",
    riskReasons: [
      "East River waterfront exposure",
      "Transit station shutdown risk",
      "Bridge ramp congestion",
    ],
    actionSteps: [
      "Move inland toward Queens Plaza",
      "Avoid riverfront parks and ramps",
      "Keep transit backup plan ready",
    ],
    recommendedRouteId: "lic-route",
    nearestShelterIds: ["shelter-queens-plaza"],
    nearestHospitalIds: ["hospital-nyc-health-queens"],
  },
];

export const routes: Route[] = [
  {
    id: "seaport-route",
    name: "Seaport high-ground path",
    startLabel: "Fulton edge zone",
    endLabel: "Pace shelter node",
    path: [
      [-6, -3],
      [-5.5, -1.5],
      [-4, -0.5],
      [-3.2, 1.5],
      [-2, 3.1],
    ],
    status: "Constrained",
    travelTime: "12 min walk",
    blockedSegments: ["FDR service road", "South Ferry subway entry"],
    routeReason: "Stays west of the river edge and avoids underpass pinch points.",
  },
  {
    id: "red-hook-route",
    name: "Red Hook inland route",
    startLabel: "Van Brunt basin",
    endLabel: "PS 15 shelter",
    path: [
      [5, 5],
      [4.3, 3.8],
      [3.8, 2.6],
      [2.5, 1.6],
      [1.6, 0.8],
    ],
    status: "Open",
    travelTime: "16 min walk",
    blockedSegments: ["Conover shoreline", "Imlay underpass"],
    routeReason: "Moves inland before the waterfront basin cuts off east-west movement.",
  },
  {
    id: "lic-route",
    name: "LIC northbound route",
    startLabel: "5th Street waterfront",
    endLabel: "Queens Plaza high node",
    path: [
      [7, -5],
      [6.2, -4],
      [5.6, -2.8],
      [5.0, -1.4],
      [4.6, 0.4],
    ],
    status: "Constrained",
    travelTime: "14 min walk",
    blockedSegments: ["Gantry riverfront", "Vernon Blvd pooling"],
    routeReason: "Cuts inland before waterfront roads close and keeps bridge approaches optional.",
  },
];

export const facilities: Facility[] = [
  {
    id: "shelter-36",
    name: "Pier 36 Emergency Hub",
    type: "shelter",
    scene: [-3.8, 2.7],
    capacity: "61%",
    status: "Open",
    notes: "Short-term shelter and charging support.",
  },
  {
    id: "shelter-pace",
    name: "Pace High-Ground Shelter",
    type: "shelter",
    scene: [-2, 3.1],
    capacity: "48%",
    status: "Open",
    notes: "Recommended for Seaport route.",
  },
  {
    id: "shelter-ps15",
    name: "PS 15 Inland Shelter",
    type: "shelter",
    scene: [1.6, 0.8],
    capacity: "54%",
    status: "Open",
    notes: "Primary Red Hook inland destination.",
  },
  {
    id: "shelter-bk-tech",
    name: "Brooklyn Tech Relief Site",
    type: "shelter",
    scene: [1, -1.6],
    capacity: "73%",
    status: "Near capacity",
    notes: "Backup shelter with medical triage overflow.",
  },
  {
    id: "shelter-queens-plaza",
    name: "Queens Plaza Safe Node",
    type: "shelter",
    scene: [4.6, 0.4],
    capacity: "42%",
    status: "Open",
    notes: "High-ground point for LIC route.",
  },
  {
    id: "hospital-bellevue",
    name: "Bellevue Hospital",
    type: "hospital",
    scene: [-1.4, 5.7],
    capacity: "Trauma intake active",
    status: "Open",
    notes: "Emergency department remains available.",
  },
  {
    id: "hospital-nyu-brooklyn",
    name: "NYU Langone Brooklyn",
    type: "hospital",
    scene: [0.6, 3.8],
    capacity: "Ambulance bay watch",
    status: "Standby",
    notes: "Route advisories may change with closures.",
  },
  {
    id: "hospital-nyc-health-queens",
    name: "NYC Health Queens",
    type: "hospital",
    scene: [8.2, 1.8],
    capacity: "ER accepting",
    status: "Open",
    notes: "Queens backup care point.",
  },
];

export const infrastructure: InfrastructureAsset[] = [
  {
    id: "fdr",
    name: "FDR Drive southbound",
    type: "road",
    status: "Restricted",
    riskLevel: "High",
    dependencyNotes: "East-side evacuation traffic slows if service roads flood.",
    source: "NYC DOT status",
    lastUpdated: "18:22 ET",
  },
  {
    id: "south-ferry",
    name: "South Ferry station",
    type: "subway",
    status: "Closed",
    riskLevel: "High",
    dependencyNotes: "Stairwell flooding creates transit cutoff risk.",
    source: "MTA service status",
    lastUpdated: "18:19 ET",
  },
  {
    id: "battery-tunnel",
    name: "Battery tunnel approach",
    type: "tunnel",
    status: "Watch",
    riskLevel: "Medium",
    dependencyNotes: "Tunnel intake risk rises with surge timing.",
    source: "NYC DOT status",
    lastUpdated: "18:21 ET",
  },
  {
    id: "brooklyn-bridge",
    name: "Brooklyn Bridge approach",
    type: "bridge",
    status: "Open",
    riskLevel: "Medium",
    dependencyNotes: "Pedestrian access remains viable but may crowd quickly.",
    source: "NYC DOT status",
    lastUpdated: "18:18 ET",
  },
  {
    id: "east-grid",
    name: "East River substation band",
    type: "power",
    status: "Watch",
    riskLevel: "Medium",
    dependencyNotes: "Power reliability affects shelter and signal timing.",
    source: "NYCEM infrastructure desk",
    lastUpdated: "18:24 ET",
  },
  {
    id: "canal-drainage",
    name: "Canal drainage gate",
    type: "drainage",
    status: "Restricted",
    riskLevel: "High",
    dependencyNotes: "Drainage saturation worsens street pooling.",
    source: "NYC DEP drainage status",
    lastUpdated: "18:17 ET",
  },
];

export const weatherAlerts: WeatherAlert[] = [
  {
    id: "seaport-surge-warning",
    neighborhoodId: "seaport",
    hazardType: "storm_surge",
    headline: "Storm surge warning",
    severity: "Severe",
    affectedArea: "Lower Manhattan / East River edge",
    summary: "Surge window moves toward the Seaport edge; river-facing streets and subway entries face rapid intake risk.",
    source: "NWS coastal alert",
    issuedAt: "18:08 ET",
    expiresAt: "21:00 ET",
    confidence: "High",
  },
  {
    id: "red-hook-coastal-warning",
    neighborhoodId: "red-hook",
    hazardType: "storm_surge",
    headline: "Coastal flood warning",
    severity: "Severe",
    affectedArea: "Red Hook waterfront basin",
    summary: "Waterfront blocks near Van Brunt and Conover may pool together before inland exits fully clear.",
    source: "NWS coastal alert",
    issuedAt: "18:11 ET",
    expiresAt: "21:15 ET",
    confidence: "High",
  },
  {
    id: "lic-rain-watch",
    neighborhoodId: "lic",
    hazardType: "rainfall",
    headline: "Riverfront flood watch",
    severity: "Watch",
    affectedArea: "Long Island City waterfront",
    summary: "Heavy rain bands keep riverfront access points and bridge ramps under watch while inland routes remain open.",
    source: "NWS rainfall desk",
    issuedAt: "18:14 ET",
    expiresAt: "20:45 ET",
    confidence: "Medium-high",
  },
];

export const transitClosures: TransitClosure[] = [
  {
    id: "seaport-south-ferry-fdr",
    neighborhoodId: "seaport",
    affectedAssetId: "south-ferry",
    mode: "subway",
    headline: "South Ferry access closing",
    assetLabel: "South Ferry subway / FDR service road",
    status: "Restricted",
    severity: "Warning",
    summary: "South Ferry entries and FDR service-road access are restricted as the East River surge reaches low intake points.",
    source: "MTA / NYC DOT status",
    lastUpdated: "18:19 ET",
    expiresAt: "20:30 ET",
    fallbackLabel: "Use westbound walking route to high ground.",
  },
  {
    id: "red-hook-hamilton-imlay",
    neighborhoodId: "red-hook",
    affectedAssetId: "canal-drainage",
    mode: "road",
    headline: "Hamilton / Imlay restriction",
    assetLabel: "Hamilton Ave / Imlay underpass",
    status: "Restricted",
    severity: "Warning",
    summary: "Low underpass approaches are restricted; inland movement should happen before basin streets fill together.",
    source: "NYC DOT status",
    lastUpdated: "18:23 ET",
    expiresAt: "20:45 ET",
    fallbackLabel: "Use inland PS 15 route before shoreline roads close.",
  },
  {
    id: "lic-vernon-gantry",
    neighborhoodId: "lic",
    affectedAssetId: "brooklyn-bridge",
    mode: "pedestrian_access",
    headline: "Vernon / Gantry access watch",
    assetLabel: "Vernon Blvd / Gantry riverfront access",
    status: "Watch",
    severity: "Watch",
    summary: "Riverfront access points remain under watch while Queens Plaza high-ground route stays preferred.",
    source: "MTA / NYC DOT status",
    lastUpdated: "18:16 ET",
    expiresAt: "20:15 ET",
    fallbackLabel: "Move inland toward Queens Plaza before bridge-ramp congestion.",
  },
];

export const commandMetrics = [
  {
    label: "Risk score",
    value: "88",
    detail: "Severe",
    icon: ShieldAlert,
  },
  {
    label: "Safe route",
    value: "12 min",
    detail: "Constrained",
    icon: MapPin,
  },
  {
    label: "Shelters",
    value: "5 open",
    detail: "1 near cap",
    icon: Building2,
  },
  {
    label: "Transit",
    value: "2 closed",
    detail: "subway/tunnel",
    icon: TrainFront,
  },
];

export const alertFeed = [
  {
    code: "FLOOD-04",
    label: "Storm surge peak moved forward",
    time: "18 min",
    icon: CloudRain,
  },
  {
    code: "TRANSIT",
    label: "South Ferry and riverfront entries closing",
    time: "11 min",
    icon: TrainFront,
  },
  {
    code: "SHELTER",
    label: "Pace node accepting residents",
    time: "Open",
    icon: RadioTower,
  },
  {
    code: "MED",
    label: "Bellevue ER remains active",
    time: "Open",
    icon: Hospital,
  },
];

export const storyBeats = [
  {
    id: "alert",
    label: "Alert",
    title: "A coastal warning hits lower Manhattan.",
    stat: "Surge window: 34 min",
    icon: AlertTriangle,
  },
  {
    id: "rise",
    label: "Rise",
    title: "Water pushes through low streets and transit entries.",
    stat: "Street depth: 3.8 ft",
    icon: Waves,
  },
  {
    id: "route",
    label: "Route",
    title: "CityLine pivots from map to resident path.",
    stat: "Safe route: 12 min",
    icon: Activity,
  },
  {
    id: "act",
    label: "Act",
    title: "Shelters, hospitals, and action steps lock in.",
    stat: "2 nearby shelters",
    icon: ShieldAlert,
  },
];

export const findNeighborhood = (id: string) =>
  neighborhoods.find((neighborhood) => neighborhood.id === id) ?? neighborhoods[0];

export const findRoute = (id: string) => routes.find((route) => route.id === id) ?? routes[0];

export const getFacilitiesFor = (ids: string[]) =>
  facilities.filter((facility) => ids.includes(facility.id));

export const getWeatherAlertFor = (neighborhoodId: string) =>
  weatherAlerts.find((alert) => alert.neighborhoodId === neighborhoodId) ?? weatherAlerts[0];

export const getTransitClosureFor = (neighborhoodId: string) =>
  transitClosures.find((closure) => closure.neighborhoodId === neighborhoodId) ?? transitClosures[0];
