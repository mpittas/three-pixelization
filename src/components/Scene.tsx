import { Suspense, useRef, useState, useEffect, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { DirectionalLightHelper, HemisphereLightHelper } from "three";
import { EffectComposer, wrapEffect } from "@react-three/postprocessing";
import { Effect, BlendFunction } from "postprocessing";

// Import the newly created Model component
import Model from "./Model"; // Assuming Model.tsx exports Model as default

// Fragment shader for masked pixelation
const fragmentShader = `
  uniform float granularity;
  uniform vec2 mousePosition; // DOM pixel coords, Y is 0 at top
  uniform float isModelHovered;
  uniform float circleRadius; // in pixels

  void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    vec2 screenSize = resolution; // Shader resolution, Y is height
    vec2 dxy = granularity / screenSize;
    vec2 pixelatedUv = dxy * floor(uv / dxy);
    
    // Correct mouse Y-coordinate: DOM Y is top-down, shader UV/pixel Y is bottom-up
    vec2 correctedMousePosition = vec2(mousePosition.x, screenSize.y - mousePosition.y);
    
    // Fragment's coordinate in pixels (origin bottom-left)
    vec2 fragPixelCoord = uv * screenSize;
    
    // Calculate distance directly in pixel space
    float dist = distance(fragPixelCoord, correctedMousePosition);
    
    // Define border width (in pixels)
    float borderWidth = 0.0;
    
    // Check if pixel is within the border area
    bool isInBorder = dist > circleRadius - borderWidth && dist < circleRadius;
    
    if (isModelHovered > 0.5) {
      if (isInBorder) {
        // Draw white border when hovering model
        outputColor = vec4(1.0, 1.0, 1.0, 1.0);
      } else if (dist < circleRadius) {
        // Inside circle (not border) - no pixelation
        outputColor = texture2D(inputBuffer, uv);
      } else {
        // Outside circle - apply pixelation
        outputColor = texture2D(inputBuffer, pixelatedUv);
      }
    } else {
      // Not hovering model - apply pixelation everywhere
      outputColor = texture2D(inputBuffer, pixelatedUv);
    }
  }
`;

// Custom effect for masked pixelation
class PixelationMaskEffectImpl extends Effect {
  constructor({
    granularity = 10,
    mousePosition = new THREE.Vector2(),
    isModelHovered = false,
    circleRadius = 125,
  }) {
    // Create uniforms with type casting to avoid TypeScript errors
    const uniformsMap = new Map();
    uniformsMap.set("granularity", new THREE.Uniform(granularity));
    uniformsMap.set("mousePosition", new THREE.Uniform(mousePosition));
    uniformsMap.set(
      "isModelHovered",
      new THREE.Uniform(isModelHovered ? 1.0 : 0.0)
    );
    uniformsMap.set("circleRadius", new THREE.Uniform(circleRadius));

    super("PixelationMaskEffect", fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: uniformsMap,
    });
  }

  update(
    _renderer: THREE.WebGLRenderer,
    _inputBuffer: THREE.WebGLRenderTarget,
    _deltaTime: number
  ): void {
    // This method is required for effects that need to update uniforms every frame
  }
}

// Wrap the effect so it can be used as a JSX component
const PixelationMaskEffect = wrapEffect(PixelationMaskEffectImpl);

export default function MyScene() {
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

        <EffectComposer>
          <PixelationMaskEffect
            granularity={10}
            mousePosition={mousePositionVec2}
            isModelHovered={isModelHovered}
            circleRadius={125} // Half the diameter (250/2)
          />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
