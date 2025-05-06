import { Suspense, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { DirectionalLightHelper, HemisphereLightHelper } from "three";

// Import the newly created Model component
import Model from "./Model"; // Assuming Model.tsx exports Model as default

export default function MyScene() {
  const directionalLightRef = useRef<THREE.DirectionalLight>(null!);
  const hemisphereLightRef = useRef<THREE.HemisphereLight>(null!);
  const enableDebugHelpers = false;

  return (
    <Canvas
      shadows="soft"
      gl={{ antialias: true }}
      style={{ height: "100vh", width: "100vw", backgroundColor: "#d3eae0" }}
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
            new DirectionalLightHelper(directionalLightRef.current, 1, 0xff0000)
          }
        />
      )}

      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]}>
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
        />
      </Suspense>

      <OrbitControls
        enableZoom={false}
        enablePan={false}
        minPolarAngle={Math.PI / 2}
        maxPolarAngle={Math.PI / 2}
      />
    </Canvas>
  );
}
