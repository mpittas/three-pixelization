import React, { Suspense, useRef, useState, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { DirectionalLightHelper, HemisphereLightHelper } from "three";
import { EffectComposer, Pixelation } from "@react-three/postprocessing";

// Import the newly created Model component
import Model from "./Model"; // Assuming Model.tsx exports Model as default

export default function MyScene() {
  const directionalLightRef = useRef<THREE.DirectionalLight>(null!);
  const hemisphereLightRef = useRef<THREE.HemisphereLight>(null!);
  const enableDebugHelpers = false;

  // State for model hover (to toggle pixelation)
  const [isModelHovered, setIsModelHovered] = useState(false);

  // State for mouse-following circle
  const canvasContainerRef = useRef<HTMLDivElement>(null!);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isMouseOverCanvas, setIsMouseOverCanvas] = useState(false);

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

    const handleMouseEnter = () => setIsMouseOverCanvas(true);
    const handleMouseLeave = () => setIsMouseOverCanvas(false);

    container.addEventListener("mousemove", handleMouseMove);
    container.addEventListener("mouseenter", handleMouseEnter);
    container.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      container.removeEventListener("mousemove", handleMouseMove);
      container.removeEventListener("mouseenter", handleMouseEnter);
      container.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  const circleStyle: React.CSSProperties = {
    position: "absolute",
    left: `${mousePosition.x}px`,
    top: `${mousePosition.y}px`,
    width: "20px", // Small radius (20px diameter)
    height: "20px",
    borderRadius: "50%",
    backgroundColor: "rgba(200, 200, 200, 0.5)", // Light grey, semi-transparent
    pointerEvents: "none", // So it doesn't interfere with canvas events
    transform: "translate(-50%, -50%)", // Center on cursor
    zIndex: 1000, // Ensure it's on top
    display: isMouseOverCanvas ? "block" : "none",
  };

  // Build effects array for EffectComposer
  const activeEffects = [];
  if (!isModelHovered) {
    activeEffects.push(<Pixelation key="pixelation" granularity={10} />);
  }
  // If you had other effects, you could add them here conditionally or unconditionally
  // e.g., activeEffects.push(<Bloom key="bloom" intensity={0.5} />);

  return (
    <div
      ref={canvasContainerRef}
      style={{
        position: "relative",
        width: "100vw",
        height: "100vh",
        cursor: "none",
      }}
    >
      <Canvas
        shadows="soft"
        gl={{ antialias: true }}
        style={{ display: "block" }} // Ensures canvas takes up the div for mouse events
        camera={{ position: [0, 1, 4], fov: 40 }}
      >
        <ambientLight intensity={2.8} />

        <hemisphereLight
          ref={hemisphereLightRef}
          args={[0xadd8e6, 0x8f8f8f]}
          intensity={5}
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
          intensity={-1}
          shadow-mapSize-width={100}
          shadow-mapSize-height={100}
          shadow-camera-near={4.4}
          shadow-camera-far={10}
          shadow-camera-left={-10}
          shadow-camera-right={10}
          shadow-camera-top={10}
          shadow-camera-bottom={-10}
          shadow-bias={0.5}
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
          <shadowMaterial opacity={0.4} />{" "}
          {/* Adjust opacity for shadow darkness */}
          {/* Or for a visible ground: <meshStandardMaterial color="grey" /> */}
        </mesh>

        <Suspense fallback={null}>
          {/* Use the imported Model component */}
          {/* Pass finalScale if you want to control the target scale from here, e.g., finalScale={1} */}
          <Model
            position={[0, 0, 0]}
            showDebugHelpers={enableDebugHelpers}
            finalScale={1}
            onPointerOver={() => setIsModelHovered(true)}
            onPointerOut={() => setIsModelHovered(false)}
          />
        </Suspense>

        <OrbitControls
          enableZoom={false}
          enablePan={false}
          minPolarAngle={Math.PI / 2}
          maxPolarAngle={Math.PI / 2}
        />

        {/* Render effects from the array. If array is empty, it's fine. */}
        {activeEffects.length > 0 && (
          <EffectComposer>{activeEffects}</EffectComposer>
        )}
      </Canvas>
      <div style={circleStyle} />
    </div>
  );
}
