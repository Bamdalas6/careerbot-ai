/**
 * Uniform block for the "Glass Liquid" orb shader (public/shaders/liquid-orb.wgsl).
 *
 * Mirrors `struct Uniforms` exactly: 32 leading f32 scalars (size.xy, time and 29
 * controls) followed by 24 vec4<f32> colours — 128 floats / 512 bytes, already a
 * multiple of 16 so no padding is needed.
 *
 * The values below are the tuned preset: a Siri-style liquid wave (style 9) in
 * gold / cyan / pink / violet with the glass shell disabled, so the orb
 * composites straight onto the page background via premultiplied alpha.
 */
export const ORB_UNIFORM_SEED: readonly number[] = [
  1, 1, 0, 0.8399999737739563, 0.30000001192092896, 0.05000000074505806, 5.25, 0,
  2.200000047683716, 0.11999999731779099, 1.2000000476837158, 0.23999999463558197,
  0.18000000715255737, 0.18000000715255737, 2, 9, 0.11999999731779099,
  0.28999999165534973, 0, 0, 0.4399999976158142, 0.6299999952316284, 2,
  0.41999998688697815, 0.7699999809265137, 0.23000000417232513, 65, 0, 0, 1,
  0.2199999988079071, 0.25, 1, 0.8470588326454163, 0.41960784792900085, 1,
  0.5098039507865906, 0.95686274766922, 1, 1, 1, 0.48235294222831726,
  0.8352941274642944, 1, 0.5568627715110779, 0.42352941632270813, 1, 1, 1, 1, 1, 1,
  1, 1, 1, 1, 0.6078431606292725, 0.95686274766922, 1, 1, 0.772549033164978,
  0.6627451181411743, 1, 1, 0.9176470637321472, 0.95686274766922, 1, 1,
  0.8627451062202454, 0.9176470637321472, 1, 1, 0.0117647061124444,
  0.01568627543747425, 0.03529411926865578, 1, 0.3450980484485626,
  0.22745098173618317, 0.13333334028720856, 1, 0.9686274528503418,
  0.9843137264251709, 1, 1, 0.9372549057006836, 0.9647058844566345,
  0.9921568632125854, 1, 0.8784313797950745, 0.9333333373069763, 0.9764705896377563,
  1, 0.8313725590705872, 0.9019607901573181, 0.9686274528503418, 1,
  0.7333333492279053, 0.8352941274642944, 0.9529411792755127, 1, 0.6509804129600525,
  0.7803921699523926, 0.9411764740943909, 1, 0.529411792755127, 0.6901960968971252,
  0.9215686321258545, 1, 0.43529412150382996, 0.6196078658103943,
  0.9098039269447327, 1, 0.43529412150382996, 0.6196078658103943,
  0.9098039269447327, 1, 0.43529412150382996, 0.6196078658103943,
  0.9098039269447327, 1, 0.43529412150382996, 0.6196078658103943,
  0.9098039269447327, 1, 0.43529412150382996, 0.6196078658103943,
  0.9098039269447327, 1,
];

/** Float count of the uniform block. */
export const ORB_UNIFORM_FLOATS = 128;

/** Byte size of the uniform block. */
export const ORB_UNIFORM_BYTES = ORB_UNIFORM_FLOATS * 4;

/** Indices of the fields the render loop animates. */
export const U_SIZE_X = 0;
export const U_SIZE_Y = 1;
export const U_TIME = 2;
export const U_EXPOSURE = 14;
export const U_EDGE_GLOW = 17;

/** Baseline values we modulate away from when the orb reacts to the user. */
export const BASE_EXPOSURE = ORB_UNIFORM_SEED[U_EXPOSURE];
export const BASE_EDGE_GLOW = ORB_UNIFORM_SEED[U_EDGE_GLOW];

/**
 * Frozen timestamp used when the visitor prefers reduced motion — the orb still
 * renders a rich single frame instead of collapsing to nothing.
 */
export const REDUCED_MOTION_TIME = 4.2;

/** URL of the WGSL source, fetched at runtime to keep 55 KB out of the JS bundle. */
export const ORB_SHADER_URL = '/shaders/liquid-orb.wgsl';

export function createOrbUniformData(): Float32Array<ArrayBuffer> {
  // Backed by an explicit ArrayBuffer (never SharedArrayBuffer) so it satisfies
  // GPUAllowSharedBufferSource for queue.writeBuffer.
  const data = new Float32Array(new ArrayBuffer(ORB_UNIFORM_BYTES));
  data.set(ORB_UNIFORM_SEED.slice(0, ORB_UNIFORM_FLOATS));
  return data;
}
