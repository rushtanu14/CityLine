# CityLine PRD

<thought>
CityLine is a cinematic civic resilience web experience that opens with a scroll-driven 3D NYC flood sequence, then transitions into an emergency command view for understanding neighborhood risk, safe routes, shelters, infrastructure status, and preparedness actions.
</thought>
<key_takeaway>
The first milestone prioritizes visual polish and a memorable 3D flood story, but the product direction must stay grounded in real-world emergency usefulness and public-data credibility.
</key_takeaway>
<action>
Build a desktop-first responsive visual prototype: cinematic NYC flood intro, neighborhood reveal, editorial HUD, curated risk layers, and mocked-but-believable Address -> Risk -> Route -> Act flow.
</action>

## Product Summary

CityLine is a hybrid civic resilience platform and immersive 3D website. It helps residents understand local emergency risk while giving students, educators, planners, and demo audiences a clear way to see how hazards, infrastructure, and public response interact.

The first prototype focuses on a cinematic New York City flood sequence. Users scroll through a personal resident journey as water rises through streets, roads and subway corridors become unsafe, and safe routes, shelters, hospitals, risk scores, and action guidance appear as a bold editorial HUD over a 3D city.

CityLine should eventually support multiple hazards: flooding, wildfire, earthquake, and extreme heat / air quality. Flooding is the first visual hero because NYC flooding, subway disruption, bridges, tunnels, rain, and emergency lighting create the strongest cinematic opening. Los Angeles is the planned next demo city for wildfire, earthquake, heat, and broader California relevance.

## Target Users

- Residents who need to understand local risk and what to do during an emergency.
- Students and educators learning how disasters, infrastructure, and planning decisions interact.
- City planners and local officials comparing city-scale risk, vulnerable zones, resource placement, and intervention tradeoffs.
- Hackathon judges and demo audiences who need the product to be immediately understandable, useful, and visually impressive.

## Core Jobs

- See how a flood emergency affects a specific neighborhood.
- Understand personal risk through a cinematic but practical address-based reveal.
- Find safe routes, nearby shelters, hospitals, blocked roads, and blocked subway corridors.
- Receive clear emergency actions for what to do now.
- Explore city-wide hazard layers and infrastructure dependencies.
- Compare scenario and planning ideas later, including drainage, green space, barriers, shelters, transit, evacuation routes, and resource placement.

## V1 Direction

### Working Name

CityLine.

### Primary Experience

Desktop-first responsive website with a simplified mobile resident mode.

### First Milestone

Visual prototype.

The first build should optimize for:

- scroll-driven 3D NYC flood scene
- cinematic neighborhood reveal
- polished HUD and editorial typography
- realistic-feeling but curated data layers
- mocked or curated Address -> Risk -> Route -> Act flow
- public-data hooks documented for credibility, even if not fully live yet

### Main Flow

Alert -> Address -> Risk -> Route -> Act.

The experience may begin with an emergency alert. The user enters or selects a NYC address/neighborhood. The camera flies into that neighborhood, then overlays local flood risk, blocked routes, shelters, hospitals, and direct next steps.

### First Result Moment

Cinematic neighborhood reveal.

The first result should not be a static dashboard. The camera should fly from city scale to neighborhood scale, then the HUD should layer in:

- local flood depth or danger level
- why the risk matters
- safe route to shelter or high ground
- blocked roads and subway corridors
- nearest shelters and hospitals
- emergency actions

## Functional Requirements

### Scroll-Driven 3D Flood Story

- Use a full-bleed Three.js city scene, not a framed preview card.
- Start with a cinematic NYC-inspired city at night or storm dusk.
- On scroll, progress through a personal resident journey:
  - normal city state
  - rain intensifies
  - water rises through streets
  - roads and subway corridors close
  - buildings/neighborhoods become isolated
  - emergency routes, shelters, and actions appear
- Keep the story flexible so the exact narrative can change later without rewriting the product direction.
- Make flooding cinematic first; if flood visuals are not strong enough, wildfire can become the primary cinematic hazard while flooding remains a core hazard layer.

### Command View

After the intro, reveal an all-in-one command view combining:

- Address Risk Lens
- Scenario Simulator
- Live Emergency Dashboard
- Resilience Planner

V1 should visually include all four modes, but only the Address Risk Lens flow needs to feel highly polished and demo-ready.

### Address Risk Lens

- Let the user enter or select a curated NYC address/neighborhood.
- Fly the camera to the selected area.
- Show flood risk score, danger level, confidence, and explanation.
- Show safe route to shelter/high ground.
- Show blocked roads, subway corridors, tunnels, or bridges where relevant.
- Show nearby shelters and hospitals.
- Show clear resident-facing emergency actions.

### Hazard Layers

CityLine must eventually support:

- flooding
- wildfire
- earthquake
- extreme heat / air quality

For the first prototype:

- flooding is the deepest hazard
- wildfire, earthquake, and heat / air quality are present as lighter selectable layers or preview panels
- all layers may use curated or mocked data in the visual prototype

### Curated Layer Set

The first prototype should visually include:

- flood depth / flood risk
- blocked roads and subway corridors
- shelters
- hospitals
- safe routes
- transit, tunnels, power zones, drainage, bridges
- population density and vulnerable zones
- schools or critical community sites if useful

Only the highest-value layers need deep interaction in v1.

### Scenario Simulator

The scenario simulator can be shallow in v1, but the UI should suggest future controls for:

- rainfall intensity
- tide or storm surge level
- road closures
- shelter availability
- evacuation route constraints
- drainage or green-infrastructure interventions

### Resilience Planner

The planner can be mostly visual in v1, showing future support for comparing:

- drainage upgrades
- green space
- barriers
- shelters
- transit changes
- emergency route improvements
- resource placement

## Non-Functional Requirements

- Prioritize UI polish, cinematic pacing, and spatial depth.
- Use Three.js for the primary 3D city.
- Keep the main scene full-bleed and immersive.
- Ensure desktop view is the primary cinematic target.
- Provide a simplified responsive mobile version focused on resident actions and routes.
- Keep text readable over complex visuals.
- Avoid overlapping UI at common desktop and mobile viewport sizes.
- Avoid purely decorative 3D; the scene should communicate risk, infrastructure, routes, and city state.
- Animation should remain smooth on modern laptops.
- The visual prototype should be demoable without depending on fragile external APIs.

## Design Direction

Style: cinematic 3D city + editorial HUD.

Visual priorities:

- realistic NYC-inspired base city
- stylized floodwater, rain, reflections, route glow, and alert overlays
- bold typography with Gen-Z editorial density
- technical annotation labels, scanlines, thin rules, map fragments, and emergency markers
- dark cinematic atmosphere with emergency lighting, but not a generic one-color dark-blue UI
- full-depth scroll choreography instead of static sections

The design should take inspiration from:

- cinematic travel landing pages with huge typography and full-viewport scene depth
- icy technical fashion/editorial layouts with dense labels and product-grid discipline
- dark philosophy/statue UI references with 3D centerpieces and fine-line annotations
- emergency command dashboards, but presented with stronger art direction than a normal SaaS dashboard

## Data Strategy

Hybrid.

Use a curated cinematic NYC scene for the primary visual experience. Add real public-data hooks for credibility and future expansion.

Potential public-data sources to evaluate later:

- NYC Open Data flood, infrastructure, shelter, and facility datasets
- FEMA flood maps
- NOAA weather and storm data
- USGS earthquake feeds
- EPA / AirNow air quality data
- OpenStreetMap for roads, transit, hospitals, and shelters where appropriate

V1 can use curated sample data as long as the UI clearly feels plausible and the PRD documents which data sources should replace mocks later.

The first real-data credibility pass should prioritize transit closures and weather alerts using static seeded snapshots for all three current neighborhoods: South Street Seaport, Red Hook Waterfront, and Long Island City. Flood depth, route geometry, shelters, and facilities may remain curated during this pass.

Initial seeded events:

- South Street Seaport: storm surge warning plus South Ferry subway / FDR restriction.
- Red Hook Waterfront: coastal flood warning plus Hamilton Ave / Imlay underpass restriction.
- Long Island City: heavy rain / riverfront flood watch plus Vernon Blvd / Gantry transit-access restriction.

UI placement:

- Hero: small status annotations only.
- Command panel: main alert and closure details.
- Layer cards: compact status summary.

The website should look like a legitimate civic command interface, not a toy prototype. Avoid blunt in-page labels like "prototype" or "sample scenario" in the primary experience. Instead, use polished source, timestamp, status, and confidence labels that communicate provenance without breaking the cinematic command feel. Do not falsely claim seeded snapshots are live, official, or agency-issued emergency instructions.

## Data Model

### HazardLayer

- id
- name
- type: flood | wildfire | earthquake | heat_air
- severity
- confidence
- geometry or visual bounds
- summary
- source
- lastUpdated

### NeighborhoodRisk

- id
- name
- addressLabel
- coordinates
- floodDepth
- dangerLevel
- confidence
- riskReasons
- blockedInfrastructureIds
- nearestShelterIds
- nearestHospitalIds
- recommendedRouteId
- actionSteps

### Route

- id
- name
- start
- end
- path
- status
- blockedSegments
- travelTime
- routeReason

### Facility

- id
- name
- type: shelter | hospital | school | cooling_center | emergency_site
- coordinates
- capacity
- status
- notes

### InfrastructureAsset

- id
- name
- type: road | subway | bridge | tunnel | power | drainage
- geometry
- status
- riskLevel
- dependencyNotes
- source
- lastUpdated

### TransitClosure

- id
- affectedAssetId
- mode: subway | road | bridge | tunnel | ferry | pedestrian_access
- status: open | watch | restricted | closed
- severity
- summary
- source
- lastUpdated
- expiresAt
- fallbackLabel

### WeatherAlert

- id
- hazardType: storm_surge | rainfall | wind | heat | smoke | air_quality
- severity
- affectedArea
- summary
- source
- issuedAt
- expiresAt
- confidence

## Safety And Risks

- CityLine must avoid presenting simulated or curated outputs as verified live emergency instructions.
- V1 should include clear but unobtrusive provenance states through source, timestamp, status, and confidence labels rather than a disruptive prototype banner.
- Emergency action language should be practical but not pretend to replace official alerts.
- If live data is later integrated, the UI needs timestamps, source labels, uncertainty, and fallback states.
- Static seeded snapshots must not be labeled as live or official.
- Address entry must be handled carefully if real geocoding is added; avoid storing personal addresses unnecessarily.
- Public-data visualizations should avoid false precision. Use confidence and uncertainty where appropriate.

## Success Metrics

### Demo Success

- A viewer understands the product in under 20 seconds.
- The scroll sequence feels cinematic and spatial, not like a normal landing page.
- The neighborhood reveal is memorable enough to anchor the demo.
- The Address -> Risk -> Route -> Act flow feels useful even if data is curated.

### Product Success

- A resident can identify risk, route, shelter, and next action without reading long explanations.
- The UI distinguishes resident guidance from planner analysis.
- Data layers support the story instead of cluttering it.
- The project can be described on a resume as real-world civic impact plus public-data depth.

### Technical Success

- Smooth Three.js scene on modern laptops.
- Responsive layout works on desktop and mobile.
- Scene is nonblank, correctly framed, and visibly interactive.
- Core controls and scroll choreography work reliably.

## Resume Positioning

Preferred resume angle:

Built CityLine, a civic resilience web platform that helps residents understand emergency risk, safe routes, shelters, and preparedness actions using public hazard, infrastructure, and emergency-resource data in an immersive 3D city interface.

## Milestones

### Milestone 1: Visual Prototype

- Build full-bleed 3D NYC-inspired flood scene.
- Add scroll-driven flood progression.
- Add cinematic neighborhood reveal.
- Add polished editorial HUD.
- Add curated sample risk, route, shelter, hospital, infrastructure, and action data.
- Add command view with visible modes.
- Make Address -> Risk -> Route -> Act flow feel coherent.

### Milestone 2: Credibility Layer

- Replace or enrich curated transit-closure and weather-alert data with static seeded public-data snapshots first.
- Add source labels and last-updated states.
- Add neighborhood picker or address autocomplete.
- Add basic geospatial data normalization.

### Milestone 3: Multi-Hazard Expansion

- Add wildfire, earthquake, and heat / air quality layers.
- Add LA as second demo city.
- Add hazard-specific visual treatments and scenario presets.

### Milestone 4: Scenario And Planner Depth

- Add rainfall/tide scenario controls.
- Add intervention controls.
- Add before/after risk comparison.
- Add planner-oriented neighborhood comparison.

## Open Questions

- Should the first cinematic sequence follow one resident, several neighborhoods, or a city-wide emergency escalation?
- Should NYC visuals be recognizable enough to imply specific boroughs, or stylized enough to avoid strict map accuracy?
- Should seeded transit/weather snapshots later become build-time fetched data or live client/API data after the hackathon build is stable?
- How much official-emergency disclaimer language is needed without weakening the visual experience?
- Should wildfire become the cinematic hero later if floodwater visuals are not strong enough?

## Next

- Choose initial frontend stack and 3D approach.
- Sketch the scroll beats for the flood intro.
- Define curated NYC sample data.
- Build the first full-bleed scene and HUD before adding deeper product logic.
