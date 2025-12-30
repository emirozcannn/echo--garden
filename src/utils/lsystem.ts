// L-System (Lindenmayer System) for Procedural Tree Generation
// Creates organic, fractal-like branching structures

import * as THREE from 'three';

export interface LSystemRule {
  symbol: string;
  replacement: string;
  probability?: number;
}

export interface LSystemConfig {
  axiom: string;
  rules: LSystemRule[];
  angle: number;
  length: number;
  lengthFactor: number;
  widthFactor: number;
  iterations: number;
  randomness: number;
}

export interface Branch {
  start: THREE.Vector3;
  end: THREE.Vector3;
  width: number;
  depth: number;
}

// Preset tree configurations
export const TREE_PRESETS = {
  oak: {
    axiom: 'F',
    rules: [
      { symbol: 'F', replacement: 'FF+[+F-F-F]-[-F+F+F]', probability: 1 }
    ],
    angle: 22.5,
    length: 2,
    lengthFactor: 0.7,
    widthFactor: 0.7,
    iterations: 2,  // Reduced from 4 for performance
    randomness: 0.1
  },
  willow: {
    axiom: 'F',
    rules: [
      { symbol: 'F', replacement: 'F[+F]F[-F][F]', probability: 1 }
    ],
    angle: 35,
    length: 1.5,
    lengthFactor: 0.75,
    widthFactor: 0.65,
    iterations: 3,
    randomness: 0.15
  },
  pine: {
    axiom: 'F',
    rules: [
      { symbol: 'F', replacement: 'FF-[-F+F+F]+[+F-F-F]', probability: 1 }
    ],
    angle: 25,
    length: 2.5,
    lengthFactor: 0.6,
    widthFactor: 0.75,
    iterations: 2,
    randomness: 0.05
  },
  bonsai: {
    axiom: 'F',
    rules: [
      { symbol: 'F', replacement: 'F[+F][-F]F[-F][+F]F', probability: 1 }
    ],
    angle: 30,
    length: 0.8,
    lengthFactor: 0.65,
    widthFactor: 0.6,
    iterations: 2,
    randomness: 0.2
  },
  thorny: {
    axiom: 'F',
    rules: [
      { symbol: 'F', replacement: 'F[+F][--F]F[-F][++F]F', probability: 1 }
    ],
    angle: 45,
    length: 1.2,
    lengthFactor: 0.55,
    widthFactor: 0.8,
    iterations: 2,
    randomness: 0.25
  },
  crystal: {
    axiom: 'F',
    rules: [
      { symbol: 'F', replacement: 'F[+F+F][-F-F]F', probability: 1 }
    ],
    angle: 60,
    length: 1.5,
    lengthFactor: 0.7,
    widthFactor: 0.9,
    iterations: 2,
    randomness: 0
  }
} as const;

export type TreePresetName = keyof typeof TREE_PRESETS;

// Generate L-System string
export function generateLSystem(
  config: LSystemConfig,
  seed: number = Math.random()
): string {
  let current = config.axiom;
  const random = seededRandom(seed);

  for (let i = 0; i < config.iterations; i++) {
    let next = '';
    
    for (const char of current) {
      const matchingRules = config.rules.filter(r => r.symbol === char);
      
      if (matchingRules.length > 0) {
        // Select rule based on probability
        let selectedRule = matchingRules[0];
        if (matchingRules.length > 1) {
          const roll = random();
          let cumulative = 0;
          for (const rule of matchingRules) {
            cumulative += rule.probability || 1 / matchingRules.length;
            if (roll < cumulative) {
              selectedRule = rule;
              break;
            }
          }
        }
        next += selectedRule.replacement;
      } else {
        next += char;
      }
    }
    
    current = next;
  }

  return current;
}

// Interpret L-System string into 3D branches
export function interpretLSystem(
  lsystemString: string,
  config: LSystemConfig,
  baseWidth: number = 0.5,
  seed: number = Math.random()
): Branch[] {
  const branches: Branch[] = [];
  const stack: { pos: THREE.Vector3; dir: THREE.Vector3; width: number; depth: number }[] = [];
  const random = seededRandom(seed);
  
  let pos = new THREE.Vector3(0, 0, 0);
  let dir = new THREE.Vector3(0, 1, 0);
  let width = baseWidth;
  let length = config.length;
  let depth = 0;

  const angleRad = THREE.MathUtils.degToRad(config.angle);

  for (const char of lsystemString) {
    const randomAngle = angleRad * (1 + (random() - 0.5) * config.randomness * 2);
    const randomLength = length * (1 + (random() - 0.5) * config.randomness);

    switch (char) {
      case 'F': // Draw forward
        const end = pos.clone().add(dir.clone().multiplyScalar(randomLength));
        branches.push({
          start: pos.clone(),
          end: end.clone(),
          width,
          depth
        });
        pos = end;
        break;

      case '+': // Turn right (rotate around Z axis)
        dir.applyAxisAngle(new THREE.Vector3(0, 0, 1), randomAngle);
        break;

      case '-': // Turn left
        dir.applyAxisAngle(new THREE.Vector3(0, 0, 1), -randomAngle);
        break;

      case '&': // Pitch down
        dir.applyAxisAngle(new THREE.Vector3(1, 0, 0), randomAngle);
        break;

      case '^': // Pitch up
        dir.applyAxisAngle(new THREE.Vector3(1, 0, 0), -randomAngle);
        break;

      case '\\': // Roll left
        dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), randomAngle);
        break;

      case '/': // Roll right
        dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), -randomAngle);
        break;

      case '|': // Turn around
        dir.applyAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI);
        break;

      case '[': // Push state
        stack.push({ pos: pos.clone(), dir: dir.clone(), width, depth });
        width *= config.widthFactor;
        length *= config.lengthFactor;
        depth++;
        break;

      case ']': // Pop state
        const state = stack.pop();
        if (state) {
          pos = state.pos;
          dir = state.dir;
          width = state.width;
          depth = state.depth;
          length = config.length * Math.pow(config.lengthFactor, depth);
        }
        break;
    }
  }

  return branches;
}

// Create Three.js geometry from branches
export function createTreeGeometry(branches: Branch[]): THREE.BufferGeometry {
  const positions: number[] = [];
  const colors: number[] = [];
  const widths: number[] = [];

  for (const branch of branches) {
    // Start point
    positions.push(branch.start.x, branch.start.y, branch.start.z);
    // End point
    positions.push(branch.end.x, branch.end.y, branch.end.z);
    
    // Color based on depth (brown to green)
    const depthFactor = Math.min(branch.depth / 5, 1);
    const brown = new THREE.Color(0x4a3728);
    const green = new THREE.Color(0x2d5a27);
    const color = brown.clone().lerp(green, depthFactor);
    
    colors.push(color.r, color.g, color.b);
    colors.push(color.r, color.g, color.b);
    
    widths.push(branch.width);
    widths.push(branch.width * 0.8);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setAttribute('lineWidth', new THREE.Float32BufferAttribute(widths, 1));

  return geometry;
}

// Create tubes for better looking branches
export function createTreeMesh(
  branches: Branch[],
  radialSegments: number = 6
): THREE.Group {
  const group = new THREE.Group();

  for (const branch of branches) {
    const direction = branch.end.clone().sub(branch.start);
    const length = direction.length();
    
    if (length < 0.01) continue;

    // Create cylinder for each branch
    const geometry = new THREE.CylinderGeometry(
      branch.width * 0.8, // top radius
      branch.width,       // bottom radius
      length,
      radialSegments
    );

    // Brown to greenish-brown gradient based on depth
    const depthFactor = Math.min(branch.depth / 5, 1);
    const color = new THREE.Color().lerpColors(
      new THREE.Color(0x4a3728),
      new THREE.Color(0x3d5a3d),
      depthFactor
    );

    const material = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.9,
      metalness: 0.1
    });

    const mesh = new THREE.Mesh(geometry, material);

    // Position and orient the cylinder
    const midpoint = branch.start.clone().add(branch.end).multiplyScalar(0.5);
    mesh.position.copy(midpoint);
    
    // Align cylinder with branch direction
    const up = new THREE.Vector3(0, 1, 0);
    const quaternion = new THREE.Quaternion();
    quaternion.setFromUnitVectors(up, direction.normalize());
    mesh.quaternion.copy(quaternion);

    group.add(mesh);
  }

  return group;
}

// Generate leaf positions from branch tips
export function generateLeafPositions(
  branches: Branch[],
  density: number = 0.5,
  seed: number = Math.random()
): THREE.Vector3[] {
  const random = seededRandom(seed);
  const leaves: THREE.Vector3[] = [];
  
  // Only add leaves to outer branches (higher depth)
  const maxDepth = Math.max(...branches.map(b => b.depth));
  const minLeafDepth = Math.floor(maxDepth * 0.6);

  for (const branch of branches) {
    if (branch.depth >= minLeafDepth) {
      // Add leaves along and around the branch tip
      const numLeaves = Math.floor(random() * 5 * density) + 1;
      
      for (let i = 0; i < numLeaves; i++) {
        const offset = new THREE.Vector3(
          (random() - 0.5) * 0.5,
          random() * 0.3,
          (random() - 0.5) * 0.5
        );
        leaves.push(branch.end.clone().add(offset));
      }
    }
  }

  return leaves;
}

// Seeded random number generator
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = Math.sin(s * 9999) * 10000;
    return s - Math.floor(s);
  };
}

// Modify tree based on audio features
export function modifyTreeByAudio(
  config: LSystemConfig,
  bass: number,      // 0-1, affects trunk thickness
  mids: number,      // 0-1, affects branch count
  treble: number,    // 0-1, affects leaf density
  energy: number     // 0-1, overall audio energy
): LSystemConfig {
  return {
    ...config,
    length: config.length * (0.8 + bass * 0.4),
    angle: config.angle * (0.9 + treble * 0.2),
    iterations: Math.min(6, Math.max(2, Math.floor(config.iterations * (0.8 + mids * 0.4)))),
    randomness: config.randomness * (1 + energy * 0.5)
  };
}
