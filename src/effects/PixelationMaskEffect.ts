import * as THREE from "three";
import { Effect, BlendFunction } from "postprocessing";
import { wrapEffect } from "@react-three/postprocessing";

// Fragment shader for masked pixelation
const fragmentShader = `
  uniform float granularity;
  uniform vec2 mousePosition; // DOM pixel coords, Y is 0 at top
  uniform float circleRadius; // in pixels
  uniform float blurRadius;   // in pixels, for the smoothstep transition edge
  uniform float fisheyeStrength;  // e.g., 0.1 to 0.5
  uniform float edgeWarpAmplitude;// in pixels, e.g., 0.0 to 10.0
  uniform float edgeWarpFrequency;// e.g., 5.0 to 20.0

  void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    vec2 screenSize = resolution; // Shader resolution, Y is height
    vec2 dxy = granularity / screenSize;
    vec2 pixelatedUv = dxy * floor(uv / dxy);
    
    vec2 correctedMousePosition = vec2(mousePosition.x, screenSize.y - mousePosition.y); // Pixel coords
    vec2 fragPixelCoord = uv * screenSize; // Current fragment in pixel coords

    // --- 1. Calculate distance and apply edge warping to it for the mask alpha ---
    vec2 diff_vec_pixels = fragPixelCoord - correctedMousePosition;
    float dist_pixels = length(diff_vec_pixels);

    float warped_dist_for_mask = dist_pixels;
    if (edgeWarpAmplitude > 0.0 && edgeWarpFrequency > 0.0 && dist_pixels > 0.001) {
        float angle = atan(diff_vec_pixels.y, diff_vec_pixels.x);
        float warp_offset = sin(angle * edgeWarpFrequency) * edgeWarpAmplitude;
        warped_dist_for_mask = dist_pixels + warp_offset;
    }

    // Alpha for mixing between original (possibly fisheyed) and pixelated
    // This uses the warped distance, so the mask edge itself is warped.
    float maskAlpha = smoothstep(
        circleRadius - blurRadius, // Inner edge of transition
        circleRadius + blurRadius, // Outer edge of transition
        warped_dist_for_mask
    );

    // --- 2. Calculate UVs for sampling the "original" color, possibly with fisheye ---
    vec2 sample_uv = uv; // Default to current fragment's UV

    // Apply fisheye if the fragment is within the circle's nominal radius
    // and fisheyeStrength is positive.
    if (fisheyeStrength > 0.0 && dist_pixels < circleRadius) {
        vec2 mouse_uv_coords = correctedMousePosition / screenSize; // Mouse position in UV space (0-1)
        vec2 centered_frag_uv = uv - mouse_uv_coords; // Vector from mouse to current fragment in UV space
        float r_uv = length(centered_frag_uv); // Distance from mouse in UV space

        // Strength of fisheye falls off from center to edge of circleRadius
        float normalized_dist_from_center_pixels = clamp(dist_pixels / circleRadius, 0.0, 1.0);
        float current_actual_fisheye_strength = fisheyeStrength * (1.0 - pow(normalized_dist_from_center_pixels, 2.0));

        if (r_uv > 0.0001 && current_actual_fisheye_strength > 0.0) {
            // Fisheye effect: scales the vector from mouse, sampling closer to mouse for magnification.
            vec2 distorted_centered_uv = centered_frag_uv * (1.0 - current_actual_fisheye_strength);
            sample_uv = mouse_uv_coords + distorted_centered_uv;
        }
    }

    // --- 3. Get colors and mix ---
    vec4 originalEffectedColor = texture2D(inputBuffer, sample_uv);
    vec4 pixelatedColor = texture2D(inputBuffer, pixelatedUv);

    float effect_inner_radius = circleRadius - blurRadius;
    float effect_outer_radius = circleRadius + blurRadius;
    float border_thickness = 2.0; // 5 pixel red border

    // Determine if the current pixel is within the border region
    bool is_in_border = warped_dist_for_mask > effect_outer_radius &&
                        warped_dist_for_mask <= effect_outer_radius + border_thickness;

    // Determine if the current pixel is inside the main effect circle (including its blur)
    bool is_inside_effect_circle = warped_dist_for_mask <= effect_outer_radius;

    if (is_in_border) {
        outputColor = vec4(0.8, 0.8, 0.8, 1.0); // Light grey border
    } else if (is_inside_effect_circle) {
        // Alpha for mixing between original (possibly fisheyed) and pixelated
        float mix_alpha = smoothstep(
            effect_inner_radius,
            effect_outer_radius,
            warped_dist_for_mask
        );
        outputColor = mix(originalEffectedColor, pixelatedColor, mix_alpha);
    } else {
        // Outside the border and outside the effect circle, so fully pixelated
        outputColor = pixelatedColor;
    }
  }
`;

// Custom effect for masked pixelation
class PixelationMaskEffectImpl extends Effect {
  constructor({
    granularity = 10,
    mousePosition = new THREE.Vector2(),
    circleRadius = 125,
    blurRadius = 20, // Default from previous edit
    fisheyeStrength = 0.0, // Default to no fisheye
    edgeWarpAmplitude = 0.0, // Default to no warp
    edgeWarpFrequency = 10.0, // Default frequency if amplitude > 0
  }) {
    // Create uniforms with type casting to avoid TypeScript errors
    const uniformsMap = new Map();
    uniformsMap.set("granularity", new THREE.Uniform(granularity));
    uniformsMap.set("mousePosition", new THREE.Uniform(mousePosition));
    uniformsMap.set("circleRadius", new THREE.Uniform(circleRadius));
    uniformsMap.set("blurRadius", new THREE.Uniform(blurRadius));
    uniformsMap.set("fisheyeStrength", new THREE.Uniform(fisheyeStrength));
    uniformsMap.set("edgeWarpAmplitude", new THREE.Uniform(edgeWarpAmplitude));
    uniformsMap.set("edgeWarpFrequency", new THREE.Uniform(edgeWarpFrequency));

    super("PixelationMaskEffect", fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: uniformsMap,
    });
  }

  update(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _renderer: THREE.WebGLRenderer,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _inputBuffer: THREE.WebGLRenderTarget,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _deltaTime: number
  ): void {
    // This method is required for effects that need to update uniforms every frame
  }
}

// Wrap the effect so it can be used as a JSX component
export const PixelationMaskEffect = wrapEffect(PixelationMaskEffectImpl);
