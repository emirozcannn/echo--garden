// Perlin Noise Implementation
// Based on Ken Perlin's improved noise algorithm

// Permutation table
const permutation = [
  151, 160, 137, 91, 90, 15, 131, 13, 201, 95, 96, 53, 194, 233, 7, 225,
  140, 36, 103, 30, 69, 142, 8, 99, 37, 240, 21, 10, 23, 190, 6, 148,
  247, 120, 234, 75, 0, 26, 197, 62, 94, 252, 219, 203, 117, 35, 11, 32,
  57, 177, 33, 88, 237, 149, 56, 87, 174, 20, 125, 136, 171, 168, 68, 175,
  74, 165, 71, 134, 139, 48, 27, 166, 77, 146, 158, 231, 83, 111, 229, 122,
  60, 211, 133, 230, 220, 105, 92, 41, 55, 46, 245, 40, 244, 102, 143, 54,
  65, 25, 63, 161, 1, 216, 80, 73, 209, 76, 132, 187, 208, 89, 18, 169,
  200, 196, 135, 130, 116, 188, 159, 86, 164, 100, 109, 198, 173, 186, 3, 64,
  52, 217, 226, 250, 124, 123, 5, 202, 38, 147, 118, 126, 255, 82, 85, 212,
  207, 206, 59, 227, 47, 16, 58, 17, 182, 189, 28, 42, 223, 183, 170, 213,
  119, 248, 152, 2, 44, 154, 163, 70, 221, 153, 101, 155, 167, 43, 172, 9,
  129, 22, 39, 253, 19, 98, 108, 110, 79, 113, 224, 232, 178, 185, 112, 104,
  218, 246, 97, 228, 251, 34, 242, 193, 238, 210, 144, 12, 191, 179, 162, 241,
  81, 51, 145, 235, 249, 14, 239, 107, 49, 192, 214, 31, 181, 199, 106, 157,
  184, 84, 204, 176, 115, 121, 50, 45, 127, 4, 150, 254, 138, 236, 205, 93,
  222, 114, 67, 29, 24, 72, 243, 141, 128, 195, 78, 66, 215, 61, 156, 180
];

// Double permutation to avoid overflow
const p = new Array(512);
for (let i = 0; i < 512; i++) {
  p[i] = permutation[i % 256];
}

function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function lerp(t: number, a: number, b: number): number {
  return a + t * (b - a);
}

function grad(hash: number, x: number, y: number, z: number): number {
  const h = hash & 15;
  const u = h < 8 ? x : y;
  const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
  return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
}

export function perlin3D(x: number, y: number, z: number): number {
  const X = Math.floor(x) & 255;
  const Y = Math.floor(y) & 255;
  const Z = Math.floor(z) & 255;

  x -= Math.floor(x);
  y -= Math.floor(y);
  z -= Math.floor(z);

  const u = fade(x);
  const v = fade(y);
  const w = fade(z);

  const A = p[X] + Y;
  const AA = p[A] + Z;
  const AB = p[A + 1] + Z;
  const B = p[X + 1] + Y;
  const BA = p[B] + Z;
  const BB = p[B + 1] + Z;

  return lerp(
    w,
    lerp(
      v,
      lerp(u, grad(p[AA], x, y, z), grad(p[BA], x - 1, y, z)),
      lerp(u, grad(p[AB], x, y - 1, z), grad(p[BB], x - 1, y - 1, z))
    ),
    lerp(
      v,
      lerp(u, grad(p[AA + 1], x, y, z - 1), grad(p[BA + 1], x - 1, y, z - 1)),
      lerp(u, grad(p[AB + 1], x, y - 1, z - 1), grad(p[BB + 1], x - 1, y - 1, z - 1))
    )
  );
}

export function perlin2D(x: number, y: number): number {
  return perlin3D(x, y, 0);
}

// Fractal Brownian Motion - multiple octaves of noise
export function fbm(
  x: number,
  y: number,
  octaves: number = 6,
  lacunarity: number = 2,
  gain: number = 0.5
): number {
  let value = 0;
  let amplitude = 1;
  let frequency = 1;
  let maxValue = 0;

  for (let i = 0; i < octaves; i++) {
    value += amplitude * perlin2D(x * frequency, y * frequency);
    maxValue += amplitude;
    amplitude *= gain;
    frequency *= lacunarity;
  }

  return value / maxValue;
}

// Ridged noise - creates mountain-like ridges
export function ridgedNoise(
  x: number,
  y: number,
  octaves: number = 6,
  lacunarity: number = 2,
  gain: number = 0.5
): number {
  let value = 0;
  let amplitude = 1;
  let frequency = 1;
  let weight = 1;
  let maxValue = 0;

  for (let i = 0; i < octaves; i++) {
    let signal = perlin2D(x * frequency, y * frequency);
    signal = 1 - Math.abs(signal);
    signal *= signal;
    signal *= weight;
    weight = Math.max(0, Math.min(1, signal * gain));
    value += signal * amplitude;
    maxValue += amplitude;
    amplitude *= gain;
    frequency *= lacunarity;
  }

  return value / maxValue;
}

// Turbulence - absolute value of noise
export function turbulence(
  x: number,
  y: number,
  octaves: number = 6,
  lacunarity: number = 2,
  gain: number = 0.5
): number {
  let value = 0;
  let amplitude = 1;
  let frequency = 1;
  let maxValue = 0;

  for (let i = 0; i < octaves; i++) {
    value += amplitude * Math.abs(perlin2D(x * frequency, y * frequency));
    maxValue += amplitude;
    amplitude *= gain;
    frequency *= lacunarity;
  }

  return value / maxValue;
}

// Domain warping - distorts the noise field
export function warpedNoise(
  x: number,
  y: number,
  warpStrength: number = 0.5,
  octaves: number = 4
): number {
  const warpX = fbm(x + 0, y + 0, octaves);
  const warpY = fbm(x + 5.2, y + 1.3, octaves);
  return fbm(x + warpStrength * warpX, y + warpStrength * warpY, octaves);
}

// Generate height map for terrain
export function generateHeightMap(
  width: number,
  height: number,
  scale: number = 0.02,
  seed: number = 0
): Float32Array {
  const data = new Float32Array(width * height);
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const nx = (x + seed * 1000) * scale;
      const ny = (y + seed * 1000) * scale;
      
      // Combine different noise types for interesting terrain
      let value = fbm(nx, ny, 6, 2, 0.5) * 0.6;
      value += ridgedNoise(nx * 2, ny * 2, 4, 2, 0.5) * 0.3;
      value += turbulence(nx * 4, ny * 4, 3, 2, 0.5) * 0.1;
      
      // Normalize to 0-1 range
      value = (value + 1) * 0.5;
      
      data[y * width + x] = value;
    }
  }
  
  return data;
}

// Create seed from string (for "Seed from Speech" feature)
export function stringToSeed(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash) / 2147483647; // Normalize to 0-1
}
