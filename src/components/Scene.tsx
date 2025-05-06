import { Suspense, useMemo, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { DirectionalLightHelper, HemisphereLightHelper } from "three";

// Component to load and display your 3D model
function Model(props: any & { showDebugHelpers?: boolean }) {
  const { scene: loadedGLTFScene } = useGLTF("/model.glb");

  // This useMemo hook processes the model once it's loaded.
  // It centers the model by adjusting its position.
  const centeredModelNode = useMemo(() => {
    if (!loadedGLTFScene) return null;

    // Calculate bounding box and center of the loaded model
    // We operate on a clone to avoid issues if the scene is used elsewhere or for clean re-computation,
    // though useGLTF usually provides a fresh scene. For this purpose, direct modification is okay too.
    // For this example, let's directly modify the loadedGLTFScene.
    const modelNode = loadedGLTFScene;

    const box = new THREE.Box3().setFromObject(modelNode);
    const center = box.getCenter(new THREE.Vector3());

    // Apply the offset to the model's position.
    // This effectively moves the model's geometric center to its local origin (0,0,0)
    // relative to its parent in this component (the <group>).
    modelNode.position.sub(center);

    return modelNode; // Return the modified node
  }, [loadedGLTFScene]);

  // The BoxHelper is created for the centered model node.
  const boxHelper = useMemo(() => {
    if (centeredModelNode) {
      // The helper is for the 'centeredModelNode' whose position is now adjusted.
      // It will be relative to the parent group this Model component renders.
      const helper = new THREE.BoxHelper(centeredModelNode, 0xffff00); // Yellow color
      return helper;
    }
    return null;
  }, [centeredModelNode]);

  if (!centeredModelNode) {
    return null; // Model not loaded or processed yet
  }

  // The outer <group> receives any position/scale props passed to <Model />.
  // The <primitive object={centeredModelNode} /> renders the model, which is now
  // internally centered. Its own position (relative to the group) is the adjustment we made.
  return (
    <group {...props}>
      <primitive object={centeredModelNode} />
      {/* Conditionally render BoxHelper based on prop */}
      {props.showDebugHelpers && boxHelper && <primitive object={boxHelper} />}
    </group>
  );
}

export default function MyScene() {
  const directionalLightRef = useRef<THREE.DirectionalLight>(null!);
  const hemisphereLightRef = useRef<THREE.HemisphereLight>(null!);

  // Single toggle for all debug helpers
  const enableDebugHelpers = false; // Set to false to hide all helpers

  return (
    <Canvas
      style={{ height: "100vh", width: "100vw", backgroundColor: "#d3eae0" }}
      camera={{ position: [0, 1, 4], fov: 40 }}
    >
      <ambientLight intensity={0.8} />

      <hemisphereLight
        ref={hemisphereLightRef}
        args={[0xadd8e6, 0x8f8f8f]}
        intensity={3}
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
        position={[2, 3, 2]}
        intensity={1.3}
      />
      {enableDebugHelpers && directionalLightRef.current && (
        <primitive
          object={
            new DirectionalLightHelper(directionalLightRef.current, 1, 0xff0000)
          }
        />
      )}

      {/* Suspense is needed because useGLTF loads the model asynchronously */}
      <Suspense fallback={null}>
        {/* Pass enableDebugHelpers to the Model component */}
        <Model
          scale={1}
          position={[0, 0, 0]}
          showDebugHelpers={enableDebugHelpers}
        />
      </Suspense>

      {/* OrbitControls allow you to rotate, pan, and zoom the camera */}
      <OrbitControls
        enableZoom={false}
        enablePan={false}
        minPolarAngle={Math.PI / 2}
        maxPolarAngle={Math.PI / 2}
      />
    </Canvas>
  );
}
