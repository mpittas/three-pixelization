import { Suspense, useRef, useState, useEffect, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment } from "@react-three/drei";
import * as THREE from "three";
import { DirectionalLightHelper, HemisphereLightHelper } from "three";
import { EffectComposer } from "@react-three/postprocessing";

// Import the newly created Model component
import Model from "./Model"; // Assuming Model.tsx exports Model as default
import { PixelationMaskEffect } from "../effects/PixelationMaskEffect"; // Import the effect

interface MySceneProps {
  currentModelPath: string;
  currentModelScale: number;
}

export default function MyScene({
  currentModelPath,
  currentModelScale,
}: MySceneProps) {
  const directionalLightRef = useRef<THREE.DirectionalLight>(null!);
  const hemisphereLightRef = useRef<THREE.HemisphereLight>(null!);
  const enableDebugHelpers = false;

  // State for model hover (to toggle pixelation)
  const [isModelHovered, setIsModelHovered] = useState(false);

  // State for mouse-following circle
  const canvasContainerRef = useRef<HTMLDivElement>(null!);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // Create memoized mouse position for shader
  const mousePositionVec2 = useMemo(
    () => new THREE.Vector2(mousePosition.x, mousePosition.y),
    [mousePosition.x, mousePosition.y]
  );

  useEffect(() => {
    const container = canvasContainerRef.current;
    if (!container) return;

    const handleMouseMove = (event: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      setMousePosition({
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      });
    };

    container.addEventListener("mousemove", handleMouseMove);

    return () => {
      container.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  return (
    <div
      ref={canvasContainerRef}
      style={{
        position: "relative",
        width: "100vw",
        height: "100vh",
        // cursor: "none", // Removed to show original mouse cursor
      }}
    >
      <Canvas
        shadows="soft"
        gl={{ antialias: true }}
        style={{ display: "block", backgroundColor: "#eee" }} // Ensures canvas takes up the div for mouse events
        camera={{ position: [0, 1, 4], fov: 42 }}
      >
        <Environment preset="city" />

        <ambientLight intensity={0.2} />

        <hemisphereLight
          ref={hemisphereLightRef}
          args={[0xadd8e6, 0x8f8f8f]}
          intensity={0.2}
        />
        {enableDebugHelpers && hemisphereLightRef.current && (
          <primitive
            object={
              new HemisphereLightHelper(hemisphereLightRef.current, 1, 0x0000ff)
            }
          />
        )}

        <directionalLight
          ref={directionalLightRef}
          castShadow
          position={[1.5, 3, 2]}
          intensity={1.0}
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-camera-near={4.4}
          shadow-camera-far={10}
          shadow-camera-left={-10}
          shadow-camera-right={10}
          shadow-camera-top={10}
          shadow-camera-bottom={-10}
          shadow-bias={-0.005}
        />
        {enableDebugHelpers && directionalLightRef.current && (
          <primitive
            object={
              new DirectionalLightHelper(
                directionalLightRef.current,
                1,
                0xff0000
              )
            }
          />
        )}

        <mesh
          receiveShadow
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, -1, 0]}
        >
          {" "}
          {/* Adjust Y based on your model */}
          <planeGeometry args={[20, 20]} />
          <shadowMaterial opacity={0.1} />{" "}
          {/* Adjust opacity for shadow darkness */}
          {/* Or for a visible ground: <meshStandardMaterial color="grey" /> */}
        </mesh>

        <Suspense fallback={null}>
          {/* Use the imported Model component */}
          {/* Pass finalScale if you want to control the target scale from here, e.g., finalScale={1} */}
          <Model
            key={currentModelPath}
            modelPath={currentModelPath}
            position={[0, 0.0, 0]}
            showDebugHelpers={enableDebugHelpers}
            finalScale={currentModelScale}
            onPointerOver={() => setIsModelHovered(true)}
            onPointerOut={() => setIsModelHovered(false)}
          />
        </Suspense>

        <OrbitControls
          target={[0, -0.2, 0]}
          enableZoom={false}
          enablePan={false}
          minPolarAngle={Math.PI / 2}
          maxPolarAngle={Math.PI / 2}
        />

        <EffectComposer>
          <PixelationMaskEffect
            granularity={10}
            mousePosition={mousePositionVec2}
            isModelHovered={isModelHovered}
            circleRadius={100} // Increased radius for a bier mask
          />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
