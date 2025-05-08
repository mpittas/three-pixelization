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
  onModelLoaded?: () => void;
}

export default function MyScene({
  currentModelPath,
  currentModelScale,
  onModelLoaded,
}: MySceneProps) {
  const directionalLightRef = useRef<THREE.DirectionalLight>(null!);
  const hemisphereLightRef = useRef<THREE.HemisphereLight>(null!);
  const enableDebugHelpers = false;

  // State for mouse-following circle
  const canvasContainerRef = useRef<HTMLDivElement>(null!);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isMobile, setIsMobile] = useState(false);

  // Create memoized mouse position for shader
  const mousePositionVec2 = useMemo(
    () => new THREE.Vector2(mousePosition.x, mousePosition.y),
    [mousePosition.x, mousePosition.y]
  );

  const dpr =
    typeof window !== "undefined"
      ? Math.max(1, Math.min(2, window.devicePixelRatio || 1))
      : 1;

  useEffect(() => {
    const container = canvasContainerRef.current;
    if (!container) return;

    // Function to update isMobile state and set initial position if mobile
    const handleResizeOrInit = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (mobile) {
        // Set initial position for the circle on mobile.
        // If a touch starts, it will override this.
        const rect = container.getBoundingClientRect();
        setMousePosition({
          x: (rect.width / 2) * dpr,
          y: (rect.height / 2) * dpr,
        });
      }
    };

    // Handler for mouse movement (desktop)
    const handleMouseMove = (event: MouseEvent) => {
      if (!isMobile) {
        // Check the state variable, not window.innerWidth directly
        const rect = container.getBoundingClientRect();
        setMousePosition({
          x: (event.clientX - rect.left) * dpr,
          y: (event.clientY - rect.top) * dpr,
        });
      }
    };

    // Handler for touch events (mobile)
    const handleTouch = (event: TouchEvent) => {
      if (isMobile && event.touches.length > 0) {
        // Check the state variable
        const touch = event.touches[0];
        const rect = container.getBoundingClientRect();
        setMousePosition({
          x: (touch.clientX - rect.left) * dpr,
          y: (touch.clientY - rect.top) * dpr,
        });
      }
    };

    // Initial setup
    handleResizeOrInit();

    // Add event listeners
    window.addEventListener("resize", handleResizeOrInit);
    container.addEventListener("mousemove", handleMouseMove);
    // Use { passive: true } for touch events to potentially improve scroll performance
    container.addEventListener("touchstart", handleTouch, { passive: true });
    container.addEventListener("touchmove", handleTouch, { passive: true });

    // Cleanup
    return () => {
      window.removeEventListener("resize", handleResizeOrInit);
      container.removeEventListener("mousemove", handleMouseMove);
      container.removeEventListener("touchstart", handleTouch);
      container.removeEventListener("touchmove", handleTouch);
    };
  }, [dpr, isMobile]); // Added isMobile to dependency array

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
            onModelLoaded={onModelLoaded}
            isMobile={isMobile}
          />
        </Suspense>

        <OrbitControls
          target={[0, 0, 0]}
          enableZoom={false}
          enablePan={false}
          enableRotate={!isMobile}
          minPolarAngle={Math.PI / 2}
          maxPolarAngle={Math.PI / 2}
        />

        <EffectComposer>
          <PixelationMaskEffect
            granularity={15 * dpr}
            mousePosition={mousePositionVec2}
            circleRadius={isMobile ? 110 * dpr : 135 * dpr} // User's preferred mobile radius
            blurRadius={isMobile ? 0.0 : 20.0 * dpr} // Corrected to number, 0 for mobile sharp edge
            fisheyeStrength={0.1}
            edgeWarpAmplitude={isMobile ? 3.0 * dpr : 6.0 * dpr}
            edgeWarpFrequency={0.0}
          />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
