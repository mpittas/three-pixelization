import { useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import type { ThreeElements } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

// Animation Parameters for Pop/Bounce Effect
const INITIAL_ANIMATION_SCALE = 0.01;
const OVERSHOOT_SCALE_FACTOR = 1.05;
const OVERSHOOT_DURATION = 0.25;
const SETTLE_DURATION = 0.2;

// Default Easing Function: Ease-out quadratic
const easeOutQuad = (t: number) => t * (2 - t);

// Define explicit props for clarity, extend with R3FGroupProps for standard group attributes
interface ModelOwnProps {
  showDebugHelpers?: boolean;
  // finalScale is the target scale after animation. If not provided, defaults to 1 in logic below.
  finalScale?: number | [number, number, number];
}

// Combine our own props with standard R3F group props (from JSX.IntrinsicElements)
// Omit 'scale' as we manage it internally for animation.
type ModelCombinedProps = ModelOwnProps & Omit<ThreeElements["group"], "scale">;

export function Model(props: ModelCombinedProps) {
  const { scene: loadedGLTFScene } = useGLTF("/model.glb");

  const [animatedScale, setAnimatedScale] = useState(INITIAL_ANIMATION_SCALE);
  const animationPhaseRef = useRef<"overshoot" | "settle" | "done">(
    "overshoot"
  );
  const elapsedTimeInPhaseRef = useRef(0);
  const groupRef = useRef<THREE.Group>(null!);

  // Determine final target scale based on finalScale prop, defaulting to 1
  let targetScaleValue = 1;
  if (typeof props.finalScale === "number") {
    targetScaleValue = props.finalScale;
  } else if (Array.isArray(props.finalScale)) {
  }

  const actualOvershootScale = targetScaleValue * OVERSHOOT_SCALE_FACTOR;

  useFrame((_, delta) => {
    // --- Scale Animation Logic ---
    if (animationPhaseRef.current !== "done" && loadedGLTFScene) {
      elapsedTimeInPhaseRef.current += delta;
      let currentVal = animatedScale;

      if (animationPhaseRef.current === "overshoot") {
        const progress = Math.min(
          elapsedTimeInPhaseRef.current / OVERSHOOT_DURATION,
          1
        );
        const easedProgress = easeOutQuad(progress);
        currentVal =
          INITIAL_ANIMATION_SCALE +
          (actualOvershootScale - INITIAL_ANIMATION_SCALE) * easedProgress;
        if (progress >= 1) {
          animationPhaseRef.current = "settle";
          elapsedTimeInPhaseRef.current = 0;
          currentVal = actualOvershootScale;
        }
      } else if (animationPhaseRef.current === "settle") {
        const progress = Math.min(
          elapsedTimeInPhaseRef.current / SETTLE_DURATION,
          1
        );
        const easedProgress = easeOutQuad(progress);
        currentVal =
          actualOvershootScale +
          (targetScaleValue - actualOvershootScale) * easedProgress;
        if (progress >= 1) {
          animationPhaseRef.current = "done";
          currentVal = targetScaleValue;
        }
      }
      setAnimatedScale(currentVal);
    }
    // --- End Scale Animation Logic ---

    // --- Constant Rotation Logic ---
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.5;
    }
  });

  const centeredModelNode = useMemo(() => {
    if (!loadedGLTFScene) return null;
    const modelNode = loadedGLTFScene.clone();
    const box = new THREE.Box3().setFromObject(modelNode);
    const center = box.getCenter(new THREE.Vector3());
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

  if (!centeredModelNode) {
    return null;
  }

  // Destructure our own props, rest are standard group props to be spread
  const { showDebugHelpers, finalScale, ...restGroupProps } = props;

  return (
    <group {...restGroupProps} scale={animatedScale} ref={groupRef}>
      <primitive object={centeredModelNode} />
      {showDebugHelpers && boxHelper && <primitive object={boxHelper} />}
    </group>
  );
}

export default Model;
