# CityLine Context

## Current Grill Target

Turn the current polished CityLine prototype into a credible demo by tightening the PRD/domain model, deciding what data should be real vs simulated, and keeping a shared glossary for the app's story and command terms.

## Resolved Terms

- CityLine: A cinematic civic resilience prototype that moves from a photo-backed NYC flood story into a practical emergency command view.
- Primary V1 audience: Hackathon judges and portfolio reviewers. Resident usefulness should feel credible, but V1 is a demo/prototype, not operational emergency guidance.
- Resident profiles: Named subjects make the route story personal. South Street Seaport uses Maya Chen, Red Hook uses Nia Alvarez, and Long Island City uses Eli Park.
- Alert -> Address -> Risk -> Route -> Act: The core resident-facing product flow. The demo should make this path clear without long explanatory copy.
- Command simulator: The central interactive 3D stage where flood rise, subject movement, route visibility, shelters, and infrastructure status can be inspected.
- Sector: A zoomed story area or neighborhood slice within the larger city experience. Current implemented neighborhoods are South Street Seaport, Red Hook Waterfront, and Long Island City.
- Route: A curated recommended-route sample with start/end labels, path coordinates, blocked segments, travel time, status, and explanation. Prefer "recommended route" or "preferred route" over safety-certainty wording.
- Hazard layer: A visual and informational overlay for flood, wildfire, earthquake, or heat/air risk. Flood is the deep V1 layer; the others are preview layers.
- Public-data hook: A documented source or future integration target that gives credibility to a curated sample without pretending the sample is live operational guidance.
- First real-data credibility pass: Transit closures and weather alerts. Flood depth, route geometry, shelters, and facilities can remain curated initially if they are clearly labeled.
- First integration style: Static seeded snapshots for transit closures and weather alerts. The website should look like a legitimate civic command interface, but must not falsely claim the snapshots are live or official.
- Snapshot coverage: All three current neighborhoods: South Street Seaport, Red Hook Waterfront, and Long Island City.
- Seeded event set:
  - South Street Seaport: storm surge warning plus South Ferry subway / FDR restriction.
  - Red Hook Waterfront: coastal flood warning plus Hamilton Ave / Imlay underpass restriction.
  - Long Island City: heavy rain / riverfront flood watch plus Vernon Blvd / Gantry transit-access restriction.
- Transit/weather UI placement:
  - Hero: small status annotations only.
  - Command panel: main alert and closure details.
  - Layer cards: compact status summary.
- Provenance UI direction: Do not place a blunt visible "prototype" or "sample scenario" banner in the main website. Prefer polished source, timestamp, status, and confidence labels that feel operational while avoiding fake "live" claims.
- Visible source-label direction: Use generic civic desk labels in the UI, such as "Weather desk," "Transit desk," "Infrastructure desk," "Air desk," "Seismic desk," and "Health desk." Keep agency/source names for future integration docs, not static-snapshot UI labels.
- Safety note placement: Footer/bottom strip only. Keep hero, command, and layer UI clean.
- Hero text behavior: Hero text updates with the selected neighborhood and weather headline, stays route-first, and avoids resident names. Named residents belong in the command subject panel and simulator markers.
- Time-label direction: Use scenario-relative ops times such as `T+08 min`, `T+2h 30m`, and `T+3h`, not real clock-style timestamps, for static seeded weather/transit snapshots.
- Command panel wording: Use `Guidance` for resident steps instead of `Actions` to avoid sounding like official emergency commands.
- Transit closure: A time-sensitive status item for subway, road, bridge, tunnel, or access-point disruption. It needs source, timestamp, affected asset, status, and fallback behavior.
- Weather alert: A time-sensitive hazard notice for storm surge, rainfall, wind, heat, smoke, or air quality. It needs source, timestamp, severity, affected geography, and clear prototype framing.
- Route wording: Use "recommended route" / "preferred route" in public UI and docs unless future verified routing data supports stronger language.

## Current Implementation Facts

- Active repo: `/Users/rushil/cprojects/Hackathons/CityLine`.
- Active app: Next.js App Router page in `app/page.tsx`.
- Data lives in `src/data/cityData.ts`.
- Implemented seeded transit/weather status data in `src/data/cityData.ts` with `weatherAlerts`, `transitClosures`, `getWeatherAlertFor`, and `getTransitClosureFor`.
- Implemented UI placement: hero status annotations, command Status tab, and flood layer compact summaries.
- The first viewport uses `public/assets/manhattan-clean-hero.png` as the photo hero.
- The simulator uses generated procedural city geometry by default, with optional bundled GLB sample and external model hook.
- Visual verification is handled by `npm run verify:visual`, with screenshots written to `artifacts/`.

## Grill Risks

- Credibility risk: The PRD promises public-data depth, but most resident risk and route values are curated. The UI needs clearer provenance without weakening the hero.
- Safety risk: The demo can feel like emergency guidance. It needs concise language that distinguishes curated prototype guidance from official instructions.
- Trust risk: "Looks legit" must mean professional, sourced, timestamped, and civic-grade. It should not mean impersonating an agency or presenting static snapshots as live emergency truth.
- Product-scope risk: Residents, students, planners, and hackathon judges are all listed as target users. V1 now privileges judges/portfolio reviewers, with resident guidance as the story frame.
- Data-model risk: `NeighborhoodRisk`, `Route`, `Facility`, and `alertFeed` do not yet consistently carry source or last-updated fields in code.
- Staleness risk: Transit and weather data can expire quickly. A judge-facing demo needs visible source/time states and a graceful curated fallback.
- Interaction risk: The command simulator is visually strong, but its route and subject visibility need to stay practical when zoomed or expanded.

## Open Questions

- What is the exact disclaimer/provenance language that keeps the app credible without killing the cinematic feel?
- Should CityLine present the first route as resident guidance, planning simulation, or clearly-labeled fictional scenario?
- Should transit/weather seeded snapshots later become build-time fetched data or live client/API data after the hackathon build is stable?
