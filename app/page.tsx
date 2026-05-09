"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, Float, MeshTransmissionMaterial, PerspectiveCamera, useTexture } from "@react-three/drei";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import {
  ArrowUpRight,
  Building2,
  CloudRain,
  Crosshair,
  Layers3,
  Navigation,
  Pause,
  Play,
  RadioTower,
  Route,
  ShieldAlert,
  SlidersHorizontal,
  Waves,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
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

const controls = [
  { label: "Rainfall", value: "3.2 in/hr", icon: CloudRain },
  { label: "Tide surge", value: "+6.8 ft", icon: Waves },
  { label: "Drainage", value: "42%", icon: SlidersHorizontal },
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
    const lenis = new Lenis({
      duration: 1.55,
      smoothWheel: true,
      wheelMultiplier: 0.82,
      touchMultiplier: 0.9,
    });

    const raf = (time: number) => {
      lenis.raf(time);
      ScrollTrigger.update();
      requestAnimationFrame(raf);
    };
    const frame = requestAnimationFrame(raf);

    const trigger = ScrollTrigger.create({
      trigger: pageRef.current,
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

    gsap.utils.toArray<HTMLElement>(".command-card").forEach((card, index) => {
      gsap.fromTo(
        card,
        { autoAlpha: 0, y: 72 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 1,
          delay: index * 0.04,
          ease: "power2.out",
          scrollTrigger: {
            trigger: card,
            start: "top 88%",
            toggleActions: "play none none reverse",
          },
        },
      );
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
          <CinematicScene motion={motion} selectedNeighborhoodId={selectedNeighborhood} />
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
            <span>Heavy dreamy scroll</span>
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

      <section id="command" className="command-section">
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
                  onClick={() => setSelectedNeighborhood(item.id)}
                >
                  <span>{item.borough}</span>
                  <strong>{item.name}</strong>
                </button>
              ))}
            </div>
          </aside>

          <section className="command-card simulator-copy interactive-panel">
            <div className="simulator-status">
              <Metric label="Flood rise" value={`${Math.round(motion.flood * 100)}%`} />
              <Metric label="Route confidence" value={`${Math.round(motion.route * 88)}%`} />
              <Metric label="Escape playback" value={`${Math.round(motion.sim * 100)}%`} />
            </div>
            <p>
              The fixed R3F canvas stays behind this interface. Drag across the page for parallax, then press play to
              make the flood layer and route object animate like a lightweight Spline-style web export.
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
  const target = neighborhoods.find((item) => item.id === selectedNeighborhoodId) ?? neighborhoods[0];
  const cityTexture = useTexture("/assets/south-street-seaport.jpg");
  const streetSegments = useMemo(() => Array.from({ length: motion.isMobile ? 5 : 9 }), [motion.isMobile]);

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
      routeRef.current.position.y = -0.64 + Math.sin(elapsed * 2.4) * 0.018;
    }

    if (waterRef.current) {
      waterRef.current.position.y = THREE.MathUtils.lerp(-1.18, -0.44, motion.flood);
      waterRef.current.scale.setScalar(THREE.MathUtils.lerp(0.6, 1.28, motion.flood));
      const material = waterRef.current.material as THREE.MeshPhysicalMaterial;
      material.opacity = THREE.MathUtils.lerp(0.18, 0.58, motion.flood);
    }

    if (subjectRef.current) {
      subjectRef.current.position.x = THREE.MathUtils.lerp(-1.9, 1.9, motion.sim);
      subjectRef.current.position.z = THREE.MathUtils.lerp(0.55, -0.56, motion.sim);
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

      <group ref={routeRef} position={[-1.9, -0.62, 0.56]} scale={[0.2, 1, 1]}>
        <mesh castShadow>
          <boxGeometry args={[3.9, 0.075, 0.12]} />
          <meshStandardMaterial color="#fff7c7" emissive="#ffd84d" emissiveIntensity={1.4} />
        </mesh>
        <mesh position={[3.9, 0.02, -0.52]} rotation={[0, -0.36, 0]}>
          <boxGeometry args={[1.14, 0.075, 0.12]} />
          <meshStandardMaterial color="#ff4f87" emissive="#ff4f87" emissiveIntensity={1.35} />
        </mesh>
      </group>

      <group ref={subjectRef} position={[-1.9, -0.2, 0.55]}>
        <mesh castShadow>
          <capsuleGeometry args={[0.09, 0.36, 5, 12]} />
          <meshStandardMaterial color="#fff7db" emissive="#ffd84d" emissiveIntensity={0.12} />
        </mesh>
        <mesh position={[0, 0.34, 0]} castShadow>
          <sphereGeometry args={[0.1, 16, 16]} />
          <meshStandardMaterial color="#8b543b" roughness={0.56} />
        </mesh>
        <pointLight intensity={5.2} distance={2.4} color="#ffd84d" />
      </group>

      <mesh position={[0, 1.82, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[2.55, 0.012, 8, 96]} />
        <meshStandardMaterial color="#6e4bff" emissive="#6e4bff" emissiveIntensity={0.75} />
      </mesh>
    </group>
  );
}
