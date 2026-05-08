import { useEffect, useRef } from "react";
import * as THREE from "three";
import {
  facilities,
  findNeighborhood,
  findRoute,
  getFacilitiesFor,
  type HazardId,
} from "../data/cityData";
import type { IntroState } from "../lib/introSequence";

type CitySceneProps = {
  scrollProgress: number;
  activeHazard: HazardId;
  introState: IntroState;
  selectedNeighborhoodId: string;
};

type SceneState = {
  scrollProgress: number;
  activeHazard: HazardId;
  introState: IntroState;
  selectedNeighborhoodId: string;
};

const clamp01 = (value: number) => Math.min(Math.max(value, 0), 1);

export function CityScene({
  scrollProgress,
  activeHazard,
  introState,
  selectedNeighborhoodId,
}: CitySceneProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const stateRef = useRef<SceneState>({
    scrollProgress,
    activeHazard,
    introState,
    selectedNeighborhoodId,
  });

  useEffect(() => {
    stateRef.current = { scrollProgress, activeHazard, introState, selectedNeighborhoodId };
  }, [scrollProgress, activeHazard, introState, selectedNeighborhoodId]);

  useEffect(() => {
    if (!mountRef.current) return;

    const mount = mountRef.current;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#050507");
    scene.fog = new THREE.FogExp2("#07090d", 0.035);

    const camera = new THREE.PerspectiveCamera(
      44,
      mount.clientWidth / Math.max(mount.clientHeight, 1),
      0.1,
      120,
    );
    camera.position.set(15, 11, 24);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
      preserveDrawingBuffer: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.dataset.citylineCanvas = "true";
    mount.appendChild(renderer.domElement);

    const ambient = new THREE.AmbientLight("#a9c6ce", 0.5);
    scene.add(ambient);

    const moon = new THREE.DirectionalLight("#d9efff", 2.6);
    moon.position.set(-12, 19, 9);
    moon.castShadow = true;
    moon.shadow.mapSize.set(1024, 1024);
    scene.add(moon);

    const warningLight = new THREE.PointLight("#ff503d", 42, 32);
    warningLight.position.set(-8, 5, -2);
    scene.add(warningLight);

    const routeLight = new THREE.PointLight("#45f0e4", 24, 28);
    routeLight.position.set(-2, 4, 2);
    scene.add(routeLight);

    const lightningLight = new THREE.PointLight("#d8f7ff", 0, 80);
    lightningLight.position.set(1, 18, 10);
    scene.add(lightningLight);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(54, 44),
      new THREE.MeshStandardMaterial({
        color: "#111111",
        roughness: 0.82,
        metalness: 0.08,
      }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.04;
    ground.receiveShadow = true;
    scene.add(ground);

    const grid = new THREE.GridHelper(54, 54, "#2e3330", "#151b1b");
    grid.position.y = 0.006;
    scene.add(grid);

    const riverMaterial = new THREE.MeshPhysicalMaterial({
      color: "#102029",
      roughness: 0.18,
      metalness: 0.1,
      transparent: true,
      opacity: 0.78,
      transmission: 0.05,
    });
    const eastRiver = new THREE.Mesh(new THREE.PlaneGeometry(8, 44), riverMaterial);
    eastRiver.rotation.x = -Math.PI / 2;
    eastRiver.position.set(11.5, 0.012, 0);
    scene.add(eastRiver);

    const harbor = new THREE.Mesh(new THREE.PlaneGeometry(54, 8), riverMaterial.clone());
    harbor.rotation.x = -Math.PI / 2;
    harbor.position.set(0, 0.014, 13);
    scene.add(harbor);

    const roadMaterial = new THREE.MeshStandardMaterial({
      color: "#191a18",
      roughness: 0.78,
      metalness: 0.12,
    });

    const roads = new THREE.Group();
    for (let x = -10; x <= 8; x += 4) {
      const road = new THREE.Mesh(new THREE.PlaneGeometry(0.38, 27), roadMaterial);
      road.rotation.x = -Math.PI / 2;
      road.position.set(x, 0.025, 0);
      roads.add(road);
    }
    for (let z = -10; z <= 10; z += 4) {
      const road = new THREE.Mesh(new THREE.PlaneGeometry(26, 0.38), roadMaterial);
      road.rotation.x = -Math.PI / 2;
      road.position.set(-1, 0.026, z);
      roads.add(road);
    }
    scene.add(roads);

    const bridgeMaterial = new THREE.MeshStandardMaterial({
      color: "#2d2b24",
      roughness: 0.62,
      metalness: 0.2,
      emissive: "#36220b",
      emissiveIntensity: 0.12,
    });
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(22, 0.24, 0.48), bridgeMaterial);
    bridge.position.set(5, 1.1, 7.5);
    bridge.rotation.y = -0.22;
    bridge.castShadow = true;
    scene.add(bridge);

    const buildingGroup = new THREE.Group();
    const buildingMeshes: THREE.Mesh[] = [];
    const palette = ["#1a2021", "#242827", "#202b2d", "#2b2b27", "#1c2028", "#34302a"];
    const accentPalette = ["#4fd7ff", "#ff604c", "#f2c257", "#f4efe6"];
    let buildingIndex = 0;

    for (let x = -12; x <= 8; x += 2) {
      for (let z = -11; z <= 11; z += 2) {
        if (Math.abs(x % 4) < 0.2 || Math.abs(z % 4) < 0.2) continue;
        if (x > 9 || z > 11.5) continue;
        const deterministic = Math.sin((x + 19) * 12.9898 + (z + 23) * 78.233) * 43758.5453;
        const seed = deterministic - Math.floor(deterministic);
        const height = 0.8 + seed * 6.7 + (z < -4 ? 1.8 : 0) + (x < -4 ? 1.2 : 0);
        const width = 0.72 + (seed % 0.25);
        const depth = 0.7 + ((seed * 1.7) % 0.28);
        const material = new THREE.MeshStandardMaterial({
          color: palette[buildingIndex % palette.length],
          roughness: 0.46,
          metalness: 0.2,
          emissive: accentPalette[buildingIndex % accentPalette.length],
          emissiveIntensity: 0.015 + seed * 0.04,
        });
        const building = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
        building.position.set(x, height / 2, z);
        building.castShadow = true;
        building.receiveShadow = true;
        building.userData = {
          baseY: height / 2,
          risk: seed,
          baseEmissive: material.emissiveIntensity,
          originalColor: material.color.clone(),
        };
        buildingGroup.add(building);
        buildingMeshes.push(building);

        if (height > 3.4 && buildingIndex % 3 === 0) {
          const antenna = new THREE.Mesh(
            new THREE.BoxGeometry(0.05, 0.75, 0.05),
            new THREE.MeshBasicMaterial({ color: "#f2c257" }),
          );
          antenna.position.set(x, height + 0.35, z);
          buildingGroup.add(antenna);
        }
        buildingIndex += 1;
      }
    }
    scene.add(buildingGroup);

    const foregroundGroup = new THREE.Group();
    const foregroundMaterial = new THREE.MeshStandardMaterial({
      color: "#020405",
      roughness: 0.76,
      metalness: 0.04,
      transparent: true,
      opacity: 0.82,
    });
    [
      [-17, 7.6, 8.6, 1.5, 1.3],
      [-14.2, 5.8, 12.5, 1.1, 1.1],
      [12.2, 8.4, -8.8, 1.3, 1.2],
      [15.4, 6.2, -3.2, 1.2, 1.3],
    ].forEach(([x, height, z, width, depth]) => {
      const tower = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), foregroundMaterial.clone());
      tower.position.set(x, height / 2 - 0.1, z);
      tower.castShadow = true;
      foregroundGroup.add(tower);
    });
    scene.add(foregroundGroup);

    const waterMaterial = new THREE.MeshPhysicalMaterial({
      color: "#235f73",
      emissive: "#0a2f40",
      emissiveIntensity: 0.32,
      roughness: 0.12,
      metalness: 0.06,
      transparent: true,
      opacity: 0.1,
      transmission: 0.08,
    });
    const floodWater = new THREE.Mesh(new THREE.PlaneGeometry(48, 37, 20, 20), waterMaterial);
    floodWater.rotation.x = -Math.PI / 2;
    floodWater.position.set(-2, -0.28, 1.4);
    scene.add(floodWater);

    const reflectionMaterial = new THREE.MeshBasicMaterial({
      color: "#4fd7ff",
      transparent: true,
      opacity: 0.1,
      side: THREE.DoubleSide,
    });
    const reflectionGroup = new THREE.Group();
    for (let i = 0; i < 11; i += 1) {
      const strip = new THREE.Mesh(new THREE.PlaneGeometry(9 + i * 0.55, 0.035), reflectionMaterial.clone());
      strip.rotation.x = -Math.PI / 2;
      strip.rotation.z = (i % 2 === 0 ? 0.17 : -0.12);
      strip.position.set(-7 + i * 1.5, 0.08, -7 + (i % 5) * 3.2);
      reflectionGroup.add(strip);
    }
    scene.add(reflectionGroup);

    const streetWaterMaterial = new THREE.MeshPhysicalMaterial({
      color: "#2edaff",
      emissive: "#0e4354",
      emissiveIntensity: 0.42,
      roughness: 0.08,
      metalness: 0.08,
      transparent: true,
      opacity: 0,
      transmission: 0.05,
    });
    const streetFloodGroup = new THREE.Group();
    for (let x = -10; x <= 8; x += 4) {
      const channel = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 27), streetWaterMaterial.clone());
      channel.rotation.x = -Math.PI / 2;
      channel.position.set(x, 0.08, 0);
      streetFloodGroup.add(channel);
    }
    for (let z = -10; z <= 10; z += 4) {
      const channel = new THREE.Mesh(new THREE.PlaneGeometry(26, 0.72), streetWaterMaterial.clone());
      channel.rotation.x = -Math.PI / 2;
      channel.position.set(-1, 0.085, z);
      streetFloodGroup.add(channel);
    }
    scene.add(streetFloodGroup);

    const surgeWallMaterial = new THREE.MeshBasicMaterial({
      color: "#52fff1",
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const surgeWall = new THREE.Mesh(new THREE.PlaneGeometry(34, 4.6, 24, 1), surgeWallMaterial);
    surgeWall.position.set(-1.8, 2.1, 15.6);
    scene.add(surgeWall);

    const routeMaterial = new THREE.LineBasicMaterial({
      color: "#52fff1",
      transparent: true,
      opacity: 0,
    });
    const routeLine = new THREE.Line(new THREE.BufferGeometry(), routeMaterial);
    scene.add(routeLine);

    const routeHaloMaterial = new THREE.LineBasicMaterial({
      color: "#f4efe6",
      transparent: true,
      opacity: 0,
    });
    const routeHalo = new THREE.Line(new THREE.BufferGeometry(), routeHaloMaterial);
    routeHalo.position.y = 0.035;
    scene.add(routeHalo);

    const evacMarker = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 24, 24),
      new THREE.MeshBasicMaterial({ color: "#f4efe6" }),
    );
    evacMarker.visible = false;
    scene.add(evacMarker);

    const markerGroup = new THREE.Group();
    const markerMaterials = {
      shelter: new THREE.MeshBasicMaterial({ color: "#52fff1" }),
      hospital: new THREE.MeshBasicMaterial({ color: "#ff5b48" }),
      other: new THREE.MeshBasicMaterial({ color: "#f2c257" }),
    };
    facilities.forEach((facility) => {
      const marker = new THREE.Mesh(
        new THREE.CylinderGeometry(0.16, 0.16, 0.1, 24),
        facility.type === "hospital"
          ? markerMaterials.hospital
          : facility.type === "shelter"
            ? markerMaterials.shelter
            : markerMaterials.other,
      );
      marker.position.set(facility.scene[0], 1.15, facility.scene[1]);
      marker.userData.facilityId = facility.id;
      markerGroup.add(marker);

      const beam = new THREE.Mesh(
        new THREE.CylinderGeometry(0.018, 0.018, 2.1, 12),
        new THREE.MeshBasicMaterial({
          color: facility.type === "hospital" ? "#ff5b48" : "#52fff1",
          transparent: true,
          opacity: 0.38,
        }),
      );
      beam.position.set(facility.scene[0], 1.05, facility.scene[1]);
      markerGroup.add(beam);
    });
    scene.add(markerGroup);

    const rainGeometry = new THREE.BufferGeometry();
    const rainCount = 900;
    const rainPositions = new Float32Array(rainCount * 3);
    for (let i = 0; i < rainCount; i += 1) {
      rainPositions[i * 3] = (Math.random() - 0.5) * 42;
      rainPositions[i * 3 + 1] = Math.random() * 18 + 2;
      rainPositions[i * 3 + 2] = (Math.random() - 0.5) * 34;
    }
    rainGeometry.setAttribute("position", new THREE.BufferAttribute(rainPositions, 3));
    const rainMaterial = new THREE.PointsMaterial({
      color: "#cbeefa",
      size: 0.035,
      transparent: true,
      opacity: 0.0,
      depthWrite: false,
    });
    const rain = new THREE.Points(rainGeometry, rainMaterial);
    scene.add(rain);

    const streakGeometry = new THREE.BufferGeometry();
    const streakCount = 520;
    const streakPositions = new Float32Array(streakCount * 2 * 3);
    for (let i = 0; i < streakCount; i += 1) {
      const x = (Math.random() - 0.5) * 46;
      const y = Math.random() * 20 + 2;
      const z = (Math.random() - 0.5) * 36;
      const offset = i * 6;
      streakPositions[offset] = x;
      streakPositions[offset + 1] = y;
      streakPositions[offset + 2] = z;
      streakPositions[offset + 3] = x - 0.06;
      streakPositions[offset + 4] = y - 0.9;
      streakPositions[offset + 5] = z + 0.04;
    }
    streakGeometry.setAttribute("position", new THREE.BufferAttribute(streakPositions, 3));
    const streakMaterial = new THREE.LineBasicMaterial({
      color: "#cbeefa",
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const rainStreaks = new THREE.LineSegments(streakGeometry, streakMaterial);
    scene.add(rainStreaks);

    const subwayMaterial = new THREE.LineBasicMaterial({
      color: "#ff5b48",
      transparent: true,
      opacity: 0.32,
    });
    const subwayPath = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-10, 0.12, -6),
      new THREE.Vector3(-6, 0.12, -4.5),
      new THREE.Vector3(-2, 0.12, -2),
      new THREE.Vector3(3, 0.12, -0.5),
      new THREE.Vector3(7, 0.12, 1.5),
    ]);
    const subwayLine = new THREE.Line(subwayPath, subwayMaterial);
    scene.add(subwayLine);

    const targetVector = new THREE.Vector3(0, 0.8, 0);
    const desiredPosition = new THREE.Vector3();
    const lookTarget = new THREE.Vector3();
    const clock = new THREE.Clock();
    let lastRouteId = "";
    let currentRoutePath: Array<[number, number]> = findRoute(
      findNeighborhood(stateRef.current.selectedNeighborhoodId).recommendedRouteId,
    ).path;

    const updateRoute = () => {
      const neighborhood = findNeighborhood(stateRef.current.selectedNeighborhoodId);
      const route = findRoute(neighborhood.recommendedRouteId);
      if (route.id === lastRouteId) return;
      lastRouteId = route.id;
      currentRoutePath = route.path;

      const points = route.path.map(([x, z], index) => new THREE.Vector3(x, 1.35 + index * 0.035, z));
      routeLine.geometry.dispose();
      routeLine.geometry = new THREE.BufferGeometry().setFromPoints(points);

      const haloPoints = route.path.map(([x, z], index) => new THREE.Vector3(x, 1.08 + index * 0.02, z));
      routeHalo.geometry.dispose();
      routeHalo.geometry = new THREE.BufferGeometry().setFromPoints(haloPoints);
    };

    const animate = () => {
      const elapsed = clock.getElapsedTime();
      const state = stateRef.current;
      const progress = state.introState.progress;
      const floodProgress = state.activeHazard === "flood" ? state.introState.floodProgress : 0.16;
      const routeProgress = state.introState.routeProgress;
      const rainIntensity = state.activeHazard === "flood" ? state.introState.rainIntensity : 0.16;
      const neighborhoodProgress = state.introState.neighborhoodProgress;
      const neighborhood = findNeighborhood(state.selectedNeighborhoodId);
      const [targetX, targetZ] = neighborhood.scene;

      updateRoute();

      const cameraStops = [
        new THREE.Vector3(17, 10.4, 24),
        new THREE.Vector3(9.8, 6.4, 16.5),
        new THREE.Vector3(3.8, 3.6, 9.6),
        new THREE.Vector3(targetX + 5.6, 4.7, targetZ + 7.8),
        new THREE.Vector3(targetX + 2.75, 3.25, targetZ + 4.7),
      ];
      const targetStops = [
        new THREE.Vector3(-1.2, 1.2, 0),
        new THREE.Vector3(-3.4, 1.05, 0.8),
        new THREE.Vector3(-2.3, 0.85, 2.5),
        new THREE.Vector3(targetX, 1.18, targetZ),
        new THREE.Vector3(targetX, 1.25, targetZ),
      ];
      const cameraPhase = clamp01(progress) * (cameraStops.length - 1);
      const cameraIndex = Math.min(Math.floor(cameraPhase), cameraStops.length - 2);
      const cameraT = cameraPhase - cameraIndex;
      desiredPosition.copy(cameraStops[cameraIndex]).lerp(cameraStops[cameraIndex + 1], cameraT);
      desiredPosition.x += Math.sin(elapsed * 0.32) * 0.16;
      desiredPosition.y += Math.sin(elapsed * 0.23) * 0.08;
      lookTarget.copy(targetStops[cameraIndex]).lerp(targetStops[cameraIndex + 1], cameraT);

      camera.position.lerp(desiredPosition, 0.052);
      targetVector.lerp(lookTarget, 0.07);
      camera.lookAt(targetVector);

      floodWater.position.y = THREE.MathUtils.lerp(-0.32, 0.78, floodProgress);
      waterMaterial.opacity = THREE.MathUtils.lerp(0.08, 0.52, floodProgress);
      floodWater.position.x = -2 + Math.sin(elapsed * 0.35) * 0.035;
      floodWater.position.z = 1.4 + Math.cos(elapsed * 0.27) * 0.045;

      streetFloodGroup.children.forEach((child, index) => {
        const mesh = child as THREE.Mesh<THREE.BufferGeometry, THREE.MeshPhysicalMaterial>;
        mesh.position.y = 0.1 + floodProgress * 0.5 + Math.sin(elapsed * 1.3 + index) * 0.01;
        mesh.material.opacity = THREE.MathUtils.lerp(0, 0.42, clamp01((floodProgress - 0.18) / 0.58));
      });

      surgeWall.position.z = THREE.MathUtils.lerp(15.8, 7.6, clamp01((floodProgress - 0.12) / 0.72));
      surgeWall.position.y = THREE.MathUtils.lerp(1.1, 2.9, floodProgress) + Math.sin(elapsed * 1.5) * 0.08;
      surgeWallMaterial.opacity = THREE.MathUtils.lerp(0, 0.26, clamp01((floodProgress - 0.18) / 0.55));

      reflectionGroup.children.forEach((strip, index) => {
        const mesh = strip as THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
        mesh.material.opacity = THREE.MathUtils.lerp(0.02, 0.22 + (index % 3) * 0.04, floodProgress);
        mesh.position.y = 0.1 + floodProgress * 0.75 + Math.sin(elapsed + index) * 0.015;
      });

      const routeOpacity = routeProgress;
      routeMaterial.opacity = routeOpacity * (state.activeHazard === "flood" ? 0.92 : 0.56);
      routeHaloMaterial.opacity = routeOpacity * 0.34;
      evacMarker.visible = routeOpacity > 0.28;
      if (evacMarker.visible && currentRoutePath.length > 1) {
        const pathPosition = (elapsed * 0.28 + progress * 0.9) % 1;
        const scaled = pathPosition * (currentRoutePath.length - 1);
        const segment = Math.min(Math.floor(scaled), currentRoutePath.length - 2);
        const localT = scaled - segment;
        const [ax, az] = currentRoutePath[segment];
        const [bx, bz] = currentRoutePath[segment + 1];
        evacMarker.position.set(
          THREE.MathUtils.lerp(ax, bx, localT),
          1.42 + Math.sin(elapsed * 7) * 0.08,
          THREE.MathUtils.lerp(az, bz, localT),
        );
        (evacMarker.material as THREE.MeshBasicMaterial).color.set(routeOpacity > 0.7 ? "#f4efe6" : "#52fff1");
      }
      markerGroup.visible = neighborhoodProgress > 0.08 || routeOpacity > 0.04;
      markerGroup.children.forEach((child, index) => {
        child.position.y += Math.sin(elapsed * 2 + index) * 0.0009;
      });

      foregroundGroup.children.forEach((child, index) => {
        const mesh = child as THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
        mesh.material.opacity = THREE.MathUtils.lerp(0.82, 0.32, neighborhoodProgress);
        mesh.position.y += Math.sin(elapsed * 0.6 + index) * 0.0008;
      });

      buildingMeshes.forEach((building) => {
        const material = building.material as THREE.MeshStandardMaterial;
        const risk = building.userData.risk as number;
        const distance = Math.hypot(building.position.x - targetX, building.position.z - targetZ);
        const localRisk = clamp01(1 - distance / 10);
        material.emissiveIntensity = (building.userData.baseEmissive as number) + floodProgress * risk * 0.08;
        if (localRisk > 0.45 && progress > 0.36) {
          material.color.lerp(new THREE.Color("#35201d"), 0.012);
        } else {
          material.color.lerp(building.userData.originalColor as THREE.Color, 0.012);
        }
      });

      const positions = rainGeometry.attributes.position.array as Float32Array;
      for (let i = 0; i < rainCount; i += 1) {
        const yIndex = i * 3 + 1;
        positions[yIndex] -= 0.12 + floodProgress * 0.22;
        if (positions[yIndex] < 0.4) {
          positions[yIndex] = 17 + Math.random() * 7;
          positions[i * 3] = (Math.random() - 0.5) * 42;
          positions[i * 3 + 2] = (Math.random() - 0.5) * 34;
        }
      }
      rainGeometry.attributes.position.needsUpdate = true;
      rainMaterial.opacity = state.activeHazard === "flood" ? THREE.MathUtils.lerp(0.05, 0.5, rainIntensity) : 0.08;
      streakMaterial.opacity = state.activeHazard === "flood" ? THREE.MathUtils.lerp(0, 0.42, rainIntensity) : 0.04;

      const streakArray = streakGeometry.attributes.position.array as Float32Array;
      for (let i = 0; i < streakCount; i += 1) {
        const offset = i * 6;
        streakArray[offset + 1] -= 0.18 + rainIntensity * 0.48;
        streakArray[offset + 4] -= 0.18 + rainIntensity * 0.48;
        if (streakArray[offset + 1] < 0.8) {
          const x = (Math.random() - 0.5) * 46;
          const y = 18 + Math.random() * 8;
          const z = (Math.random() - 0.5) * 36;
          streakArray[offset] = x;
          streakArray[offset + 1] = y;
          streakArray[offset + 2] = z;
          streakArray[offset + 3] = x - 0.06;
          streakArray[offset + 4] = y - 0.9;
          streakArray[offset + 5] = z + 0.04;
        }
      }
      streakGeometry.attributes.position.needsUpdate = true;

      subwayMaterial.opacity = progress > 0.32 ? 0.5 + Math.sin(elapsed * 4) * 0.14 : 0.22;
      const lightningPulse = rainIntensity > 0.42 ? Math.pow(Math.max(0, Math.sin(elapsed * 1.25 + 0.8)), 26) : 0;
      lightningLight.intensity = lightningPulse * 190;
      warningLight.intensity = 24 + Math.sin(elapsed * 4.5) * 10 + floodProgress * 22 + lightningPulse * 28;
      routeLight.position.set(targetX, 4.5, targetZ);

      if (state.activeHazard === "wildfire") {
        scene.fog = new THREE.FogExp2("#190d08", 0.045);
        warningLight.color.set("#ff6a32");
      } else if (state.activeHazard === "earthquake") {
        scene.fog = new THREE.FogExp2("#11110c", 0.038);
        warningLight.color.set("#f7c85b");
      } else if (state.activeHazard === "heat") {
        scene.fog = new THREE.FogExp2("#151208", 0.032);
        warningLight.color.set("#8ddf72");
      } else {
        scene.fog = new THREE.FogExp2("#07090d", 0.035);
        warningLight.color.set("#ff503d");
      }

      renderer.render(scene, camera);
      animationFrame = window.requestAnimationFrame(animate);
    };

    const handleResize = () => {
      const width = mount.clientWidth;
      const height = Math.max(mount.clientHeight, 1);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener("resize", handleResize);
    getFacilitiesFor(["shelter-36", "hospital-bellevue"]);
    let animationFrame = window.requestAnimationFrame(animate);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", handleResize);
      routeLine.geometry.dispose();
      routeHalo.geometry.dispose();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.Points) {
          object.geometry?.dispose();
          const material = object.material;
          if (Array.isArray(material)) {
            material.forEach((item) => item.dispose());
          } else {
            material?.dispose();
          }
        }
      });
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, []);

  return <div className="city-scene" ref={mountRef} aria-hidden="true" />;
}
