# CityLine

CityLine is an immersive civic resilience prototype based on the local PRD. It is now a Next.js landing page with a fixed React Three Fiber canvas, Lenis smooth scrolling, and GSAP ScrollTrigger choreography for a heavy, dreamy 3D flood-route experience.

## Run

```bash
npm install
./run.sh
```

## Verify

```bash
npm run build
npm run verify:visual
```

`npm run verify:visual` captures desktop and mobile screenshots into `artifacts/` and checks the R3F canvas has nonblank rendered pixels across the hero, story, command, and layer scroll stops.

## Current Prototype Scope

- Next.js App Router
- React Three Fiber / Drei low-poly civic route model
- GSAP ScrollTrigger text and camera-feel sequencing
- Lenis smooth scroll for slower cinematic movement
- Fixed 3D canvas behind pointer-transparent overlays
- Command simulator with subject controls, flood playback, and hazard layer cards
- Desktop and mobile visual verification
