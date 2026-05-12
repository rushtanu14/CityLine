"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import {
  Clone,
  ContactShadows,
  Float,
  OrbitControls,
  PerspectiveCamera,
  Text,
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
  Maximize2,
  Minimize2,
  Navigation,
  Pause,
  Play,
  RadioTower,
  X,
} from "lucide-react";
import { motion as FMotion } from "framer-motion";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { facilities, hazards, infrastructure, neighborhoods, routes } from "../src/data/cityData";

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

type CityModelSource = "procedural" | "sample" | "external";

type RouteState = {
  start: [number, number];
  end: [number, number];
  points: Array<[number, number]>;
  startLabel: string;
  endLabel: string;
  destinationName: string;
};

type CommandMode = "actions" | "shelters" | "infra";

const CITY_MODEL_URL = process.env.NEXT_PUBLIC_CITYLINE_CITY_MODEL_URL?.trim() ?? "";
const LOCAL_CITY_MODEL_URL = "/assets/littlest-tokyo.glb";
const CITY_MODEL_SOURCE_PRESET: CityModelSource = CITY_MODEL_URL ? "external" : "procedural";
const CITY_SCALE = 0.42;
const CITY_BOUNDS = {
  xMin: -3.4,
  xMax: 3.4,
  zMin: -1.6,
  zMax: 1.8,
};
const CITY_X_OFFSET = -0.18;
const CITY_Z_OFFSET = 0.34;
const WATER_COLOR = "#20b7ff";


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

const scenarioLevers = [
  { label: "Rainfall", value: "2.8 in/hr", tone: "blue" },
  { label: "Tide surge", value: "+3.8 ft", tone: "pink" },
  { label: "Drainage", value: "62% load", tone: "violet" },
];

const commandModes: Array<{ id: CommandMode; label: string }> = [
  { id: "actions", label: "Actions" },
  { id: "shelters", label: "Shelters" },
  { id: "infra", label: "Infra" },
];

const sceneReveal: Record<string, any> = {
  hidden: { opacity: 0, y: 28, filter: "blur(8px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.9, ease: "easeOut" },
  },
  exit: {
    opacity: 0,
    y: -18,
    filter: "blur(6px)",
    transition: { duration: 0.35, ease: "easeIn" },
  },
};

const cinematicFade: Record<string, any> = {
  hidden: { opacity: 0, scale: 0.985 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.72, ease: "easeOut" } },
  exit: { opacity: 0, scale: 0.985, transition: { duration: 0.22, ease: "easeIn" } },
};

const panelLift: Record<string, any> = {
  hidden: { opacity: 0, y: 26 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: "easeOut" } },
};

const PLAYBACK_DURATION_MS = 14000;
const PLAYBACK_INTERVAL_MS = 80;

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
  const [isStageExpanded, setIsStageExpanded] = useState(false);
  const [isStageFullscreen, setIsStageFullscreen] = useState(false);
  const [isCommandPast, setIsCommandPast] = useState(false);
  const [cityModelSource, setCityModelSource] = useState<CityModelSource>(CITY_MODEL_SOURCE_PRESET);
  const [selectedNeighborhood, setSelectedNeighborhood] = useState(neighborhoods[0].id);
  const [commandMode, setCommandMode] = useState<CommandMode>("actions");
  const playbackRef = useRef<{ startedAt: number; startFlood: number; startSim: number } | null>(null);
  const simulationStageRef = useRef<HTMLDivElement | null>(null);

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

    if (!playbackRef.current) {
      playbackRef.current = { startedAt: Date.now(), startFlood: motion.flood, startSim: motion.sim };
    }

    const interval = window.setInterval(() => {
      const playback = playbackRef.current;
      if (!playback) return;

      const progress = gsap.utils.clamp(0, 1, (Date.now() - playback.startedAt) / PLAYBACK_DURATION_MS);
      const nextSim = THREE.MathUtils.lerp(playback.startSim, 1, progress);
      const nextFlood = Math.max(
        THREE.MathUtils.lerp(playback.startFlood, 1, progress),
        nextSim * 0.95,
      );

      setMotion((current) => {
        return { ...current, flood: nextFlood, sim: nextSim };
      });

      if (progress >= 1) {
        playbackRef.current = null;
        setIsPlaying(false);
      }
    }, PLAYBACK_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [isPlaying]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const fullscreenDocument = document as Document & { webkitFullscreenElement?: Element | null };
      const fullscreenElement = document.fullscreenElement ?? fullscreenDocument.webkitFullscreenElement ?? null;
      const isCurrentStageFullscreen = fullscreenElement === simulationStageRef.current;
      setIsStageFullscreen(isCurrentStageFullscreen);
      if (isCurrentStageFullscreen) setIsStageExpanded(true);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    if (!isStageExpanded || isStageFullscreen) return;

    const handleOutsideStagePointer = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && simulationStageRef.current?.contains(target)) return;
      setIsStageExpanded(false);
    };

    document.addEventListener("pointerdown", handleOutsideStagePointer, true);
    return () => document.removeEventListener("pointerdown", handleOutsideStagePointer, true);
  }, [isStageExpanded, isStageFullscreen]);

  useEffect(() => {
    if (!isStageExpanded || isStageFullscreen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsStageExpanded(false);
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isStageExpanded, isStageFullscreen]);

  useEffect(() => {
    const updateCommandPast = () => {
      const command = document.getElementById("command");
      if (!command) return;
      setIsCommandPast(window.scrollY > command.offsetTop + command.offsetHeight * 0.76);
    };

    updateCommandPast();
    window.addEventListener("scroll", updateCommandPast, { passive: true });
    window.addEventListener("resize", updateCommandPast);
    return () => {
      window.removeEventListener("scroll", updateCommandPast);
      window.removeEventListener("resize", updateCommandPast);
    };
  }, []);

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const x = event.clientX / window.innerWidth - 0.5;
    const y = event.clientY / window.innerHeight - 0.5;
    setMotion((current) => ({ ...current, mouseX: x, mouseY: y }));
  };

  const handleSectionLink =
    (targetId: string) =>
    (event: React.MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault();
      const target = document.getElementById(targetId);
      window.history.pushState(null, "", `#${targetId}`);
      if (target) {
        const top = target.getBoundingClientRect().top + window.scrollY;
        window.scrollTo({ top, behavior: "smooth" });
      }
      window.setTimeout(() => ScrollTrigger.update(), 80);
    };

  const handlePagePointerDown = (event: React.PointerEvent<HTMLElement>) => {
    const target = event.target;
    if (target instanceof Node && simulationStageRef.current?.contains(target)) return;
    if (!isStageFullscreen) setIsStageExpanded(false);
  };

  const cityModelCredit =
    cityModelSource === "external"
      ? "External GLB from model marketplace endpoint"
      : cityModelSource === "sample"
        ? "Bundled GLB city sample + CityLine flood layer"
        : "Procedural open-data-style footprint city";
  const selected = neighborhoods.find((item) => item.id === selectedNeighborhood) ?? neighborhoods[0];
  const selectedFacilities = useMemo(
    () =>
      facilities.filter((facility) =>
        [...selected.nearestShelterIds, ...selected.nearestHospitalIds].includes(facility.id),
      ),
    [selected],
  );
  const selectedRoute = useMemo(() => {
    const route = routes.find((item) => item.id === selected.recommendedRouteId) ?? routes[0];
    const routePointsScene = route.path.map((entry) => [
      gsap.utils.clamp(
        CITY_BOUNDS.xMin,
        CITY_BOUNDS.xMax,
        entry[0] * CITY_SCALE + CITY_X_OFFSET,
      ),
      gsap.utils.clamp(
        CITY_BOUNDS.zMin,
        CITY_BOUNDS.zMax,
        entry[1] * CITY_SCALE + CITY_Z_OFFSET,
      ),
    ]) as Array<[number, number]>;

    const destinationFacility = facilities.find((facility) => selected.nearestShelterIds.includes(facility.id));
    const fallbackFacility = facilities.find((facility) => facility.type === "shelter");

    return {
      start: routePointsScene[0],
      end: routePointsScene[routePointsScene.length - 1],
      points: routePointsScene,
      startLabel: route.startLabel,
      endLabel: route.endLabel,
      destinationName: destinationFacility?.name ?? fallbackFacility?.name ?? "Designated shelter",
    } satisfies RouteState;
  }, [selected]);
  const shouldRenderSimulator = motion.scroll > 0.54 || isStageExpanded || isStageFullscreen;

  const handlePlaybackToggle = () => {
    if (isPlaying) {
      playbackRef.current = null;
      setIsPlaying(false);
      return;
    }

    const startFlood = motion.sim >= 0.995 ? 0.22 : motion.flood;
    const startSim = motion.sim >= 0.995 ? 0.08 : motion.sim;
    playbackRef.current = { startedAt: Date.now(), startFlood, startSim };
    setMotion((current) => ({ ...current, flood: startFlood, sim: startSim }));
    setIsPlaying(true);
  };

  const handleStagePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.stopPropagation();
    setIsStageExpanded(true);
  };

  const handleStageFullscreen = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    const stage = simulationStageRef.current;
    if (!stage) return;

    const fullscreenDocument = document as Document & {
      webkitExitFullscreen?: () => Promise<void> | void;
      webkitFullscreenElement?: Element | null;
    };
    const fullscreenStage = stage as HTMLDivElement & { webkitRequestFullscreen?: () => Promise<void> | void };
    const currentFullscreen = document.fullscreenElement ?? fullscreenDocument.webkitFullscreenElement ?? null;

    setIsStageExpanded(true);
    if (currentFullscreen === stage) {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else {
        await fullscreenDocument.webkitExitFullscreen?.();
      }
      return;
    }

    if (stage.requestFullscreen) {
      await stage.requestFullscreen();
    } else {
      await fullscreenStage.webkitRequestFullscreen?.();
    }
  };
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
    <main
      ref={pageRef}
      className="cityline-next"
      data-stage-expanded={isStageExpanded}
      style={sceneStyle}
      onPointerMove={handlePointerMove}
      onPointerDown={handlePagePointerDown}
    >
      {!isLoaderDismissed && (
        <FMotion.div
          className={`city-loader ${loaderProgress >= 100 ? "is-exiting" : ""}`}
          role="status"
          aria-live="polite"
          initial="hidden"
          animate="visible"
          variants={cinematicFade}
        >
          <FMotion.div className="loader-card" variants={panelLift} initial="hidden" animate="visible">
            <span className="loader-eyebrow">CityLine initializing</span>
            <strong>{Math.round(loaderProgress).toString().padStart(2, "0")}%</strong>
            <div className="loader-track" aria-hidden="true">
              <span style={{ transform: `scaleX(${loaderProgress / 100})` }} />
            </div>
            <p>Loading flood route, Seaport city stage, and emergency layers.</p>
          </FMotion.div>
        </FMotion.div>
      )}
      <div className="city-photo-layer" style={{ transform: photoTransform }} aria-hidden="true" />
      <div className="gradient-backdrop" aria-hidden="true" />
      <div className="motion-field" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      {isStageExpanded && !isStageFullscreen ? (
        <button
          className="stage-dismiss-layer"
          type="button"
          aria-label="Close expanded simulation"
          onPointerDown={(event) => {
            event.stopPropagation();
            setIsStageExpanded(false);
          }}
          onClick={(event) => {
            event.stopPropagation();
            setIsStageExpanded(false);
          }}
        />
      ) : null}
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
            <CinematicScene
              motion={motion}
              routeState={selectedRoute}
              cityModelSource={cityModelSource}
            />
          </Suspense>
        </Canvas>
      </div>

      <FMotion.header
        className="site-nav"
        initial={{ y: -24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.75 }}
      >
        <a className="brand" href="#top" aria-label="CityLine home" onClick={handleSectionLink("top")}>
          <span>
            <RadioTower size={22} />
          </span>
          <strong>CityLine</strong>
        </a>
        <nav>
          <a href="#story" onClick={handleSectionLink("story")}>Story</a>
          <a href="#command" onClick={handleSectionLink("command")}>Command</a>
          <a href="#layers" onClick={handleSectionLink("layers")}>Layers</a>
        </nav>
      </FMotion.header>

      <FMotion.section
        id="top"
        className="hero-section overlay-section"
        initial="hidden"
        whileInView="visible"
        viewport={{ amount: 0.3, once: true }}
        variants={sceneReveal}
      >
        <FMotion.div className="hero-copy glass-copy">
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
            <FMotion.a href="#command" onClick={handleSectionLink("command")} whileHover={{ scale: 1.03, y: -1 }} whileTap={{ scale: 0.985 }}>
              Open simulator
            </FMotion.a>
            <span className="city-source-pill">{cityModelCredit}</span>
          </div>
        </FMotion.div>
      </FMotion.section>

      <section id="story" className="story-section overlay-section" aria-label="Scroll story">
        {storyPanels.map((panel, index) => (
          <FMotion.article
            className="story-panel glass-copy interactive-panel"
            key={panel.eyebrow}
            initial="hidden"
            whileInView="visible"
            viewport={{ amount: 0.35, once: false }}
            variants={sceneReveal}
            transition={{ delay: Math.min(index * 0.12, 0.24) }}
          >
            <span>{panel.eyebrow}</span>
            <h2>{panel.title}</h2>
            <p>{panel.body}</p>
            <strong>{panel.stat}</strong>
          </FMotion.article>
        ))}
      </section>

      <section id="command" className={`command-section ${isCommandPast ? "is-past" : ""}`}>
          <FMotion.div
            className="command-heading glass-copy"
            initial="visible"
            animate="visible"
            variants={panelLift}
          >
          <span>Command simulator</span>
          <h2>Change the variables. Watch the escape path breathe.</h2>
        </FMotion.div>

        <FMotion.div
          className="command-grid"
          initial="visible"
          animate="visible"
          variants={panelLift}
        >
          <FMotion.aside
            className="command-card control-stack interactive-panel"
            whileHover={{ y: -2 }}
            variants={panelLift}
          >
            <div className="panel-title">
              <Crosshair size={18} />
              Subject
            </div>
            <div className="subject-card">
              <span>Maya Chen</span>
              <strong>{selected.name}</strong>
              <small>{selected.addressLabel}</small>
            </div>
            <div className="model-source-switch">
              <button
                type="button"
                className={cityModelSource === "procedural" ? "is-active" : ""}
                onClick={() => setCityModelSource("procedural")}
              >
                Generated
              </button>
              <button
                type="button"
                className={cityModelSource === "sample" ? "is-active" : ""}
                onClick={() => setCityModelSource("sample")}
              >
                GLB sample
              </button>
              <button
                type="button"
                className={cityModelSource === "external" ? "is-active" : ""}
                disabled={!CITY_MODEL_URL}
                aria-label={
                  CITY_MODEL_URL
                    ? "Use external high-detail model"
                    : "Set NEXT_PUBLIC_CITYLINE_CITY_MODEL_URL to use an external model"
                }
                onClick={() => CITY_MODEL_URL && setCityModelSource("external")}
              >
                External model
              </button>
            </div>
            <p className="source-note">
              3D sources: generated footprints, bundled GLB sample, marketplace-ready GLB, future CityGML conversion.
            </p>
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
          </FMotion.aside>

          <FMotion.section
            className={`command-card simulator-copy interactive-panel ${isStageExpanded ? "is-stage-expanded" : ""}`}
            whileHover={{ y: -2 }}
            variants={panelLift}
          >
                <div
                  ref={simulationStageRef}
                  className={`simulation-stage ${isStageExpanded ? "is-expanded" : ""} ${isStageFullscreen ? "is-fullscreen" : ""}`}
                  aria-label="3D flood simulation"
                  onPointerDown={handleStagePointerDown}
                  onClick={(event) => {
                    event.stopPropagation();
                    setIsStageExpanded(true);
                  }}
                >
              {shouldRenderSimulator ? (
                <Canvas
                  dpr={motion.isMobile ? [1, 1.2] : [1, 1.55]}
                  shadows
                  gl={{ antialias: true, preserveDrawingBuffer: true, powerPreference: "high-performance" }}
                >
                  <Suspense fallback={null}>
                    <SimulatorScene
                      motion={motion}
                      selectedNeighborhoodId={selectedNeighborhood}
                      routeState={selectedRoute}
                      cityModelSource={cityModelSource}
                      isExpanded={isStageExpanded || isStageFullscreen}
                    />
                  </Suspense>
                </Canvas>
              ) : (
                <div className="simulation-stage-placeholder" aria-hidden="true" />
              )}
              {!isStageExpanded && !isStageFullscreen ? (
                <button
                  className="simulation-click-layer"
                  type="button"
                  aria-label="Expand 3D simulation"
                  onPointerDown={(event) => {
                    event.stopPropagation();
                    setIsStageExpanded(true);
                  }}
                  onClick={(event) => {
                    event.stopPropagation();
                    setIsStageExpanded(true);
                  }}
                />
              ) : null}
              <div className="simulation-stage-hud">
                <span>Live route model</span>
                <strong>{selected.name}</strong>
                <button
                  className="stage-fullscreen-button"
                  type="button"
                  aria-label={isStageFullscreen ? "Exit full screen simulation" : "Open full screen simulation"}
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={handleStageFullscreen}
                >
                  {isStageFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                </button>
                {isStageExpanded && !isStageFullscreen ? (
                  <button
                    className="stage-close-button"
                    type="button"
                    aria-label="Close expanded simulation"
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={(event) => {
                      event.stopPropagation();
                      setIsStageExpanded(false);
                    }}
                  >
                    <X size={16} />
                  </button>
                ) : null}
              </div>
                <div className="simulation-stage-controls" onPointerDown={(event) => event.stopPropagation()}>
                  <Metric label="Flood rise" value={`${Math.round(motion.flood * 100)}%`} />
                  <Metric label="Escape" value={`${Math.round(motion.sim * 100)}%`} />
                  <button
                    className="stage-play-button"
                    type="button"
                    aria-label={isPlaying ? "Pause simulation panel" : "Start simulation panel"}
                    onClick={handlePlaybackToggle}
                  >
                    {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                  </button>
                </div>
              </div>
              <div className="simulator-status">
                <Metric label="Flood rise" value={`${Math.round(motion.flood * 100)}%`} />
                <Metric label="Route confidence" value={`${Math.round(motion.route * 88)}%`} />
                <Metric label="Escape playback" value={`${Math.round(motion.sim * 100)}%`} />
            </div>
            <div className="scenario-levers" aria-label="Scenario variables">
              {scenarioLevers.map((lever) => (
                <div className={`scenario-lever is-${lever.tone}`} key={lever.label}>
                  <span>{lever.label}</span>
                  <strong>{lever.value}</strong>
                </div>
              ))}
            </div>
            <p>
              Drag the city stage to inspect the route. Press play to raise the flood and move Maya toward high ground.
              Safe route for {selectedRoute.destinationName}: {selectedRoute.startLabel} → {selectedRoute.endLabel}.
            </p>
            <FMotion.button
              className="play-button"
              type="button"
              onClick={handlePlaybackToggle}
              whileHover={{ scale: 1.03, y: -1 }}
              whileTap={{ scale: 0.985 }}
            >
              {isPlaying ? <Pause size={18} /> : <Play size={18} />}
              {isPlaying ? "Pause flood rise" : "Play flood rise"}
            </FMotion.button>
          </FMotion.section>

          <FMotion.aside
            className="command-card action-stack interactive-panel"
            whileHover={{ y: -2 }}
            variants={panelLift}
          >
            <div className="panel-title">
              <Navigation size={18} />
              Helpful actions
            </div>
            <div className="action-mode-tabs" role="tablist" aria-label="Command panel mode">
              {commandModes.map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  className={commandMode === mode.id ? "is-active" : ""}
                  aria-pressed={commandMode === mode.id}
                  onClick={() => setCommandMode(mode.id)}
                >
                  {mode.label}
                </button>
              ))}
            </div>
            {commandMode === "actions" ? (
              selected.actionSteps.map((step, index) => (
                <div className="action-row" key={step}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <strong>{step}</strong>
                </div>
              ))
            ) : null}
            {commandMode === "shelters" ? (
              selectedFacilities.map((facility) => (
                <div className="facility-row" key={facility.id}>
                  <span>{facility.status}</span>
                  <strong>{facility.name}</strong>
                  <small>{facility.capacity}</small>
                </div>
              ))
            ) : null}
            {commandMode === "infra" ? (
              infrastructure.slice(0, 3).map((asset) => (
                <div className="facility-row is-infra" key={asset.id}>
                  <span>{asset.status}</span>
                  <strong>{asset.name}</strong>
                  <small>{asset.dependencyNotes}</small>
                </div>
              ))
            ) : null}
          </FMotion.aside>
        </FMotion.div>
      </section>

      <section id="layers" className="layers-section">
        <FMotion.div className="layer-grid" variants={panelLift} initial="hidden" whileInView="visible">
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
        </FMotion.div>
        <FMotion.div className="resume-strip command-card" whileHover={{ y: -2 }} variants={panelLift} initial="hidden" whileInView="visible">
          <Building2 size={22} />
          <p>
            Built with Next.js, React Three Fiber, GSAP ScrollTrigger, and Lenis to demonstrate cinematic interaction,
            practical civic UX, and high-resolution city-backed 3D storytelling.
          </p>
          <ArrowUpRight size={22} />
        </FMotion.div>
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

type CityBuildingSpec = {
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
  color: string;
  roofColor?: string;
  trimColor?: string;
  windowColor?: string;
  rotation?: number;
  facadeDepth?: number;
  landmark?: boolean;
};

const cityBlocks: CityBuildingSpec[] = [];
const cityPalette = [
  "#8bb6c9",
  "#9fb9c9",
  "#b7c8d6",
  "#8fa9be",
  "#c4d4df",
  "#759bb5",
  "#a5c8dc",
  "#d6e4ec",
  "#6f8fa7",
];

function generateCityBlocks() {
  for (let x = -4.05; x <= 4.05; x += 0.5) {
    for (let z = -2.06; z <= 2.14; z += 0.42) {
      const isStreetX = Math.round(Math.abs((x + 0.02) * 10)) % 7 === 0;
      const isStreetZ = Math.round(Math.abs((z - 0.02) * 10)) % 5 === 0;
      if (isStreetX || isStreetZ) continue;

      const densitySeed = (Math.sin(x * 16) + Math.cos(z * 10) + 1.8) * 0.18;
      if (densitySeed > 0.92) continue;

      const jitterX = Math.sin(x * 5.4 + z * 3.8) * 0.06;
      const jitterZ = Math.cos(x * 4.2 + z * 6.7) * 0.06;
      const downtownBias = THREE.MathUtils.clamp(1 - Math.hypot(x * 0.22, z * 0.42), 0, 1);
      const height = THREE.MathUtils.lerp(
        0.78,
        5.25,
        THREE.MathUtils.clamp((Math.sin(x * 3.2 + z * 5.5) + 1) / 2 * 0.62 + downtownBias * 0.54, 0, 1),
      );
      const paletteIndex = Math.floor(Math.abs(Math.sin(x * 2.1 + z * 3.1)) * (cityPalette.length - 1));
      const landmark = downtownBias > 0.72 && Math.abs(Math.sin(x * 2.4 + z * 2.8)) > 0.84;
      cityBlocks.push({
        x: x + jitterX,
        z: z + jitterZ,
        w: 0.22 + (Math.sin(x * 8) + 1) * 0.105,
        d: 0.19 + (Math.cos(z * 7) + 1) * 0.1,
        h: THREE.MathUtils.clamp(height + (landmark ? 1.1 : 0), 0.72, 6.2),
        color: cityPalette[paletteIndex],
        roofColor: landmark ? "#172339" : "#23384f",
        trimColor: densitySeed > 0.4 ? "#8ae1ff" : "#dff7ff",
        windowColor: densitySeed > 0.48 ? "#ffe2f1" : "#d9f7ff",
        rotation: Math.sin(x * 1.8 + z) * 0.045,
        facadeDepth: 0.008 + urbanRandom(x + z) * 0.012,
        landmark,
      });
    }
  }
}

generateCityBlocks();

function urbanRandom(seed: number) {
  return (Math.sin(seed * 123.45) + 1) * 0.5;
}

function UrbanBuilding({
  index,
  spec,
}: {
  index: number;
  spec: CityBuildingSpec;
}) {
  const floors = Math.max(3, Math.min(8, Math.round(spec.h * 2.05)));
  const roofHeight = Math.max(0.10, spec.h * 0.12);
  const rows = Array.from({ length: floors });
  const sideRows = rows.filter((_, row) => row % 2 === 0);

  return (
    <group
      position={[spec.x, -0.5 + spec.h / 2, spec.z]}
      rotation={[0, spec.rotation ?? 0, 0]}
      key={`${spec.x}-${spec.z}-${spec.h}-${index}`}
    >
      <mesh castShadow receiveShadow>
        <boxGeometry args={[spec.w, spec.h, spec.d]} />
        <meshPhysicalMaterial
          color={spec.color}
          roughness={0.48}
          metalness={0.03}
          clearcoat={0.18}
          clearcoatRoughness={0.66}
        />
      </mesh>
      <mesh position={[0, -spec.h / 2 + 0.05, spec.d / 2 + 0.01]}>
        <boxGeometry args={[spec.w * 1.08, 0.12, 0.024]} />
        <meshStandardMaterial color="#172339" roughness={0.46} />
      </mesh>
      <mesh position={[0, -spec.h / 2 + 0.18, spec.d / 2 + 0.017]}>
        <boxGeometry args={[spec.w * 0.72, 0.055, 0.018]} />
        <meshStandardMaterial
          color={spec.landmark ? "#ff4f87" : "#8be9ff"}
          emissive={spec.landmark ? "#ff4f87" : "#8be9ff"}
          emissiveIntensity={0.48}
        />
      </mesh>
      <mesh position={[0, spec.h / 2 + roofHeight / 2 - 0.01, 0]}>
        <boxGeometry args={[spec.w * 0.9, roofHeight, spec.d * 0.9]} />
        <meshStandardMaterial color={spec.roofColor ?? "#233f59"} roughness={0.58} />
      </mesh>
      <mesh position={[0, spec.h / 2 + roofHeight + 0.006, 0]} castShadow>
        <boxGeometry args={[spec.w * 0.16, Math.min(0.3, spec.h * 0.13), spec.d * 0.16]} />
        <meshStandardMaterial color={spec.trimColor ?? "#dff4ff"} roughness={0.34} emissive={spec.trimColor ?? "#8be9ff"} emissiveIntensity={0.2} />
      </mesh>
      {spec.landmark ? (
        <mesh position={[0, spec.h / 2 + roofHeight + 0.24, 0]}>
          <cylinderGeometry args={[0.018, 0.018, 0.5, 12]} />
          <meshStandardMaterial color="#eaf7ff" emissive="#8be9ff" emissiveIntensity={0.78} />
        </mesh>
      ) : null}
      {rows.map((_, row) => {
        const y = -spec.h / 2 + 0.2 + row * (spec.h / (floors + 0.1));
        const stripeColor = row % 2 === 0 ? (spec.windowColor ?? "#f8fdff") : "#d7ecfb";
        const glow = row % 3 === 0 ? "#8be9ff" : "#ffd7ef";
        return (
          <mesh key={`window-${row}`} position={[0, y, spec.d / 2 + 0.008]}>
            <boxGeometry args={[spec.w * 0.72, Math.max(0.03, spec.h / (floors * 3.2)), spec.facadeDepth ?? 0.01]} />
            <meshStandardMaterial
              color={stripeColor}
              emissive={glow}
              emissiveIntensity={0.15 + urbanRandom(index + row) * 0.25}
              opacity={0.86}
              transparent
            />
          </mesh>
        );
      })}
      {sideRows.map((_, row) => {
        const y = -spec.h / 2 + 0.26 + row * (spec.h / (floors + 0.1));
        return (
          <mesh key={`side-window-${row}`} position={[spec.w / 2 + 0.006, y, 0]} rotation={[0, Math.PI / 2, 0]}>
            <boxGeometry args={[spec.d * 0.62, Math.max(0.026, spec.h / (floors * 3.5)), 0.01]} />
            <meshStandardMaterial color="#d9f7ff" emissive="#8be9ff" emissiveIntensity={0.12} transparent opacity={0.72} />
          </mesh>
        );
      })}
    </group>
  );
}

function projectToCityGrid(world: [number, number]): [number, number] {
  return [
    THREE.MathUtils.clamp(world[0] * CITY_SCALE + CITY_X_OFFSET, CITY_BOUNDS.xMin, CITY_BOUNDS.xMax),
    THREE.MathUtils.clamp(world[1] * CITY_SCALE + CITY_Z_OFFSET, CITY_BOUNDS.zMin, CITY_BOUNDS.zMax),
  ];
}

function findRouteState(selectedNeighborhoodId: string): RouteState {
  const selected = neighborhoods.find((item) => item.id === selectedNeighborhoodId) ?? neighborhoods[0];
  const selectedRoute = routes.find((item) => item.id === selected.recommendedRouteId) ?? routes[0];
  const points = selectedRoute.path.map((entry) => projectToCityGrid(entry));
  const safeStart = points[0] ?? projectToCityGrid(selected.scene);
  const destinationFacility = facilities.find((facility) => selected.nearestShelterIds.includes(facility.id));

  return {
    start: safeStart,
    end: points[points.length - 1] ?? safeStart,
    points,
    startLabel: selectedRoute.startLabel,
    endLabel: selectedRoute.endLabel,
    destinationName: destinationFacility?.name ?? "Designated shelter",
  };
}

function sampleRoute(points: Array<[number, number]>, t: number): [number, number] {
  if (!points.length) return [0, 0];
  if (points.length === 1 || t <= 0) return points[0];
  if (t >= 1) return points[points.length - 1];

  const localT = t * (points.length - 1);
  const index = Math.floor(localT);
  const alpha = localT - index;
  const start = points[index];
  const end = points[Math.min(index + 1, points.length - 1)];

  const x = THREE.MathUtils.lerp(start[0], end[0], alpha);
  const z = THREE.MathUtils.lerp(start[1], end[1], alpha);

  return [
    THREE.MathUtils.clamp(x, CITY_BOUNDS.xMin + 0.08, CITY_BOUNDS.xMax - 0.08),
    THREE.MathUtils.clamp(z, CITY_BOUNDS.zMin + 0.08, CITY_BOUNDS.zMax - 0.08),
  ];
}

function CityGroundInfrastructure({ compact = false }: { compact?: boolean }) {
  const roadXs = compact ? [-2.55, -1.65, -0.75, 0.18, 1.08, 2.02, 2.85] : [-3.72, -2.88, -2.04, -1.18, -0.34, 0.52, 1.38, 2.24, 3.08, 3.86];
  const roadZs = compact ? [-1.36, -0.64, 0.08, 0.82, 1.48] : [-1.92, -1.28, -0.62, 0.02, 0.68, 1.34, 2.02];
  const lampPositions = compact
    ? [
        [-2.65, -1.1],
        [-1.25, 0.6],
        [0.4, -0.82],
        [1.86, 1.28],
        [2.62, -0.28],
      ]
    : [
        [-3.4, -1.68],
        [-2.18, -0.42],
        [-1.18, 1.18],
        [-0.22, -1.38],
        [0.86, 0.46],
        [1.76, -1.1],
        [2.76, 1.42],
        [3.58, -0.18],
      ];

  return (
    <group>
      <mesh receiveShadow position={[0, -0.516, 0.22]}>
        <boxGeometry args={[compact ? 6.55 : 8.55, 0.028, compact ? 4.22 : 5.1]} />
        <meshStandardMaterial color="#dcebf5" roughness={0.52} metalness={0.02} />
      </mesh>
      <mesh position={[0, -0.49, compact ? 1.98 : 2.42]}>
        <boxGeometry args={[compact ? 6.7 : 8.7, 0.035, 0.22]} />
        <meshStandardMaterial color="#21344c" roughness={0.5} emissive="#0f2238" emissiveIntensity={0.08} />
      </mesh>
      {[0.94, 1.56, 2.18].map((x, index) => (
        <mesh key={`pier-${x}`} position={[x - 3.2, -0.468, compact ? 2.18 : 2.58]} rotation={[0, index % 2 ? -0.08 : 0.05, 0]}>
          <boxGeometry args={[0.44, 0.05, compact ? 0.88 : 1.02]} />
          <meshStandardMaterial color="#8ea6b5" roughness={0.64} metalness={0.02} />
        </mesh>
      ))}
      {roadXs.map((x, index) => (
        <mesh key={`urban-road-x-${x}`} position={[x, -0.468, 0.04]} rotation={[0, index % 2 ? 0.02 : -0.012, 0]}>
          <boxGeometry args={[0.1, 0.038, compact ? 3.85 : 4.75]} />
          <meshStandardMaterial color="#21324a" roughness={0.62} emissive="#101b2d" emissiveIntensity={0.06} />
        </mesh>
      ))}
      {roadZs.map((z, index) => (
        <mesh key={`urban-road-z-${z}`} position={[0, -0.456, z]} rotation={[0, index % 2 ? 0.012 : -0.01, 0]}>
          <boxGeometry args={[compact ? 6.08 : 7.85, 0.034, 0.096]} />
          <meshStandardMaterial color="#243550" roughness={0.62} emissive="#111d31" emissiveIntensity={0.08} />
        </mesh>
      ))}
      {roadZs.slice(0, compact ? 4 : 6).map((z, index) => (
        <mesh key={`crosswalk-${z}`} position={[-2.98 + index * 1.04, -0.432, z]} rotation={[0, 0.02, 0]}>
          <boxGeometry args={[0.34, 0.018, 0.028]} />
          <meshStandardMaterial color="#f8fdff" emissive="#d7f7ff" emissiveIntensity={0.12} />
        </mesh>
      ))}
      {lampPositions.map(([x, z], index) => (
        <group key={`street-lamp-${index}`} position={[x, -0.22, z]}>
          <mesh>
            <cylinderGeometry args={[0.012, 0.014, 0.52, 8]} />
            <meshStandardMaterial color="#15243a" roughness={0.4} metalness={0.28} />
          </mesh>
          <mesh position={[0, 0.28, 0]}>
            <sphereGeometry args={[0.055, 12, 10]} />
            <meshStandardMaterial color="#fff5d6" emissive="#ffd7ef" emissiveIntensity={0.85} />
          </mesh>
          <pointLight position={[0, 0.32, 0]} intensity={compact ? 1.2 : 1.6} distance={1.1} color={index % 2 ? "#8be9ff" : "#ffd7ef"} />
        </group>
      ))}
    </group>
  );
}

function DetailedCityModel({ compact = false }: { compact?: boolean }) {
  const visibleBlocks = compact
    ? cityBlocks.filter((block) => Math.abs(block.x) < 3.3 && Math.abs(block.z) < 1.8).slice(0, 42)
    : cityBlocks.filter((block) => Math.abs(block.x) < 3.7 && Math.abs(block.z) < 2.05).slice(0, 84);

  return (
    <group>
      <CityGroundInfrastructure compact={compact} />
      {visibleBlocks.map((block, index) => (
        <UrbanBuilding key={`${block.x}-${block.z}`} index={index} spec={block} />
      ))}
      {[-3.2, -2.45, -1.66, -0.8, 0, 0.72, 1.48, 2.28, 3.08].map((x, index) => (
        <mesh key={`street-car-${x}-${index}`} position={[x, -0.415, 0.66 + (index % 2) * 0.28]} castShadow>
          <boxGeometry args={[0.2, 0.08, 0.36]} />
          <meshStandardMaterial
            color={index % 2 === 0 ? "#ff4f87" : "#8be9ff"}
            emissive={index % 2 === 0 ? "#ff4f87" : "#8be9ff"}
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

function CityModelLayer({ compact = false, source }: { compact?: boolean; source: CityModelSource }) {
  if (source === "external" && CITY_MODEL_URL) {
    return <ExternalCityModel compact={compact} />;
  }

  if (source === "sample") {
    return <LocalCityModel compact={compact} />;
  }

  return <DetailedCityModel compact={compact} />;
}

function LocalCityModel({ compact = false }: { compact?: boolean }) {
  const { scene } = useGLTF(LOCAL_CITY_MODEL_URL);
  const cityScale = compact ? 0.0125 : 0.0118;

  return (
    <group>
      <CityGroundInfrastructure compact={compact} />
      <group
        position={compact ? [-1.1, -0.55, -0.78] : [-1.32, -0.55, -0.96]}
        rotation={[0, compact ? -0.44 : -0.5, 0]}
        scale={cityScale}
      >
        <Clone object={scene} castShadow receiveShadow />
      </group>
    </group>
  );
}

function ExternalCityModel({ compact = false }: { compact?: boolean }) {
  const { scene } = useGLTF(CITY_MODEL_URL);

  return (
    <primitive
      object={scene}
      position={[0, -0.55, compact ? 0 : 0.02]}
      scale={compact ? 2.6 : 2.35}
      dispose={null}
      castShadow
      receiveShadow
    />
  );
}

function RouteRibbon({
  routePoints,
  progress,
  showWaypoints,
  width,
}: {
  routePoints: Array<[number, number]>;
  progress: number;
  showWaypoints?: boolean;
  width?: number;
}) {
  const routeIntensity = 1.85 + progress * 0.9;
  const segments = routePoints.length > 1 ? routePoints.slice(0, -1) : [];
  const dynamicWidth = width ?? 0.17;

  if (!routePoints.length) return null;

  return (
    <group position={[0, 0, 0]}>
      {segments.map((segmentStart, index) => {
        const segmentEnd = routePoints[index + 1];
        const dx = segmentEnd[0] - segmentStart[0];
        const dz = segmentEnd[1] - segmentStart[1];
        const len = Math.sqrt(dx * dx + dz * dz);
        const angle = Math.atan2(dz, dx);
        const midX = (segmentStart[0] + segmentEnd[0]) / 2;
        const midZ = (segmentStart[1] + segmentEnd[1]) / 2;

        return (
          <group key={`${segmentStart[0]}-${segmentStart[1]}-${index}`} position={[midX, 0, midZ]} rotation={[0, angle, 0]}>
            <mesh position={[0, 0, 0]} castShadow>
              <boxGeometry args={[len, 0.056, dynamicWidth]} />
              <meshStandardMaterial color="#081426" emissive="#081426" emissiveIntensity={0.8} />
            </mesh>
            <mesh position={[0, 0.038, 0]}>
              <boxGeometry args={[len * 0.98, 0.12, dynamicWidth * 0.62]} />
              <meshStandardMaterial color="#ff2f9f" emissive="#ff2f9f" emissiveIntensity={routeIntensity} />
            </mesh>
            <mesh position={[0, 0.11, 0]}>
              <boxGeometry args={[len * 0.92, 0.026, dynamicWidth * 0.22]} />
              <meshStandardMaterial color="#f8fdff" emissive="#8be9ff" emissiveIntensity={2.0} />
            </mesh>
          </group>
        );
      })}

      {(showWaypoints ? routePoints : []).map((point, index) => {
        return (
          <mesh
            key={`route-point-${index}-${point[0]}-${point[1]}`}
            position={[point[0], 0.16, point[1]]}
          >
            <sphereGeometry args={[0.082, 20, 16]} />
            <meshStandardMaterial color="#f8fdff" emissive="#ff2f9f" emissiveIntensity={2.8} />
          </mesh>
        );
      })}
    </group>
  );
}

function FloodWaterSurface({
  level,
  compact = false,
}: {
  level: number;
  compact?: boolean;
}) {
  const materialRef = useRef<THREE.MeshPhysicalMaterial>(null);
  const rippleRadii = useMemo(() => (compact ? [0.82, 1.34, 1.92, 2.48, 3.04] : [0.9, 1.46, 2.02, 2.58, 3.14, 3.62]), [compact]);
  const normalTexture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const context = canvas.getContext("2d");
    if (!context) return null;

    const imageData = context.createImageData(canvas.width, canvas.height);
    for (let index = 0; index < imageData.data.length; index += 4) {
      const seed = Math.sin(index * 0.028) * 0.5 + 0.5;
      const value = Math.floor(seed * 255);
      imageData.data[index] = value;
      imageData.data[index + 1] = value;
      imageData.data[index + 2] = value;
      imageData.data[index + 3] = 255;
    }
    context.putImageData(imageData, 0, 0);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(compact ? 16 : 20, compact ? 16 : 20);
    texture.needsUpdate = true;
    return texture;
  }, [compact]);

  useFrame((state) => {
    if (normalTexture) {
      normalTexture.offset.x = state.clock.elapsedTime * 0.008;
      normalTexture.offset.y = state.clock.elapsedTime * 0.004;
      normalTexture.needsUpdate = true;
    }
    const material = materialRef.current;
    if (material) {
      material.opacity = THREE.MathUtils.lerp(0.36, 0.86, level);
      material.normalScale.setScalar(0.26 + level * 0.35);
      material.metalness = THREE.MathUtils.lerp(0.02, 0.09, level);
      material.roughness = THREE.MathUtils.lerp(0.12, 0.04, level);
    }
  });

  if (!normalTexture) return null;

  return (
    <group position={[0, -0.14 + level * 0.6, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, Math.PI / 4]}>
        <circleGeometry args={[compact ? 3.45 : 4.0, 132]} />
        <meshPhysicalMaterial
          ref={materialRef}
          color={WATER_COLOR}
          side={THREE.DoubleSide}
          roughness={0.12}
          metalness={0.04}
          clearcoat={1}
          clearcoatRoughness={0.12}
          normalMap={normalTexture}
          normalScale={new THREE.Vector2(0.34, 0.34)}
          transparent
          transmission={0.78}
          thickness={1.1}
          attenuationDistance={2.4}
        />
      </mesh>
      {rippleRadii.map((radius, index) => (
        <mesh
          key={`water-ripple-${radius}`}
          rotation={[-Math.PI / 2, 0, index * 0.36]}
          position={[Math.sin(index * 1.9) * 0.18, 0.018 + index * 0.002, Math.cos(index * 1.4) * 0.12]}
        >
          <torusGeometry args={[radius, 0.006 + level * 0.006, 8, 96]} />
          <meshBasicMaterial color="#e9fbff" transparent opacity={THREE.MathUtils.lerp(0.12, 0.36, level)} />
        </mesh>
      ))}
      {[compact ? -2.7 : -3.26, 0, compact ? 2.7 : 3.26].map((x, index) => (
        <mesh key={`foam-current-${index}`} position={[x, 0.024, compact ? 1.52 : 1.82]} rotation={[-Math.PI / 2, 0, index * 0.08]}>
          <boxGeometry args={[compact ? 1.18 : 1.42, 0.026, 0.018]} />
          <meshBasicMaterial color="#f8fdff" transparent opacity={THREE.MathUtils.lerp(0.16, 0.48, level)} />
        </mesh>
      ))}
    </group>
  );
}

function CinematicScene({
  motion,
  routeState,
  cityModelSource,
}: {
  motion: MotionState;
  routeState: RouteState;
  cityModelSource: CityModelSource;
}) {
  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 2.15, 7.6]} fov={motion.isMobile ? 50 : 41} />
      <color attach="background" args={["#24384e"]} />
      <fog attach="fog" args={["#506c82", 8, 20]} />
      <ambientLight intensity={1.06} color="#cfe8ff" />
      <directionalLight position={[-5, 7, 5]} intensity={3.4} color="#d8efff" castShadow shadow-mapSize={[1024, 1024]} />
      <spotLight position={[4, 6.8, 6]} angle={0.42} penumbra={0.82} intensity={48} color="#ff4f87" castShadow />
      <pointLight position={[-3.8, 2, 1.6]} intensity={30} color="#6e4bff" />
      <pointLight position={[4, 2.2, -1.8]} intensity={22} color="#8be9ff" />
      <Float speed={0.82} rotationIntensity={0.1} floatIntensity={0.18}>
        <CitylineObject
          motion={motion}
          routeState={routeState}
          cityModelSource={cityModelSource}
        />
      </Float>
      <ContactShadows position={[0, -1.34, 0]} opacity={0.34} scale={16} blur={3.4} far={7} color="#5e335f" />
    </>
  );
}

function SimulatorScene({
  motion,
  selectedNeighborhoodId,
  isExpanded,
  routeState,
  cityModelSource,
}: {
  motion: MotionState;
  selectedNeighborhoodId: string;
  isExpanded: boolean;
  routeState: RouteState;
  cityModelSource: CityModelSource;
}) {
  const modelRef = useRef<THREE.Group>(null);
  const routeRef = useRef<THREE.Group>(null);
  const floodWallRef = useRef<THREE.Mesh>(null);
  const floodGaugeRef = useRef<THREE.Group>(null);
  const residentRef = useRef<THREE.Group>(null);
  const sceneRouteState = useMemo(() => {
    if (!routeState.points.length) return findRouteState(selectedNeighborhoodId);
    return routeState;
  }, [routeState, selectedNeighborhoodId]);
  const [routeStartX, routeStartZ] = sceneRouteState.start;
  const [routeEndX, routeEndZ] = sceneRouteState.end;
  const routeAngle = Math.atan2(routeEndZ - routeStartZ, routeEndX - routeStartX || 0.0001);
  const routeScale = Math.max(0.2, 0.18 + motion.route * 0.94);

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

    if (floodWallRef.current) {
      const height = THREE.MathUtils.lerp(0.08, 1.25, motion.flood);
      floodWallRef.current.scale.y = THREE.MathUtils.lerp(floodWallRef.current.scale.y, height, 0.12);
      floodWallRef.current.position.y = -0.58 + height / 2;
      const material = floodWallRef.current.material as THREE.MeshPhysicalMaterial;
      material.opacity = THREE.MathUtils.lerp(0.18, 0.54, motion.flood);
    }

    if (floodGaugeRef.current) {
      floodGaugeRef.current.position.y = THREE.MathUtils.lerp(-0.48, 0.5, motion.flood);
    }

    if (routeRef.current) {
      routeRef.current.position.x = THREE.MathUtils.lerp(routeRef.current.position.x, routeStartX, 0.08);
      routeRef.current.position.z = THREE.MathUtils.lerp(routeRef.current.position.z, routeStartZ, 0.08);
      routeRef.current.position.y = -0.26 + Math.sin(elapsed * 3) * 0.01;
      routeRef.current.rotation.y = THREE.MathUtils.lerp(routeRef.current.rotation.y, routeAngle, 0.08);
      routeRef.current.scale.x = THREE.MathUtils.lerp(routeRef.current.scale.x, routeScale, 0.1);
    }

    if (residentRef.current) {
      const [sampleX, sampleZ] = sampleRoute(sceneRouteState.points, motion.sim);
      residentRef.current.position.x = THREE.MathUtils.lerp(residentRef.current.position.x, sampleX, 0.11);
      residentRef.current.position.z = THREE.MathUtils.lerp(residentRef.current.position.z, sampleZ, 0.11);
      residentRef.current.position.y = -0.05 + Math.sin(elapsed * 6.2) * 0.012;
      residentRef.current.rotation.y = Math.PI / 2 + Math.sin(elapsed * 1.8) * 0.08;
    }
  });

  return (
    <>
      <PerspectiveCamera
        makeDefault
        position={isExpanded ? [4.8, 4.65, 6.85] : [3.7, 3.35, 5.35]}
        fov={isExpanded ? 48 : 38}
      />
      <color attach="background" args={["#263d52"]} />
      <fog attach="fog" args={["#557184", 7, 15]} />
      <ambientLight intensity={1.18} color="#d2ecff" />
      <directionalLight position={[-3.8, 7, 4.2]} intensity={3.7} color="#dbefff" castShadow />
      <pointLight position={[-2.8, 1.4, 1.8]} intensity={18} color="#ff4f87" />
      <pointLight position={[3.2, 1.6, -1.2]} intensity={16} color="#59d7ff" />
      <group ref={modelRef} position={[0, 0.15, 0]} scale={1.08}>
        <mesh receiveShadow position={[0, -0.56, 0]} rotation={[0, 0.02, 0]}>
          <boxGeometry args={[6.1, 0.2, 4.1]} />
          <meshPhysicalMaterial color="#d9ecff" roughness={0.36} metalness={0.04} clearcoat={0.28} />
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
              color={index % 2 === 0 ? "#59d7ff" : "#8be9ff"}
              emissive={index % 2 === 0 ? "#59d7ff" : "#8be9ff"}
              emissiveIntensity={0.34}
            />
          </mesh>
        ))}
        <CityModelLayer compact source={cityModelSource} />
        <FloodWaterSurface level={motion.flood} compact />
        <mesh ref={floodWallRef} position={[0, -0.54, 1.75]}>
          <boxGeometry args={[5.85, 1, 0.08]} />
          <meshPhysicalMaterial
            color="#14d5ff"
            emissive="#14d5ff"
            emissiveIntensity={0.2}
            roughness={0.08}
            metalness={0.02}
            transparent
            opacity={0.28}
            transmission={0.15}
          />
        </mesh>
        <group ref={floodGaugeRef} position={[-2.88, -0.48, 1.84]}>
          <mesh>
            <boxGeometry args={[0.72, 0.052, 0.06]} />
            <meshStandardMaterial color="#dff9ff" emissive="#14d5ff" emissiveIntensity={0.9} />
          </mesh>
          <mesh position={[0.42, 0, 0]}>
            <boxGeometry args={[0.12, 0.18, 0.08]} />
            <meshStandardMaterial color="#ff4f87" emissive="#ff4f87" emissiveIntensity={0.75} />
          </mesh>
          <Text
            position={[0.18, 0.24, 0.04]}
            rotation={[-0.76, 0, 0]}
            fontSize={0.12}
            fontWeight={900}
            color="#f8fdff"
            outlineWidth={0.014}
            outlineColor="#081426"
            anchorX="center"
            anchorY="middle"
          >
            FLOOD RISE
          </Text>
        </group>
        {[-2.4, -1.2, 0, 1.2, 2.4].map((x, index) => (
          <mesh key={`flood-pillar-${x}`} position={[x, -0.1 + motion.flood * 0.34, 1.62 - (index % 2) * 0.16]}>
            <boxGeometry args={[0.035, 0.54, 0.035]} />
            <meshStandardMaterial color="#dff9ff" emissive="#14d5ff" emissiveIntensity={0.54} transparent opacity={0.72} />
          </mesh>
        ))}
        <group ref={routeRef} position={[routeStartX, -0.26, routeStartZ]} scale={[routeScale, 1, 1]} rotation={[0, routeAngle, 0]}>
          <RouteRibbon routePoints={sceneRouteState.points} progress={motion.route} showWaypoints />
          <Text
            position={[0.2, 0.44, 0.08]}
            rotation={[-0.92, 0, 0]}
            fontSize={0.18}
            fontWeight={900}
            color="#f8fdff"
            outlineWidth={0.018}
            outlineColor="#ff2f9f"
            anchorX="center"
            anchorY="middle"
          >
            SAFE ROUTE
          </Text>
        </group>
        <group ref={residentRef} position={[routeStartX, -0.05, routeStartZ]}>
          <ResidentModel scale={0.26} />
          <pointLight intensity={10} distance={2.5} color="#ff2f9f" />
          <pointLight intensity={7} distance={2} color="#8be9ff" />
          <mesh position={[0, 0.03, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.26, 0.022, 10, 72]} />
            <meshStandardMaterial color="#ff2f9f" emissive="#ff2f9f" emissiveIntensity={2.1} />
          </mesh>
          <mesh position={[0, 0.42, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.18, 0.014, 10, 56]} />
            <meshStandardMaterial color="#f8fdff" emissive="#8be9ff" emissiveIntensity={1.7} />
          </mesh>
          <mesh position={[0, 0.64, 0]}>
            <cylinderGeometry args={[0.016, 0.016, 0.56, 12]} />
            <meshStandardMaterial color="#f8fdff" emissive="#ff2f9f" emissiveIntensity={1.8} />
          </mesh>
          <Text
            position={[0, 0.98, 0.12]}
            fontSize={0.2}
            fontWeight={900}
            color="#f8fdff"
            outlineWidth={0.026}
            outlineColor="#081426"
            anchorX="center"
            anchorY="middle"
          >
            MAYA
          </Text>
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
  routeState,
  cityModelSource,
}: {
  motion: MotionState;
  routeState: RouteState;
  cityModelSource: CityModelSource;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const photoRef = useRef<THREE.Group>(null);
  const routeRef = useRef<THREE.Group>(null);
  const floodWallRef = useRef<THREE.Mesh>(null);
  const floodGaugeRef = useRef<THREE.Group>(null);
  const subjectRef = useRef<THREE.Group>(null);
  const cityTexture = useTexture("/assets/heavy-rain-storm.jpg");
  const streetSegments = useMemo(() => Array.from({ length: motion.isMobile ? 5 : 9 }), [motion.isMobile]);
  const sceneRouteState = useMemo(() => routeState, [routeState]);
  const [routeStartX, routeStartZ] = sceneRouteState.start;
  const [routeEndX, routeEndZ] = sceneRouteState.end;
  const routeAngle = Math.atan2(routeEndZ - routeStartZ, routeEndX - routeStartX || 0.0001);
  const routeScale = Math.max(0.2, 0.2 + motion.route * 0.9);

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
      const scrollZoom = THREE.MathUtils.lerp(1, motion.isMobile ? 1.2 : 1.32, motion.scroll);
      groupRef.current.scale.lerp(new THREE.Vector3(scrollZoom, scrollZoom, scrollZoom), 0.08);
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
      routeRef.current.scale.x = THREE.MathUtils.lerp(routeRef.current.scale.x, routeScale, 0.1);
      routeRef.current.position.x = THREE.MathUtils.lerp(routeRef.current.position.x, routeStartX, 0.08);
      routeRef.current.position.y = 0.28 + Math.sin(elapsed * 2.4) * 0.022;
      routeRef.current.position.z = THREE.MathUtils.lerp(routeRef.current.position.z, routeStartZ, 0.08);
      routeRef.current.rotation.y = THREE.MathUtils.lerp(routeRef.current.rotation.y, routeAngle, 0.08);
    }

    if (floodWallRef.current) {
      const height = THREE.MathUtils.lerp(0.1, 1.55, motion.flood);
      floodWallRef.current.scale.y = THREE.MathUtils.lerp(floodWallRef.current.scale.y, height, 0.1);
      floodWallRef.current.position.y = -1.18 + height / 2;
      const material = floodWallRef.current.material as THREE.MeshPhysicalMaterial;
      material.opacity = THREE.MathUtils.lerp(0.2, 0.5, motion.flood);
    }

    if (floodGaugeRef.current) {
      floodGaugeRef.current.position.y = THREE.MathUtils.lerp(-1.02, 0.02, motion.flood);
    }

    if (subjectRef.current) {
      const [subjectX, subjectZ] = sampleRoute(sceneRouteState.points, motion.sim);
      subjectRef.current.position.x = THREE.MathUtils.lerp(subjectRef.current.position.x, subjectX, 0.1);
      subjectRef.current.position.z = THREE.MathUtils.lerp(subjectRef.current.position.z, subjectZ, 0.1);
      subjectRef.current.position.y = 0.22 + Math.sin(elapsed * 5) * 0.025;
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
            color="#dbeafe"
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
              color={index % 2 === 0 ? "#59d7ff" : "#8be9ff"}
              emissive={index % 2 === 0 ? "#59d7ff" : "#8be9ff"}
              emissiveIntensity={0.36}
            />
          </mesh>
        ))}
        <CityModelLayer source={cityModelSource} />
        <FloodWaterSurface level={motion.flood} compact={motion.isMobile} />
        <mesh ref={floodWallRef} position={[0, -1.08, 1.78]}>
          <boxGeometry args={[6.1, 1, 0.09]} />
          <meshPhysicalMaterial
            color="#15d3ff"
            emissive="#15d3ff"
            emissiveIntensity={0.18}
            roughness={0.08}
            metalness={0.02}
            transparent
            opacity={0.28}
            transmission={0.12}
          />
        </mesh>
        <group ref={floodGaugeRef} position={[-2.9, -1.02, 1.96]}>
          <mesh>
            <boxGeometry args={[0.82, 0.055, 0.08]} />
            <meshStandardMaterial color="#e4fbff" emissive="#15d3ff" emissiveIntensity={0.9} />
          </mesh>
          <mesh position={[0.48, 0, 0]}>
            <boxGeometry args={[0.13, 0.2, 0.1]} />
            <meshStandardMaterial color="#ff4f87" emissive="#ff4f87" emissiveIntensity={0.7} />
          </mesh>
          <Text
            position={[0.18, 0.27, 0.05]}
            rotation={[-0.68, 0, 0]}
            fontSize={0.13}
            fontWeight={900}
            color="#f8fdff"
            outlineWidth={0.016}
            outlineColor="#071225"
            anchorX="center"
            anchorY="middle"
          >
            FLOOD RISE
          </Text>
        </group>
      </group>

      <group ref={routeRef} position={[routeStartX, 0.28, routeStartZ]} scale={[routeScale, 1, 1]} rotation={[0, routeAngle, 0]}>
        <RouteRibbon routePoints={sceneRouteState.points} progress={motion.route} showWaypoints />
        <Text
          position={[0.2, 0.34, -0.16]}
          rotation={[-0.64, 0, 0]}
          fontSize={0.19}
          fontWeight={900}
          color="#f8fdff"
          outlineWidth={0.02}
          outlineColor="#ff2f9f"
          anchorX="center"
          anchorY="middle"
        >
          SAFE ROUTE
        </Text>
      </group>

      <group ref={subjectRef} position={[routeStartX, 0.22, routeStartZ]}>
        <ResidentModel scale={0.12} />
        <pointLight intensity={10} distance={2.9} color="#ff2f9f" />
        <pointLight intensity={7} distance={2.5} color="#8be9ff" />
        <mesh position={[0, 0.08, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.2, 0.018, 10, 64]} />
          <meshStandardMaterial color="#ff2f9f" emissive="#ff2f9f" emissiveIntensity={2.2} />
        </mesh>
        <mesh position={[0, 0.36, 0]}>
          <cylinderGeometry args={[0.012, 0.012, 0.52, 10]} />
          <meshStandardMaterial color="#f8fdff" emissive="#ff2f9f" emissiveIntensity={1.8} />
        </mesh>
        <Text
          position={[0, 0.78, 0.06]}
          fontSize={0.16}
          fontWeight={900}
          color="#f8fdff"
          outlineWidth={0.018}
          outlineColor="#071225"
          anchorX="center"
          anchorY="middle"
        >
          MAYA
        </Text>
      </group>

      <mesh position={[0, 1.82, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[2.55, 0.012, 8, 96]} />
        <meshStandardMaterial color="#6e4bff" emissive="#6e4bff" emissiveIntensity={0.75} />
      </mesh>
    </group>
  );
}

useGLTF.preload("/assets/cesium-man.glb");
