"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, Float, Html, MeshTransmissionMaterial, PerspectiveCamera } from "@react-three/drei";
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
        { autoAlpha: 0, y: 96, filter: "blur(10px)" },
        {
          autoAlpha: 1,
          y: 0,
          filter: "blur(0px)",
          duration: 1.2,
          ease: "power3.out",
          scrollTrigger: {
            trigger: panel,
            start: "top 82%",
            end: "top 42%",
            scrub: 1.2,
          },
        },
      );
      gsap.to(panel, {
        autoAlpha: 0,
        y: -88,
        filter: "blur(8px)",
        ease: "power2.inOut",
        scrollTrigger: {
          trigger: panel,
          start: "bottom 76%",
          end: "bottom 34%",
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

  return (
    <main ref={pageRef} className="cityline-next" onPointerMove={handlePointerMove}>
      <div className="gradient-backdrop" aria-hidden="true" />
      <div className="canvas-layer">
        <Canvas
          data-cityline-canvas="true"
          dpr={motion.isMobile ? [1, 1.35] : [1, 1.75]}
          shadows
          gl={{ antialias: true, preserveDrawingBuffer: true, powerPreference: "high-performance" }}
          onCreated={({ gl }) => {
            gl.domElement.dataset.citylineCanvas = "true";
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
            A cinematic civic-resilience landing page where the 3D object floats behind the story, then becomes an
            interactive flood escape simulator.
          </p>
          <div className="hero-actions">
            <a href="#command">Open simulator</a>
            <span>Heavy dreamy scroll</span>
          </div>
        </div>
      </section>

      <section id="story" className="story-section overlay-section" aria-label="Scroll story">
        {storyPanels.map((panel) => (
          <article className="story-panel glass-copy" key={panel.eyebrow}>
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
          <aside className="command-card control-stack">
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

          <section className="command-card simulator-copy">
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

          <aside className="command-card action-stack">
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
              <article className="command-card layer-card" key={hazard.id} style={{ "--accent": hazard.accent } as React.CSSProperties}>
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
            practical civic UX, and optimized low-poly 3D storytelling.
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
      <PerspectiveCamera makeDefault position={[0, 2.4, 8.4]} fov={motion.isMobile ? 48 : 42} />
      <color attach="background" args={["#030407"]} />
      <fog attach="fog" args={["#061014", 7, 22]} />
      <ambientLight intensity={0.55} color="#b8dfff" />
      <directionalLight position={[-4, 8, 5]} intensity={3.2} castShadow shadow-mapSize={[1024, 1024]} />
      <spotLight position={[4, 7, 7]} angle={0.42} penumbra={0.8} intensity={68} color="#52fff1" castShadow />
      <pointLight position={[-3.8, 2, 1.6]} intensity={34} color="#ff3fb4" />
      <pointLight position={[4, 2.2, -2.2]} intensity={24} color="#ffc857" />
      <Float speed={1.15} rotationIntensity={0.22} floatIntensity={0.32}>
        <CitylineObject motion={motion} selectedNeighborhoodId={selectedNeighborhoodId} />
      </Float>
      <ContactShadows position={[0, -1.36, 0]} opacity={0.52} scale={16} blur={2.8} far={7} />
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
  const routeRef = useRef<THREE.Group>(null);
  const waterRef = useRef<THREE.Mesh>(null);
  const subjectRef = useRef<THREE.Group>(null);
  const target = neighborhoods.find((item) => item.id === selectedNeighborhoodId) ?? neighborhoods[0];
  const towers = useMemo(() => buildTowerSet(motion.isMobile ? 18 : 42), [motion.isMobile]);

  useFrame((state) => {
    const elapsed = state.clock.elapsedTime;
    if (groupRef.current) {
      const zoom = THREE.MathUtils.lerp(1, motion.isMobile ? 1.38 : 1.72, motion.scroll);
      groupRef.current.scale.lerp(new THREE.Vector3(zoom, zoom, zoom), 0.08);
      groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, motion.scroll * Math.PI * 1.45 + motion.mouseX * 0.34, 0.08);
      groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, -0.18 + motion.mouseY * 0.18, 0.08);
      groupRef.current.position.y = Math.sin(elapsed * 0.55) * 0.08 - motion.scroll * 0.22;
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
      <group position={[0, -0.22, 0]}>
        <mesh castShadow receiveShadow rotation={[0, Math.PI / 4, 0]}>
          <boxGeometry args={[5.2, 0.32, 5.2]} />
          <meshStandardMaterial color="#0b1118" metalness={0.36} roughness={0.42} />
        </mesh>
        <mesh ref={waterRef} rotation={[-Math.PI / 2, 0, Math.PI / 4]} position={[0, -1.05, 0]}>
          <circleGeometry args={[3.7, 72]} />
          <MeshTransmissionMaterial
            color="#24dcff"
            roughness={0.12}
            metalness={0.04}
            transparent
            opacity={0.28}
            thickness={0.4}
            transmission={0.42}
          />
        </mesh>
      </group>

      <group position={[0, -0.08, 0]}>
        {towers.map((tower) => (
          <BuildingTower key={tower.id} {...tower} />
        ))}
      </group>

      <group ref={routeRef} position={[-1.9, -0.62, 0.56]} scale={[0.2, 1, 1]}>
        <mesh castShadow>
          <boxGeometry args={[3.9, 0.08, 0.12]} />
          <meshStandardMaterial color="#52fff1" emissive="#52fff1" emissiveIntensity={1.2} />
        </mesh>
        <mesh position={[3.9, 0.02, -0.52]} rotation={[0, -0.36, 0]}>
          <boxGeometry args={[1.14, 0.08, 0.12]} />
          <meshStandardMaterial color="#ffc857" emissive="#ffc857" emissiveIntensity={1.1} />
        </mesh>
      </group>

      <group ref={subjectRef} position={[-1.9, -0.2, 0.55]}>
        <mesh castShadow>
          <capsuleGeometry args={[0.09, 0.36, 5, 12]} />
          <meshStandardMaterial color="#fff4db" emissive="#52fff1" emissiveIntensity={0.1} />
        </mesh>
        <mesh position={[0, 0.34, 0]} castShadow>
          <sphereGeometry args={[0.1, 16, 16]} />
          <meshStandardMaterial color="#d99b68" roughness={0.6} />
        </mesh>
        <pointLight intensity={4.5} distance={2.4} color="#52fff1" />
      </group>

      <mesh position={[0, 1.82, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[2.55, 0.012, 8, 96]} />
        <meshStandardMaterial color="#52fff1" emissive="#52fff1" emissiveIntensity={0.8} />
      </mesh>

      <Html position={[0, 2.26, 0]} center transform distanceFactor={8} occlude={false}>
        <div className="model-label">
          <span>{target.borough}</span>
          <strong>{target.name}</strong>
        </div>
      </Html>
    </group>
  );
}

function BuildingTower({
  x,
  z,
  height,
  color,
  accent,
}: {
  id: string;
  x: number;
  z: number;
  height: number;
  color: string;
  accent: string;
}) {
  return (
    <group position={[x, height / 2 - 1.05, z]}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.46, height, 0.46]} />
        <meshStandardMaterial color={color} roughness={0.42} metalness={0.18} emissive={accent} emissiveIntensity={0.06} />
      </mesh>
      {Array.from({ length: Math.max(2, Math.floor(height * 2.2)) }).map((_, index) => (
        <mesh key={index} position={[0, -height / 2 + 0.32 + index * 0.34, 0.236]}>
          <boxGeometry args={[0.36, 0.026, 0.014]} />
          <meshBasicMaterial color={index % 3 === 0 ? "#ffc857" : accent} transparent opacity={0.58} />
        </mesh>
      ))}
    </group>
  );
}

function buildTowerSet(count: number) {
  const colors = ["#253a55", "#3e2450", "#204745", "#523137", "#39462b", "#27314e"];
  const accents = ["#52fff1", "#ff3fb4", "#ffc857", "#ff5b48", "#75a7ff"];
  return Array.from({ length: count }).map((_, index) => {
    const ring = Math.floor(index / 8) + 1;
    const angle = index * 2.399963;
    const radius = 0.8 + ring * 0.36 + (index % 3) * 0.16;
    return {
      id: `tower-${index}`,
      x: Math.cos(angle) * radius,
      z: Math.sin(angle) * radius,
      height: 0.72 + ((Math.sin(index * 9.17) + 1) / 2) * 2.4 + (index % 7 === 0 ? 1 : 0),
      color: colors[index % colors.length],
      accent: accents[index % accents.length],
    };
  });
}
