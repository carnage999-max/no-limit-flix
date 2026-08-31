import { Canvas, useThree } from "@react-three/fiber";
import { Suspense, useEffect } from "react";
import * as THREE from "three";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import { Environment } from "./Environment";
import { PlayerController } from "./PlayerController";
import { ShelfUnit } from "./ShelfUnit";
import { ShelfCases } from "./ShelfCases";
import { CentralDisplay } from "./CentralDisplay";
import { NeonSign } from "./NeonSign";
import { GenreSign } from "./GenreSign";
import { Standee } from "./Standee";
import { SHELF_ISLANDS, WALL_SHELVES, BACK_SHELVES, GENRE_SIGNS, STANDEES, EYE_HEIGHT, PLAYER_START } from "../../data/layout";
import { getMovieById } from "../../data/movies";

const TARGET_HORIZONTAL_FOV_DEG = 82;

function ResponsiveCamera() {
  const { camera, size } = useThree();

  useEffect(() => {
    if (!(camera instanceof THREE.PerspectiveCamera)) return;
    const aspect = size.width / size.height;
    const targetHorizontalFovRad = (TARGET_HORIZONTAL_FOV_DEG * Math.PI) / 180;
    const verticalFovRad = 2 * Math.atan(Math.tan(targetHorizontalFovRad / 2) / aspect);
    const verticalFovDeg = Math.min(85, Math.max(50, (verticalFovRad * 180) / Math.PI));

    camera.fov = verticalFovDeg;
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
  }, [camera, size]);

  return null;
}

function SceneContents() {
  return (
    <>
      <fogExp2 attach="fog" args={["#08070a", 0.03]} />
      <ambientLight intensity={1.0} color="#6b5c42" />
      <hemisphereLight args={["#7a6848", "#100d0a", 1.0]} />

      <Environment />

      {SHELF_ISLANDS.map((box, i) => (
        <ShelfUnit key={`island-${i}`} center={{ x: box.x, z: box.z }} length={box.halfD * 2} axis="z" thickness={box.halfW} />
      ))}
      {WALL_SHELVES.map((box, i) => (
        <ShelfUnit key={`wall-${i}`} center={{ x: box.x, z: box.z }} length={box.halfD * 2} axis="z" thickness={box.halfW} />
      ))}
      {BACK_SHELVES.map((box, i) => (
        <ShelfUnit key={`back-${i}`} center={{ x: box.x, z: box.z }} length={box.halfW * 2} axis="x" thickness={box.halfD} />
      ))}
      <ShelfCases />

      <CentralDisplay />
      <NeonSign />
      {GENRE_SIGNS.map((sign) => (
        <GenreSign key={sign.label} label={sign.label} x={sign.x} z={sign.z} />
      ))}
      {STANDEES.map((s) => {
        const movie = getMovieById(s.movieId);
        if (!movie) return null;
        return <Standee key={s.movieId} movie={movie} x={s.x} z={s.z} rotationY={s.rotationY} />;
      })}

      <PlayerController />
    </>
  );
}

export function StoreScene() {
  return (
    <Canvas
      dpr={1}
      camera={{ fov: 55, near: 0.05, far: 40, position: [PLAYER_START.x, EYE_HEIGHT, PLAYER_START.z] }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
    >
      <color attach="background" args={["#08070a"]} />
      <ResponsiveCamera />
      <Suspense fallback={null}>
        <SceneContents />
      </Suspense>
      <EffectComposer multisampling={0}>
        <Bloom intensity={0.55} luminanceThreshold={0.45} luminanceSmoothing={0.25} radius={0.45} height={240} />
        <Vignette eskil={false} offset={0.18} darkness={0.88} />
      </EffectComposer>
    </Canvas>
  );
}
