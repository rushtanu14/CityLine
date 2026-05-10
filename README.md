# CityLine

CityLine is an immersive civic resilience prototype based on the local PRD. It is now a Next.js landing page with a fixed React Three Fiber canvas, high-resolution city-backed visuals, Lenis smooth scrolling, and GSAP ScrollTrigger choreography for a cinematic 3D flood-route experience.

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
- React Three Fiber / Drei city-photo stage with stylized flood, route, detailed buildings, and a public GLB resident model
- GSAP ScrollTrigger text and camera-feel sequencing
- Lenis smooth scroll for slower cinematic movement
- Fixed 3D canvas behind the scroll story plus an embedded command-stage simulator
- Command simulator with subject controls, flood playback, draggable 3D city stage, and hazard layer cards
- Local city imagery and public 3D assets in `public/assets/`
- Desktop and mobile visual verification
