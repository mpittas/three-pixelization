import * as THREE from "three";
import { Effect, BlendFunction } from "postprocessing";
import { wrapEffect } from "@react-three/postprocessing";

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
    float borderWidth = 4.0;
    
    // Check if pixel is within the border area
    bool isInBorder = dist > circleRadius - borderWidth && dist < circleRadius;
    
    if (isModelHovered > 0.5) {
      if (isInBorder && borderWidth > 0.0) { // Only draw border if width > 0
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
export const PixelationMaskEffect = wrapEffect(PixelationMaskEffectImpl);
