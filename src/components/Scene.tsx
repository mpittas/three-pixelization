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
  const [isDraggingMask, setIsDraggingMask] = useState(false);
  const hasDraggedInCurrentMobileSession = useRef(false);
  const prevIsMobileStateRef = useRef(isMobile); // To detect transition to mobile

  // Create memoized mouse position for shader
  const mousePositionVec2 = useMemo(
    () => new THREE.Vector2(mousePosition.x, mousePosition.y),
    [mousePosition.x, mousePosition.y]
  );

  const dpr =
    typeof window !== "undefined"
      ? Math.max(1, Math.min(2, window.devicePixelRatio || 1))
      : 1;

  // Effect 1: Manages isMobile state based on window resize
  useEffect(() => {
    const handleResize = () => {
      const currentActualMobile = window.innerWidth <= 768;
      if (currentActualMobile !== isMobile) {
        setIsMobile(currentActualMobile);
      }
    };
    handleResize(); // Initial check
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isMobile]); // Dependency ensures it can react if isMobile is set elsewhere

  // Effect 2: Detects transition from desktop to mobile to reset drag flag
  useEffect(() => {
    if (isMobile && !prevIsMobileStateRef.current) {
      // Just transitioned from desktop (false) to mobile (true)
      hasDraggedInCurrentMobileSession.current = false;
    }
    prevIsMobileStateRef.current = isMobile; // Update ref after check for next render
  }, [isMobile]);

  // Effect 3: Main effect for listeners and initial/conditional centering
  useEffect(() => {
    const container = canvasContainerRef.current;
    if (!container) return;

    // Initial/Conditional Centering Logic
    if (
      isMobile &&
      !hasDraggedInCurrentMobileSession.current &&
      !isDraggingMask
    ) {
      const rect = container.getBoundingClientRect();
      setMousePosition({
        x: (rect.width / 2) * dpr,
        y: (rect.height / 2) * dpr,
      });
    }

    const getShaderCircleRadius = () => {
      return isMobile ? 110 * dpr : 135 * dpr;
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (!isMobile) {
        const rect = container.getBoundingClientRect();
        setMousePosition({
          x: (event.clientX - rect.left) * dpr,
          y: (event.clientY - rect.top) * dpr,
        });
      }
    };

    const handleTouchStart = (event: TouchEvent) => {
      if (isMobile && event.touches.length > 0) {
        const touch = event.touches[0];
        const rect = container.getBoundingClientRect();
        const touchX = (touch.clientX - rect.left) * dpr;
        const touchY = (touch.clientY - rect.top) * dpr;

        const distance = Math.sqrt(
          Math.pow(touchX - mousePosition.x, 2) +
            Math.pow(touchY - mousePosition.y, 2)
        );
        const shaderRadius = getShaderCircleRadius();

        if (distance <= shaderRadius) {
          setIsDraggingMask(true);
          setMousePosition({ x: touchX, y: touchY });
          hasDraggedInCurrentMobileSession.current = true; // Mark that a drag has occurred
        }
      }
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (isMobile && isDraggingMask && event.touches.length > 0) {
        const touch = event.touches[0];
        const rect = container.getBoundingClientRect();
        setMousePosition({
          x: (touch.clientX - rect.left) * dpr,
          y: (touch.clientY - rect.top) * dpr,
        });
      }
    };

    const handleTouchEnd = () => {
      if (isMobile) {
        setIsDraggingMask(false);
      }
    };

    container.addEventListener("mousemove", handleMouseMove);
    container.addEventListener("touchstart", handleTouchStart, {
      passive: true,
    });
    container.addEventListener("touchmove", handleTouchMove, { passive: true });
    container.addEventListener("touchend", handleTouchEnd);
    container.addEventListener("touchcancel", handleTouchEnd);

    return () => {
      container.removeEventListener("mousemove", handleMouseMove);
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
      container.removeEventListener("touchend", handleTouchEnd);
      container.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, [dpr, isMobile, isDraggingMask, mousePosition.x, mousePosition.y]);

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
            circleRadius={isMobile ? 110 * dpr : 135 * dpr}
            blurRadius="0"
            fisheyeStrength={0.05}
            edgeWarpAmplitude={isMobile ? 3.0 * dpr : 6.0 * dpr}
            edgeWarpFrequency={0.0}
          />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
