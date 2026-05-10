"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import {
  Clone,
  ContactShadows,
  Float,
  MeshTransmissionMaterial,
  OrbitControls,
  PerspectiveCamera,
  useGLTF,
  useTexture,
} from "@react-three/drei";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import {
  ArrowUpRight,
  Building2,
  Crosshair,
  Navigation,
  Pause,
  Play,
  RadioTower,
} from "lucide-react";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { hazards, neighborhoods } from "../src/data/cityData";

gsap.registerPlugin(ScrollTrigger);

type MotionState = {
  scroll: number;
  mouseX: number;
  mouseY: number;
  flood: number;
  route: number;
  sim: number;
  isMobile: boolean;
};

const storyPanels = [
  {
    eyebrow: "01 / Alert",
    title: "Maya gets the warning while the river is still quiet.",
    body: "The scene opens like a product film: the emergency signal becomes a glowing object over lower Manhattan.",
    stat: "34 min window",
  },
  {
    eyebrow: "02 / Waterline",
    title: "The city model starts reacting before the streets disappear.",
    body: "Rainfall, tide surge, drainage, and road closures push the low blocks into a rising cyan flood layer.",
    stat: "3.8 ft projected",
  },
  {
    eyebrow: "03 / Route",
    title: "A safe path draws itself around the failing grid.",
    body: "The subject stays visible while CityLine rotates from cinematic story into practical route intelligence.",
    stat: "12 min walk",
  },
];

export default function Page() {
  const pageRef = useRef<HTMLDivElement | null>(null);
  const [motion, setMotion] = useState<MotionState>({
    scroll: 0,
    mouseX: 0,
    mouseY: 0,
    flood: 0.22,
    route: 0.08,
    sim: 0.08,
    isMobile: false,
  });
  const [isSceneReady, setIsSceneReady] = useState(false);
  const [loaderProgress, setLoaderProgress] = useState(0);
  const [isLoaderDismissed, setIsLoaderDismissed] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedNeighborhood, setSelectedNeighborhood] = useState(neighborhoods[0].id);

  useEffect(() => {
    const updateMobile = () => {
      setMotion((current) => ({ ...current, isMobile: window.innerWidth < 760 }));
    };
    updateMobile();
    window.addEventListener("resize", updateMobile);
    return () => window.removeEventListener("resize", updateMobile);
  }, []);

  useEffect(() => {
    const fallbackReady = window.setTimeout(() => setIsSceneReady(true), 900);
    return () => window.clearTimeout(fallbackReady);
  }, []);

  useEffect(() => {
    const forceComplete = window.setTimeout(() => setLoaderProgress(100), 900);
    const forceDismiss = window.setTimeout(() => setIsLoaderDismissed(true), 1450);

    return () => {
      window.clearTimeout(forceComplete);
      window.clearTimeout(forceDismiss);
    };
  }, []);

  useEffect(() => {
    const root = pageRef.current;
    if (!root) return;

    const lenis = new Lenis({
      duration: 1.55,
      smoothWheel: true,
      wheelMultiplier: 0.82,
      touchMultiplier: 0.9,
    });

    let frame = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      ScrollTrigger.update();
      frame = requestAnimationFrame(raf);
    };
    frame = requestAnimationFrame(raf);

    const trigger = ScrollTrigger.create({
      trigger: root,
      start: "top top",
      end: "bottom bottom",
      scrub: 1.4,
      onUpdate: (self) => {
        const progress = self.progress;
        setMotion((current) => ({
          ...current,
          scroll: progress,
          flood: gsap.utils.clamp(0.08, 1, gsap.utils.mapRange(0.16, 0.68, 0.08, 1, progress)),
          route: gsap.utils.clamp(0.05, 1, gsap.utils.mapRange(0.42, 0.82, 0.05, 1, progress)),
          sim: gsap.utils.clamp(0.08, 1, gsap.utils.mapRange(0.68, 1, 0.08, 1, progress)),
        }));
      },
    });

    gsap.utils.toArray<HTMLElement>(".story-panel").forEach((panel) => {
      gsap.fromTo(
        panel,
        { autoAlpha: 0, y: 72, filter: "blur(3px)" },
        {
          autoAlpha: 1,
          y: 0,
          filter: "blur(0px)",
          duration: 1.2,
          ease: "power3.out",
          scrollTrigger: {
            trigger: panel,
            start: "top 94%",
            end: "top 54%",
            scrub: 1.2,
          },
        },
      );
      gsap.to(panel, {
        autoAlpha: 0,
        y: -88,
        filter: "blur(3px)",
        ease: "power2.inOut",
        scrollTrigger: {
          trigger: panel,
          start: "bottom 62%",
          end: "bottom 24%",
          scrub: 1.2,
        },
      });
    });

    return () => {
      cancelAnimationFrame(frame);
      trigger.kill();
      ScrollTrigger.getAll().forEach((item) => item.kill());
      lenis.destroy();
    };
  }, []);

  useEffect(() => {
    if (isLoaderDismissed) return;

    const interval = window.setInterval(() => {
      setLoaderProgress((current) => {
        if (current >= 100) return 100;
        const step = isSceneReady ? 9 : 4.4;
        return Math.min(100, current + step);
      });
    }, 42);

    return () => window.clearInterval(interval);
  }, [isLoaderDismissed, isSceneReady]);

  useEffect(() => {
    if (loaderProgress < 100) return;

    const timeout = window.setTimeout(() => setIsLoaderDismissed(true), 420);
    return () => window.clearTimeout(timeout);
  }, [loaderProgress]);

  useEffect(() => {
    if (!isPlaying) return;

    const interval = window.setInterval(() => {
      setMotion((current) => {
        const next = current.sim >= 1 ? 0.08 : Math.min(1, current.sim + 0.012);
        return { ...current, sim: next, flood: Math.max(current.flood, next * 0.95) };
      });
    }, 42);

    return () => window.clearInterval(interval);
  }, [isPlaying]);

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const x = event.clientX / window.innerWidth - 0.5;
    const y = event.clientY / window.innerHeight - 0.5;
    setMotion((current) => ({ ...current, mouseX: x, mouseY: y }));
  };

  const selected = neighborhoods.find((item) => item.id === selectedNeighborhood) ?? neighborhoods[0];
  const photoTransform = `translate3d(${motion.mouseX * -26 - motion.scroll * 118}px, ${
    motion.mouseY * -14 - motion.scroll * 28
  }px, 0) scale(${1.1 + motion.scroll * 0.16})`;
  const sceneStyle = {
    "--mx": motion.mouseX.toFixed(4),
    "--my": motion.mouseY.toFixed(4),
    "--scroll": motion.scroll.toFixed(4),
    "--parallax-x": `${motion.mouseX * 18}px`,
    "--parallax-y": `${motion.mouseY * 12}px`,
    "--reverse-parallax-x": `${motion.mouseX * -24}px`,
    "--reverse-parallax-y": `${motion.mouseY * -14}px`,
  } as React.CSSProperties;

  return (
    <main ref={pageRef} className="cityline-next" style={sceneStyle} onPointerMove={handlePointerMove}>
      {!isLoaderDismissed && (
        <div className={`city-loader ${loaderProgress >= 100 ? "is-exiting" : ""}`} role="status" aria-live="polite">
          <div className="loader-card">
            <span className="loader-eyebrow">CityLine initializing</span>
            <strong>{Math.round(loaderProgress).toString().padStart(2, "0")}%</strong>
            <div className="loader-track" aria-hidden="true">
              <span style={{ transform: `scaleX(${loaderProgress / 100})` }} />
            </div>
            <p>Loading flood route, Seaport city stage, and emergency layers.</p>
          </div>
        </div>
      )}
      <div className="city-photo-layer" style={{ transform: photoTransform }} aria-hidden="true" />
      <div className="gradient-backdrop" aria-hidden="true" />
      <div className="motion-field" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <div className="canvas-layer">
        <Canvas
          data-cityline-canvas="true"
          dpr={motion.isMobile ? [1, 1.35] : [1, 1.75]}
          shadows
          gl={{ antialias: true, preserveDrawingBuffer: true, powerPreference: "high-performance" }}
          onCreated={({ gl }) => {
            gl.domElement.dataset.citylineCanvas = "true";
            setIsSceneReady(true);
          }}
        >
          <Suspense fallback={null}>
            <CinematicScene motion={motion} selectedNeighborhoodId={selectedNeighborhood} />
          </Suspense>
        </Canvas>
      </div>

      <header className="site-nav">
        <a className="brand" href="#top" aria-label="CityLine home">
          <span>
            <RadioTower size={22} />
          </span>
          <strong>CityLine</strong>
        </a>
        <nav>
          <a href="#story">Story</a>
          <a href="#command">Command</a>
          <a href="#layers">Layers</a>
        </nav>
      </header>

      <section id="top" className="hero-section overlay-section">
        <div className="hero-copy glass-copy">
          <div className="poster-meta">
            <span>NYC FLOOD OPS</span>
            <span>R3F / GSAP / LENIS</span>
          </div>
          <p className="kicker">Flash flood warning / South Street Seaport</p>
          <h1>CityLine Flood Run</h1>
          <p className="hero-body">
            A cinematic civic-resilience landing page where a real NYC skyline becomes a scroll-controlled flood story,
            then resolves into an interactive escape simulator.
          </p>
          <div className="hero-actions">
            <a href="#command">Open simulator</a>
          </div>
        </div>
      </section>

      <section id="story" className="story-section overlay-section" aria-label="Scroll story">
        {storyPanels.map((panel) => (
          <article className="story-panel glass-copy interactive-panel" key={panel.eyebrow}>
            <span>{panel.eyebrow}</span>
            <h2>{panel.title}</h2>
            <p>{panel.body}</p>
            <strong>{panel.stat}</strong>
          </article>
        ))}
      </section>

      <section id="command" className={`command-section ${motion.scroll > 0.88 ? "is-past" : ""}`}>
        <div className="command-heading glass-copy">
          <span>Command simulator</span>
          <h2>Change the variables. Watch the escape path breathe.</h2>
        </div>

        <div className="command-grid">
          <aside className="command-card control-stack interactive-panel">
            <div className="panel-title">
              <Crosshair size={18} />
              Subject
            </div>
            <div className="subject-card">
              <span>Maya Chen</span>
              <strong>{selected.name}</strong>
              <small>{selected.addressLabel}</small>
            </div>
            <div className="neighborhood-list">
              {neighborhoods.map((item) => (
                <button
                  className={item.id === selectedNeighborhood ? "is-active" : ""}
                  key={item.id}
                  type="button"
                  aria-pressed={item.id === selectedNeighborhood}
                  onClick={() => setSelectedNeighborhood(item.id)}
                >
                  <span>{item.borough}</span>
                  <strong>{item.name}</strong>
                </button>
              ))}
            </div>
          </aside>

          <section className="command-card simulator-copy interactive-panel">
            <div className="simulation-stage" aria-label="3D flood simulation">
              <Canvas
                dpr={motion.isMobile ? [1, 1.2] : [1, 1.55]}
                shadows
                gl={{ antialias: true, preserveDrawingBuffer: true, powerPreference: "high-performance" }}
              >
                <Suspense fallback={null}>
                  <SimulatorScene motion={motion} selectedNeighborhoodId={selectedNeighborhood} />
                </Suspense>
              </Canvas>
              <div className="simulation-stage-hud" aria-hidden="true">
                <span>Live route model</span>
                <strong>{selected.name}</strong>
              </div>
            </div>
            <div className="simulator-status">
              <Metric label="Flood rise" value={`${Math.round(motion.flood * 100)}%`} />
              <Metric label="Route confidence" value={`${Math.round(motion.route * 88)}%`} />
              <Metric label="Escape playback" value={`${Math.round(motion.sim * 100)}%`} />
            </div>
            <p>
              Drag the city stage to inspect the route. Press play to raise the flood and move Maya toward high ground.
            </p>
            <button className="play-button" type="button" onClick={() => setIsPlaying((value) => !value)}>
              {isPlaying ? <Pause size={18} /> : <Play size={18} />}
              {isPlaying ? "Pause flood rise" : "Play flood rise"}
            </button>
          </section>

          <aside className="command-card action-stack interactive-panel">
            <div className="panel-title">
              <Navigation size={18} />
              Helpful actions
            </div>
            {selected.actionSteps.map((step, index) => (
              <div className="action-row" key={step}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{step}</strong>
              </div>
            ))}
          </aside>
        </div>
      </section>

      <section id="layers" className="layers-section">
        <div className="layer-grid">
          {hazards.map((hazard) => {
            const Icon = hazard.icon;
            return (
              <article
                className="command-card layer-card interactive-panel"
                key={hazard.id}
                style={{ "--accent": hazard.accent } as React.CSSProperties}
              >
                <Icon size={24} />
                <span>{hazard.severity}</span>
                <h3>{hazard.name}</h3>
                <p>{hazard.summary}</p>
              </article>
            );
          })}
        </div>
        <div className="resume-strip command-card">
          <Building2 size={22} />
          <p>
            Built with Next.js, React Three Fiber, GSAP ScrollTrigger, and Lenis to demonstrate cinematic interaction,
            practical civic UX, and high-resolution city-backed 3D storytelling.
          </p>
          <ArrowUpRight size={22} />
        </div>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

const cityBlocks = [
  { x: -2.55, z: -1.22, w: 0.46, d: 0.52, h: 1.48, color: "#9cc8d6" },
  { x: -1.96, z: -1.18, w: 0.5, d: 0.48, h: 1.9, color: "#e7c49e" },
  { x: -1.28, z: -1.24, w: 0.42, d: 0.56, h: 1.22, color: "#b9d6cf" },
  { x: -0.52, z: -1.18, w: 0.58, d: 0.5, h: 2.28, color: "#9fb8d5" },
  { x: 0.3, z: -1.24, w: 0.5, d: 0.54, h: 1.56, color: "#f1c0aa" },
  { x: 1.08, z: -1.18, w: 0.52, d: 0.5, h: 2.04, color: "#afd0e9" },
  { x: 2.02, z: -1.24, w: 0.62, d: 0.56, h: 1.38, color: "#d3bfdf" },
  { x: -2.32, z: 0.02, w: 0.54, d: 0.48, h: 1.2, color: "#f0d09d" },
  { x: -1.58, z: 0.06, w: 0.46, d: 0.46, h: 1.72, color: "#9ed1c8" },
  { x: -0.72, z: 0.04, w: 0.56, d: 0.54, h: 2.52, color: "#8bb4d9" },
  { x: 0.18, z: 0.02, w: 0.44, d: 0.48, h: 1.28, color: "#e8b6c9" },
  { x: 1.02, z: 0.06, w: 0.58, d: 0.52, h: 1.86, color: "#ccb3e8" },
  { x: 1.9, z: 0.04, w: 0.5, d: 0.5, h: 2.34, color: "#a9d7e9" },
  { x: -2.22, z: 1.18, w: 0.52, d: 0.5, h: 1.58, color: "#d9b89b" },
  { x: -1.36, z: 1.22, w: 0.52, d: 0.54, h: 1.18, color: "#aedfc4" },
  { x: -0.42, z: 1.2, w: 0.46, d: 0.5, h: 1.94, color: "#e7d27c" },
  { x: 0.46, z: 1.16, w: 0.62, d: 0.56, h: 1.42, color: "#d2e5f2" },
  { x: 1.4, z: 1.2, w: 0.54, d: 0.52, h: 2.12, color: "#f1b3ae" },
  { x: 2.22, z: 1.18, w: 0.46, d: 0.48, h: 1.34, color: "#b8d0f0" },
];

function getSelectedScene(selectedNeighborhoodId: string) {
  const selected = neighborhoods.find((item) => item.id === selectedNeighborhoodId) ?? neighborhoods[0];
  return {
    startX: THREE.MathUtils.clamp(selected.scene[0] / 3.8, -1.95, 1.35),
    startZ: THREE.MathUtils.clamp(selected.scene[1] / 5.7, -0.86, 0.86),
    routeYaw: THREE.MathUtils.clamp(selected.scene[0] / 48, -0.16, 0.16),
  };
}

function DetailedCityModel({ compact = false }: { compact?: boolean }) {
  const visibleBlocks = compact ? cityBlocks : cityBlocks.slice(0, 16);

  return (
    <group>
      {visibleBlocks.map((block, index) => {
        const windowRows = Math.max(3, Math.round(block.h * 4));
        return (
          <group key={`${block.x}-${block.z}`} position={[block.x, -0.48 + block.h / 2, block.z]}>
            <mesh castShadow receiveShadow>
              <boxGeometry args={[block.w, block.h, block.d]} />
              <meshPhysicalMaterial
                color={block.color}
                roughness={0.42}
                metalness={0.08}
                clearcoat={0.32}
                clearcoatRoughness={0.5}
              />
            </mesh>
            <mesh position={[0, block.h / 2 + 0.035, 0]} castShadow>
              <boxGeometry args={[block.w * 0.84, 0.07, block.d * 0.84]} />
              <meshStandardMaterial color="#fff4d2" roughness={0.5} />
            </mesh>
            {Array.from({ length: windowRows }).map((_, row) => (
              <mesh
                key={row}
                position={[0, -block.h / 2 + 0.24 + row * 0.28, block.d / 2 + 0.008]}
              >
                <boxGeometry args={[block.w * 0.62, 0.028, 0.01]} />
                <meshStandardMaterial
                  color={index % 2 === 0 ? "#fff4bd" : "#bff3ff"}
                  emissive={index % 2 === 0 ? "#ffd84d" : "#59d7ff"}
                  emissiveIntensity={0.16}
                />
              </mesh>
            ))}
          </group>
        );
      })}
      {[-1.78, -0.92, -0.08, 0.82, 1.68].map((x, index) => (
        <mesh key={`car-${x}`} position={[x, -0.415, 0.62 + (index % 2) * 0.28]} castShadow>
          <boxGeometry args={[0.2, 0.08, 0.36]} />
          <meshStandardMaterial
            color={index % 2 === 0 ? "#ff4f87" : "#ffd84d"}
            emissive={index % 2 === 0 ? "#ff4f87" : "#ffd84d"}
            emissiveIntensity={0.18}
          />
        </mesh>
      ))}
    </group>
  );
}

function ResidentModel({ scale = 0.18 }: { scale?: number }) {
  const { scene } = useGLTF("/assets/cesium-man.glb");

  return (
    <group scale={scale} rotation={[0, Math.PI / 2, 0]}>
      <Clone object={scene} castShadow receiveShadow />
    </group>
  );
}

function CinematicScene({
  motion,
  selectedNeighborhoodId,
}: {
  motion: MotionState;
  selectedNeighborhoodId: string;
}) {
  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 2.15, 7.6]} fov={motion.isMobile ? 50 : 41} />
      <color attach="background" args={["#f8cf9c"]} />
      <fog attach="fog" args={["#ffe2b7", 9, 22]} />
      <ambientLight intensity={1.15} color="#fff0d0" />
      <directionalLight position={[-5, 7, 5]} intensity={3.8} color="#fff1c6" castShadow shadow-mapSize={[1024, 1024]} />
      <spotLight position={[4, 6.8, 6]} angle={0.42} penumbra={0.82} intensity={48} color="#ff4f87" castShadow />
      <pointLight position={[-3.8, 2, 1.6]} intensity={30} color="#6e4bff" />
      <pointLight position={[4, 2.2, -1.8]} intensity={22} color="#ffd84d" />
      <Float speed={0.82} rotationIntensity={0.1} floatIntensity={0.18}>
        <CitylineObject motion={motion} selectedNeighborhoodId={selectedNeighborhoodId} />
      </Float>
      <ContactShadows position={[0, -1.34, 0]} opacity={0.34} scale={16} blur={3.4} far={7} color="#5e335f" />
    </>
  );
}

function SimulatorScene({
  motion,
  selectedNeighborhoodId,
}: {
  motion: MotionState;
  selectedNeighborhoodId: string;
}) {
  const modelRef = useRef<THREE.Group>(null);
  const routeRef = useRef<THREE.Group>(null);
  const waterRef = useRef<THREE.Mesh>(null);
  const residentRef = useRef<THREE.Group>(null);
  const selectedScene = useMemo(() => getSelectedScene(selectedNeighborhoodId), [selectedNeighborhoodId]);
  const stageStartX = THREE.MathUtils.clamp(selectedScene.startX * 0.45, -0.92, 0.82);
  const routeLaneZ = 0.48 + THREE.MathUtils.clamp(selectedScene.startZ * 0.18, -0.22, 0.22);

  useFrame((state) => {
    const elapsed = state.clock.elapsedTime;

    if (modelRef.current) {
      modelRef.current.rotation.y = THREE.MathUtils.lerp(
        modelRef.current.rotation.y,
        -0.36 + motion.mouseX * 0.18,
        0.04,
      );
      modelRef.current.rotation.x = THREE.MathUtils.lerp(modelRef.current.rotation.x, -0.05 + motion.mouseY * 0.08, 0.04);
    }

    if (waterRef.current) {
      waterRef.current.position.y = THREE.MathUtils.lerp(-0.54, -0.14, motion.flood);
      waterRef.current.scale.setScalar(THREE.MathUtils.lerp(0.62, 1.16, motion.flood));
      const material = waterRef.current.material as THREE.MeshPhysicalMaterial;
      material.opacity = THREE.MathUtils.lerp(0.18, 0.62, motion.flood);
    }

    if (routeRef.current) {
      routeRef.current.position.x = THREE.MathUtils.lerp(routeRef.current.position.x, stageStartX, 0.08);
      routeRef.current.position.z = THREE.MathUtils.lerp(routeRef.current.position.z, routeLaneZ, 0.08);
      routeRef.current.rotation.y = THREE.MathUtils.lerp(routeRef.current.rotation.y, selectedScene.routeYaw, 0.08);
      routeRef.current.scale.x = THREE.MathUtils.lerp(routeRef.current.scale.x, 0.16 + motion.route * 0.86, 0.1);
    }

    if (residentRef.current) {
      residentRef.current.position.x = THREE.MathUtils.lerp(stageStartX, stageStartX + 2.72, motion.sim);
      residentRef.current.position.z = THREE.MathUtils.lerp(routeLaneZ, routeLaneZ - 0.95, motion.sim);
      residentRef.current.position.y = 0.55 + Math.sin(elapsed * 6.2) * 0.018;
      residentRef.current.rotation.y = Math.PI / 2 + Math.sin(elapsed * 1.8) * 0.08;
    }
  });

  return (
    <>
      <PerspectiveCamera makeDefault position={[3.7, 3.35, 5.35]} fov={38} />
      <color attach="background" args={["#f6d2ac"]} />
      <fog attach="fog" args={["#ffe6c6", 7, 15]} />
      <ambientLight intensity={1.28} color="#fff1d0" />
      <directionalLight position={[-3.8, 7, 4.2]} intensity={4.2} color="#fff0bf" castShadow />
      <pointLight position={[-2.8, 1.4, 1.8]} intensity={18} color="#ff4f87" />
      <pointLight position={[3.2, 1.6, -1.2]} intensity={16} color="#59d7ff" />
      <group ref={modelRef} position={[0, 0.15, 0]} scale={1.08}>
        <mesh receiveShadow position={[0, -0.56, 0]} rotation={[0, 0.02, 0]}>
          <boxGeometry args={[6.1, 0.2, 4.1]} />
          <meshPhysicalMaterial color="#fff1c6" roughness={0.36} metalness={0.04} clearcoat={0.28} />
        </mesh>
        {[-1.72, -0.86, 0, 0.86, 1.72].map((x, index) => (
          <mesh key={`sim-road-x-${x}`} position={[x, -0.43, 0]} rotation={[0, 0.02, 0]}>
            <boxGeometry args={[0.09, 0.035, 3.78]} />
            <meshStandardMaterial
              color={index % 2 === 0 ? "#ff4f87" : "#6e4bff"}
              emissive={index % 2 === 0 ? "#ff4f87" : "#6e4bff"}
              emissiveIntensity={0.4}
            />
          </mesh>
        ))}
        {[-1.24, -0.38, 0.48, 1.34].map((z, index) => (
          <mesh key={`sim-road-z-${z}`} position={[0, -0.415, z]} rotation={[0, 0.02, 0]}>
            <boxGeometry args={[5.75, 0.032, 0.09]} />
            <meshStandardMaterial
              color={index % 2 === 0 ? "#59d7ff" : "#ffd84d"}
              emissive={index % 2 === 0 ? "#59d7ff" : "#ffd84d"}
              emissiveIntensity={0.34}
            />
          </mesh>
        ))}
        <DetailedCityModel compact />
        <mesh ref={waterRef} rotation={[-Math.PI / 2, 0, Math.PI / 4]} position={[0, -0.42, 0]}>
          <circleGeometry args={[3.45, 96]} />
          <MeshTransmissionMaterial
            color="#4edcff"
            roughness={0.06}
            metalness={0.02}
            transparent
            opacity={0.34}
            thickness={0.36}
            transmission={0.45}
          />
        </mesh>
        <group ref={routeRef} position={[stageStartX, -0.32, routeLaneZ]} scale={[0.28, 1, 1]}>
          <mesh castShadow>
            <boxGeometry args={[3.72, 0.075, 0.13]} />
            <meshStandardMaterial color="#fff8c7" emissive="#ffd84d" emissiveIntensity={1.55} />
          </mesh>
          <mesh position={[3.55, 0.04, -0.46]} rotation={[0, -0.34, 0]}>
            <boxGeometry args={[1.02, 0.075, 0.13]} />
            <meshStandardMaterial color="#ff4f87" emissive="#ff4f87" emissiveIntensity={1.3} />
          </mesh>
        </group>
        <group ref={residentRef} position={[stageStartX, 0.55, routeLaneZ]}>
          <ResidentModel scale={0.28} />
          <pointLight intensity={5} distance={1.6} color="#ffd84d" />
          <mesh position={[0, 0.02, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.18, 0.012, 8, 36]} />
            <meshStandardMaterial color="#ffd84d" emissive="#ffd84d" emissiveIntensity={0.82} />
          </mesh>
        </group>
        <mesh position={[1.8, 0.32, -1.38]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.28, 0.014, 8, 48]} />
          <meshStandardMaterial color="#44d87f" emissive="#44d87f" emissiveIntensity={0.9} />
        </mesh>
      </group>
      <ContactShadows position={[0, -0.6, 0]} opacity={0.35} scale={8} blur={2.6} far={4.5} color="#6b4264" />
      <OrbitControls enablePan={false} enableZoom={false} enableDamping dampingFactor={0.08} rotateSpeed={0.45} />
    </>
  );
}

function CitylineObject({
  motion,
  selectedNeighborhoodId,
}: {
  motion: MotionState;
  selectedNeighborhoodId: string;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const photoRef = useRef<THREE.Group>(null);
  const routeRef = useRef<THREE.Group>(null);
  const waterRef = useRef<THREE.Mesh>(null);
  const subjectRef = useRef<THREE.Group>(null);
  const cityTexture = useTexture("/assets/south-street-seaport.jpg");
  const streetSegments = useMemo(() => Array.from({ length: motion.isMobile ? 5 : 9 }), [motion.isMobile]);
  const selectedScene = useMemo(() => getSelectedScene(selectedNeighborhoodId), [selectedNeighborhoodId]);

  useEffect(() => {
    cityTexture.colorSpace = THREE.SRGBColorSpace;
    cityTexture.anisotropy = 12;
    cityTexture.needsUpdate = true;
  }, [cityTexture]);

  useFrame((state) => {
    const elapsed = state.clock.elapsedTime;
    const cameraTarget = new THREE.Vector3(
      THREE.MathUtils.lerp(-0.72, 1.24, motion.scroll) + motion.mouseX * 0.22,
      THREE.MathUtils.lerp(2.04, 1.18, motion.scroll) - motion.mouseY * 0.12,
      THREE.MathUtils.lerp(motion.isMobile ? 8.1 : 7.2, motion.isMobile ? 5.85 : 4.8, motion.scroll),
    );
    state.camera.position.lerp(cameraTarget, 0.055);
    state.camera.lookAt(
      THREE.MathUtils.lerp(-0.1, 0.54, motion.scroll),
      THREE.MathUtils.lerp(0.52, -0.14, motion.scroll),
      THREE.MathUtils.lerp(-1.4, 0.18, motion.scroll),
    );

    if (groupRef.current) {
      const zoom = THREE.MathUtils.lerp(1, motion.isMobile ? 1.2 : 1.32, motion.scroll);
      groupRef.current.scale.lerp(new THREE.Vector3(zoom, zoom, zoom), 0.08);
      groupRef.current.rotation.y = THREE.MathUtils.lerp(
        groupRef.current.rotation.y,
        -0.14 + motion.scroll * 0.62 + motion.mouseX * 0.14,
        0.08,
      );
      groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, -0.1 + motion.mouseY * 0.08, 0.08);
      groupRef.current.position.y = Math.sin(elapsed * 0.42) * 0.04 - motion.scroll * 0.12;
    }

    if (photoRef.current) {
      photoRef.current.position.x = THREE.MathUtils.lerp(photoRef.current.position.x, -motion.scroll * 0.85 + motion.mouseX * 0.2, 0.06);
      photoRef.current.position.y = THREE.MathUtils.lerp(photoRef.current.position.y, 0.18 - motion.scroll * 0.18, 0.06);
    }

    if (routeRef.current) {
      routeRef.current.scale.x = THREE.MathUtils.lerp(routeRef.current.scale.x, 0.18 + motion.route * 0.92, 0.1);
      routeRef.current.position.x = THREE.MathUtils.lerp(routeRef.current.position.x, selectedScene.startX, 0.08);
      routeRef.current.position.y = -0.64 + Math.sin(elapsed * 2.4) * 0.018;
      routeRef.current.position.z = THREE.MathUtils.lerp(routeRef.current.position.z, selectedScene.startZ, 0.08);
      routeRef.current.rotation.y = THREE.MathUtils.lerp(routeRef.current.rotation.y, selectedScene.routeYaw, 0.08);
    }

    if (waterRef.current) {
      waterRef.current.position.y = THREE.MathUtils.lerp(-1.18, -0.44, motion.flood);
      waterRef.current.scale.setScalar(THREE.MathUtils.lerp(0.6, 1.28, motion.flood));
      const material = waterRef.current.material as THREE.MeshPhysicalMaterial;
      material.opacity = THREE.MathUtils.lerp(0.18, 0.58, motion.flood);
    }

    if (subjectRef.current) {
      subjectRef.current.position.x = THREE.MathUtils.lerp(selectedScene.startX, selectedScene.startX + 3.15, motion.sim);
      subjectRef.current.position.z = THREE.MathUtils.lerp(selectedScene.startZ, selectedScene.startZ - 1.05, motion.sim);
      subjectRef.current.position.y = -0.24 + Math.sin(elapsed * 5) * 0.025;
    }
  });

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      <group ref={photoRef}>
        <mesh position={[0, 0.96, -3.05]} scale={[7.2, 4.8, 1]}>
          <planeGeometry args={[1, 1, 80, 8]} />
          <meshBasicMaterial map={cityTexture} toneMapped={false} transparent opacity={0.98} />
        </mesh>
        <mesh position={[0, -1.12, -1.74]} rotation={[Math.PI, 0, 0]} scale={[7.1, 1.38, 1]}>
          <planeGeometry args={[1, 1, 80, 8]} />
          <meshBasicMaterial map={cityTexture} toneMapped={false} transparent opacity={0.16} />
        </mesh>
      </group>

      <group position={[0, -0.56, 0.18]}>
        <mesh castShadow receiveShadow rotation={[0, 0.06, 0]}>
          <boxGeometry args={[6.1, 0.22, 3.75]} />
          <meshPhysicalMaterial
            color="#fff1ce"
            metalness={0.08}
            roughness={0.32}
            emissive="#ff7a9d"
            emissiveIntensity={0.025}
            transparent
            opacity={0.5}
          />
        </mesh>
        {streetSegments.map((_, index) => (
          <mesh key={index} position={[-2.72 + index * 0.68, -0.08, 0.08]} rotation={[0, 0.06, 0]}>
            <boxGeometry args={[0.035, 0.032, 3.52]} />
            <meshStandardMaterial
              color={index % 3 === 0 ? "#ff4f87" : "#6e4bff"}
              emissive={index % 3 === 0 ? "#ff4f87" : "#6e4bff"}
              emissiveIntensity={0.48}
            />
          </mesh>
        ))}
        {streetSegments.slice(0, 6).map((_, index) => (
          <mesh key={`cross-${index}`} position={[0.02, -0.055, -1.32 + index * 0.55]} rotation={[0, 0.06, 0]}>
            <boxGeometry args={[5.66, 0.026, 0.036]} />
            <meshStandardMaterial
              color={index % 2 === 0 ? "#59d7ff" : "#ffd84d"}
              emissive={index % 2 === 0 ? "#59d7ff" : "#ffd84d"}
              emissiveIntensity={0.36}
            />
          </mesh>
        ))}
        <DetailedCityModel />
        <mesh ref={waterRef} rotation={[-Math.PI / 2, 0, Math.PI / 4]} position={[0, -1.05, 0]}>
          <circleGeometry args={[3.95, 96]} />
          <MeshTransmissionMaterial
            color="#59d7ff"
            roughness={0.08}
            metalness={0.04}
            transparent
            opacity={0.28}
            thickness={0.52}
            transmission={0.5}
          />
        </mesh>
      </group>

      <group ref={routeRef} position={[selectedScene.startX, -0.62, selectedScene.startZ]} scale={[0.2, 1, 1]}>
        <mesh castShadow>
          <boxGeometry args={[3.9, 0.075, 0.12]} />
          <meshStandardMaterial color="#fff7c7" emissive="#ffd84d" emissiveIntensity={1.4} />
        </mesh>
        <mesh position={[3.9, 0.02, -0.52]} rotation={[0, -0.36, 0]}>
          <boxGeometry args={[1.14, 0.075, 0.12]} />
          <meshStandardMaterial color="#ff4f87" emissive="#ff4f87" emissiveIntensity={1.35} />
        </mesh>
      </group>

      <group ref={subjectRef} position={[selectedScene.startX, -0.2, selectedScene.startZ]}>
        <ResidentModel scale={0.075} />
        <pointLight intensity={5.2} distance={2.4} color="#ffd84d" />
      </group>

      <mesh position={[0, 1.82, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[2.55, 0.012, 8, 96]} />
        <meshStandardMaterial color="#6e4bff" emissive="#6e4bff" emissiveIntensity={0.75} />
      </mesh>
    </group>
  );
}

useGLTF.preload("/assets/cesium-man.glb");
