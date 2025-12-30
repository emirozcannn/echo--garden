// Wind Shader - Vertex displacement for foliage animation
// Used for leaves, grass, and branches

// === VERTEX SHADER ===
// #pragma vertex

uniform float uTime;
uniform float uWindStrength;
uniform vec3 uWindDirection;
uniform float uBassIntensity;
uniform float uTrebleIntensity;
uniform float uEnergy;

attribute vec3 instanceOffset;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vWorldPosition;
varying float vWindAmount;

// Simplex noise functions
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  
  i = mod289(i);
  vec4 p = permute(permute(permute(
    i.z + vec4(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;
  
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}

void main() {
  vUv = uv;
  vNormal = normalize(normalMatrix * normal);
  
  vec3 pos = position;
  
  // Calculate wind offset based on position
  float windNoise = snoise(vec3(
    pos.x * 0.1 + uTime * 0.5,
    pos.y * 0.1,
    pos.z * 0.1 + uTime * 0.3
  ));
  
  // Wind strength increases with height (leaves move more than roots)
  float heightFactor = smoothstep(0.0, 1.0, uv.y);
  
  // Base wind movement
  float windAmount = windNoise * uWindStrength * heightFactor;
  
  // Audio-reactive boost
  windAmount += uBassIntensity * 0.3 * heightFactor;
  windAmount += sin(uTime * 8.0) * uTrebleIntensity * 0.1 * heightFactor;
  
  // Apply wind displacement along wind direction
  vec3 displacement = uWindDirection * windAmount;
  
  // Add some vertical bounce on energy
  displacement.y += sin(uTime * 4.0 + pos.x) * uEnergy * 0.1 * heightFactor;
  
  pos += displacement;
  
  // Store wind amount for fragment shader (color variation)
  vWindAmount = windAmount;
  
  vec4 worldPos = modelMatrix * vec4(pos, 1.0);
  vWorldPosition = worldPos.xyz;
  
  gl_Position = projectionMatrix * viewMatrix * worldPos;
}

// === FRAGMENT SHADER ===
// #pragma fragment

uniform vec3 uBaseColor;
uniform vec3 uTipColor;
uniform float uTime;
uniform float uEnergy;
uniform sampler2D uNoiseTexture;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vWorldPosition;
varying float vWindAmount;

void main() {
  // Gradient from base to tip
  vec3 color = mix(uBaseColor, uTipColor, vUv.y);
  
  // Wind-based color variation (subtle)
  color = mix(color, color * 1.2, abs(vWindAmount) * 0.5);
  
  // Subsurface scattering approximation (leaves glow when backlit)
  vec3 lightDir = normalize(vec3(1.0, 1.0, 0.5));
  float subsurface = max(0.0, dot(-vNormal, lightDir));
  color += vec3(0.2, 0.4, 0.1) * subsurface * 0.3;
  
  // Energy-based brightness boost
  color += color * uEnergy * 0.2;
  
  // Simple lighting
  float diffuse = max(0.0, dot(vNormal, lightDir));
  float ambient = 0.4;
  
  vec3 finalColor = color * (ambient + diffuse * 0.6);
  
  gl_FragColor = vec4(finalColor, 1.0);
}
