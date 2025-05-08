import { useMemo, useRef, useState, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import type { ThreeElements, ThreeEvent } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

// Animation Parameters for Pop/Bounce Effect
const INITIAL_ANIMATION_SCALE = 0.01;
const OVERSHOOT_SCALE_FACTOR = 1.05;
const OVERSHOOT_DURATION = 0.25;
const SETTLE_DURATION = 0.2;
const TOTAL_ANIMATION_DURATION = OVERSHOOT_DURATION + SETTLE_DURATION;

// Default Easing Function: Ease-out quadratic
const easeOutQuad = (t: number) => t * (2 - t);
// Custom easing for the settle phase (can be same as easeOutQuad or different)
const easeInOuQuad = (t: number) =>
  t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

// Define explicit props for clarity, extend with R3FGroupProps for standard group attributes
interface ModelOwnProps {
  modelPath: string; // Path to the .glb model file
  showDebugHelpers?: boolean;
  // finalScale is the target scale after animation. If not provided, defaults to 1 in logic below.
  finalScale?: number | [number, number, number];
  // Add onPointerOver and onPointerOut for hover detection on bounding box
  onPointerOver?: (event: ThreeEvent<PointerEvent>) => void;
  onPointerOut?: (event: ThreeEvent<PointerEvent>) => void;
  onModelLoaded?: () => void; // New prop for loading indication
  isMobile?: boolean; // To control rotation pause behavior
}

// Combine our own props with standard R3F group props (from JSX.IntrinsicElements)
// Omit 'scale' as we manage it internally for animation.
type ModelCombinedProps = ModelOwnProps &
  Omit<ThreeElements["group"], "scale" | "onPointerOver" | "onPointerOut">;

export function Model(props: ModelCombinedProps) {
  const { scene: loadedGLTFScene } = useGLTF(props.modelPath);
  const { onModelLoaded, isMobile } = props; // Destructure isMobile

  const [animatedScale, setAnimatedScale] = useState(INITIAL_ANIMATION_SCALE);
  const [isAutoRotationPaused, setIsAutoRotationPaused] = useState(false); // New state for pausing rotation
  const animationCompletedRef = useRef(false);
  const animationTimeRef = useRef(0);
  const groupRef = useRef<THREE.Group>(null!);

  // Determine the target for the animation of `animatedScale`.
  let targetScaleValueForAnimationLogic: number;
  if (Array.isArray(props.finalScale)) {
    // If finalScale is an array, group's scale is set directly by its values * fitScale.
    // animatedScale is not used for the final scale in this case.
    // For the animation's overshoot calculation, use the first element or default to 1.
    targetScaleValueForAnimationLogic = props.finalScale[0] ?? 1.0;
  } else if (typeof props.finalScale === "number") {
    // If finalScale is a number, use it as the animation target.
    // This allows the per-model scale from App.tsx to affect the final size.
    targetScaleValueForAnimationLogic = props.finalScale;
  } else {
    // If finalScale is undefined (or not a number/array), default to 1.0.
    targetScaleValueForAnimationLogic = 1.0;
  }

  const actualOvershootScale =
    targetScaleValueForAnimationLogic * OVERSHOOT_SCALE_FACTOR;

  // Store bounding box dimensions for the invisible hover mesh
  const boundingBoxDimensions = useRef<{
    size: THREE.Vector3;
    center: THREE.Vector3;
    fitScale: number;
  } | null>(null);

  useEffect(() => {
    if (loadedGLTFScene && onModelLoaded) {
      onModelLoaded();
    }

    // Handle global pointer up to ensure rotation resumes if mouse is released outside the model
    const handleGlobalPointerUp = (event: PointerEvent) => {
      if (event.button === 0) {
        // Left mouse button
        setIsAutoRotationPaused(false);
      }
    };

    window.addEventListener("pointerup", handleGlobalPointerUp);

    return () => {
      window.removeEventListener("pointerup", handleGlobalPointerUp);
    };
  }, [loadedGLTFScene, onModelLoaded]);

  useFrame((_, delta) => {
    // --- Scale Animation Logic (Simplified) ---
    if (!animationCompletedRef.current && loadedGLTFScene) {
      animationTimeRef.current += delta;
      let currentVal = animatedScale;
      const totalProgress = Math.min(
        animationTimeRef.current / TOTAL_ANIMATION_DURATION,
        1
      );

      if (animationTimeRef.current <= OVERSHOOT_DURATION) {
        // Overshoot phase
        const overshootProgress = Math.min(
          animationTimeRef.current / OVERSHOOT_DURATION,
          1
        );
        const easedProgress = easeOutQuad(overshootProgress);
        currentVal =
          INITIAL_ANIMATION_SCALE +
          (actualOvershootScale - INITIAL_ANIMATION_SCALE) * easedProgress;
      } else {
        // Settle phase (time relative to start of settle phase)
        const settleTime = animationTimeRef.current - OVERSHOOT_DURATION;
        const settleProgress = Math.min(settleTime / SETTLE_DURATION, 1);
        // Using a different easing for the settle part for a more distinct bounce
        const easedProgress = easeInOuQuad(settleProgress);
        currentVal =
          actualOvershootScale +
          (targetScaleValueForAnimationLogic - actualOvershootScale) *
            easedProgress;
      }

      if (totalProgress >= 1) {
        animationCompletedRef.current = true;
        currentVal = targetScaleValueForAnimationLogic; // Ensure final scale is exact
      }
      setAnimatedScale(currentVal);
    }
    // --- End Scale Animation Logic ---

    // --- Constant Rotation Logic ---
    if (groupRef.current && !isAutoRotationPaused) {
      // Check isAutoRotationPaused
      groupRef.current.rotation.y += delta * 0.5;
    }
  });

  const centeredModelNode = useMemo(() => {
    if (!loadedGLTFScene) return null;
    const modelNode = loadedGLTFScene.clone();
    const box = new THREE.Box3().setFromObject(modelNode);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    // Calculate fitScale so the largest dimension is 2 units
    const maxDim = Math.max(size.x, size.y, size.z);
    const fitScale = maxDim > 0 ? 2 / maxDim : 1;

    // Store dimensions for the hover box
    boundingBoxDimensions.current = { size, center: center.clone(), fitScale };

    modelNode.position.sub(center);
    modelNode.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = true;
      }
    });
    return modelNode;
  }, [loadedGLTFScene]);

  const boxHelper = useMemo(() => {
    if (centeredModelNode) {
      const helper = new THREE.BoxHelper(centeredModelNode, 0xffff00);
      return helper;
    }
    return null;
  }, [centeredModelNode]);

  if (!centeredModelNode || !boundingBoxDimensions.current) {
    return null;
  }

  // Destructure our own props, rest are standard group props to be spread
  const {
    showDebugHelpers,
    finalScale,
    modelPath,
    onPointerOver,
    onPointerOut,
    ...restGroupProps
  } = props;

  // Calculate the group scale, always as a 3-element array
  let groupScale: [number, number, number] = [1, 1, 1];
  if (boundingBoxDimensions.current) {
    const fitScale = boundingBoxDimensions.current.fitScale;
    if (Array.isArray(finalScale)) {
      groupScale = [
        (finalScale[0] ?? 1) * fitScale,
        (finalScale[1] ?? 1) * fitScale,
        (finalScale[2] ?? 1) * fitScale,
      ];
    } else {
      groupScale = [
        animatedScale * fitScale,
        animatedScale * fitScale,
        animatedScale * fitScale,
      ];
    }
  }

  return (
    <group {...restGroupProps} scale={groupScale} ref={groupRef}>
      {/* Invisible mesh for bounding box hover detection */}
      {boundingBoxDimensions.current && (
        <mesh
          position={[0, 0, 0]}
          onPointerOver={onPointerOver}
          onPointerOut={onPointerOut}
          onPointerDown={(event: ThreeEvent<PointerEvent>) => {
            if (event.button === 0 && !isMobile) {
              // Only pause if not mobile
              // Left mouse button
              event.stopPropagation(); // Prevent OrbitControls if needed, and other higher-level events
              setIsAutoRotationPaused(true);
            }
          }}
          // onPointerUp is handled globally now
        >
          <boxGeometry
            args={[
              boundingBoxDimensions.current.size.x,
              boundingBoxDimensions.current.size.y,
              boundingBoxDimensions.current.size.z,
            ]}
          />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      )}

      <primitive object={centeredModelNode} />
      {showDebugHelpers && boxHelper && <primitive object={boxHelper} />}
    </group>
  );
}

export default Model;
