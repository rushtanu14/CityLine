# CityLine

CityLine is an immersive civic resilience prototype based on the local PRD. It opens with a scroll-driven 3D NYC flood sequence and transitions into a command view for neighborhood risk, safe routes, shelters, infrastructure status, and emergency actions.

## Run

```bash
npm install
npm run dev
```

## Verify

```bash
npm run build
npm run verify:visual
```

`npm run verify:visual` captures desktop and mobile screenshots into `artifacts/` and checks the WebGL canvas has nonblank rendered pixels.

## Current Prototype Scope

- Full-bleed Three.js city scene
- Scroll-driven flood progression
- Cinematic neighborhood reveal
- Curated Address -> Risk -> Route -> Act flow
- Emergency HUD, hazard layers, infrastructure status, shelter routing, and scenario controls
- Desktop-first layout with simplified mobile resident mode
