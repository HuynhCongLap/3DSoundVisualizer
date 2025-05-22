import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const SEGMENTS = 64;
const RINGS = 22;
const RADIUS = 2.65;
const DEPTH = 18;
const SPEED = 2.2;
const TWIST_FACTOR = 0.18;
const GLOW_OPACITY = 0.94;

const PARTICLE_COUNT = 20;
const PARTICLE_RADIUS = 1.5;

export default function AudioTunnelWaveVisualizer({ frequencyData }: { frequencyData: Uint8Array }) {
  const lineRefs = useRef<(THREE.Line | null)[]>([]);

  // Tạo geometry cho các rings
  const ringBases = useMemo(
    () =>
      Array.from({ length: RINGS }, (_, r) =>
        Array.from({ length: SEGMENTS }, (_, i) => {
          const theta = (i / SEGMENTS) * Math.PI * 2;
          return {
            baseTheta: theta,
            baseRadius: RADIUS + r * 0.01,
            ringIndex: r
          };
        })
      ),
    []
  );

  const ringGeometries = useMemo(
    () => Array.from({ length: RINGS }, () => new THREE.BufferGeometry()),
    []
  );

  // Khởi tạo particles
  const particles = useRef<any[]>([]);
  if (particles.current.length !== PARTICLE_COUNT) {
    particles.current = Array.from({ length: PARTICLE_COUNT }).map(() => ({
      x: (Math.random() - 0.5) * 2 * (PARTICLE_RADIUS + Math.random() * 0.7),
      y: (Math.random() - 0.5) * 2 * (PARTICLE_RADIUS + Math.random() * 0.7),
      z: -Math.random() * DEPTH,
      size: 0.045 + Math.random() * 0.07,
      speed: 0.20 + Math.random() * 0.11 + Math.random() * 0.06,
      opacity: 0.68 + Math.random() * 0.32,
      hue: 0.55 + Math.random() * 0.28 // blue-cyan-violet
    }));
  }

  // Animate
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();

    // Animate tunnel rings
    for (let r = 0; r < RINGS; r++) {
      const zPos = -((t * SPEED * 1.16 + r * (DEPTH / RINGS)) % DEPTH) + DEPTH * 0.3;
      const freqBase = Math.floor((1 - r / RINGS) * (frequencyData.length - 1));
      const positions: number[] = [];
      const colors: number[] = [];
      const twist = Math.sin(t * 0.44 + r * 0.08) * TWIST_FACTOR * (1 - r / RINGS);

      for (let i = 0; i <= SEGMENTS; i++) {
        const idx = i % SEGMENTS;
        const { baseTheta, baseRadius } = ringBases[r][idx];

        // Wave & twist & beat
        const freqIdx = Math.floor(idx / SEGMENTS * (frequencyData.length - 1));
        const freqVal = frequencyData[freqIdx] / 255;
        const freqMix = (frequencyData[freqBase] + frequencyData[freqIdx]) / 510;
        const pulse = freqVal * 0.83 + freqMix * 0.45;

        const wave = Math.sin(baseTheta * 3.5 + t * 2.1 + r * 0.34) * 0.17
          + Math.cos(baseTheta * 6.4 - t * 1.2 - r * 0.54) * 0.12
          + Math.sin(baseTheta * 1.1 + t * 0.45 + r * 0.13) * 0.07 * freqVal;

        const swirl = twist * Math.sin(baseTheta * 2 + t * 0.53);

        const radius = baseRadius + wave + pulse + swirl;

        const x = Math.cos(baseTheta) * radius;
        const y = Math.sin(baseTheta) * radius;
        const z = zPos;

        positions.push(x, y, z);

        const color = new THREE.Color();
        const hue = (0.59 + 0.25 * (freqMix + Math.sin(baseTheta + t * 0.19 + r * 0.04)) + t * 0.02) % 1;
        color.setHSL(
          hue,
          0.92 - 0.23 * freqMix + 0.17 * freqVal,
          0.54 + 0.34 * freqVal + 0.12 * (1 - r / RINGS)
        );
        colors.push(color.r, color.g, color.b);
      }
      ringGeometries[r].setAttribute(
        "position",
        new THREE.Float32BufferAttribute(positions, 3)
      );
      ringGeometries[r].setAttribute(
        "color",
        new THREE.Float32BufferAttribute(colors, 3)
      );
      ringGeometries[r].computeBoundingSphere();
    }

    // Animate particles
    for (let [idx, p] of particles.current.entries()) {
      p.z += p.speed;
      // Hiệu ứng "thở" cho particle
      const t2 = t + idx;
      p.size = 0.06 + Math.abs(Math.sin(t2 * 1.8)) * 0.08 + Math.random() * 0.01;

      if (p.z > 8) {
        p.z = -DEPTH - Math.random() * 6;
        p.x = (Math.random() - 0.5) * 2 * (PARTICLE_RADIUS + Math.random() * 0.7);
        p.y = (Math.random() - 0.5) * 2 * (PARTICLE_RADIUS + Math.random() * 0.7);
        p.size = 0.045 + Math.random() * 0.07;
        p.opacity = 0.68 + Math.random() * 0.32;
        p.hue = 0.52 + Math.random() * 0.33;
      }
    }
  });

  // Render
  return (
    <>
      {/* Tunnel rings */}
      {ringGeometries.map((geo, i) => (
        <line
          key={i}
          ref={ref => (lineRefs.current[i] = ref)}
          geometry={geo}
        >
          <lineBasicMaterial
            vertexColors
            linewidth={1.2}
            transparent
            opacity={GLOW_OPACITY - i * 0.035}
            blending={THREE.AdditiveBlending}
          />
        </line>
      ))}

      {/* Particles glow (halo + core) */}
      {particles.current.map((p, idx) => (
        <group key={idx} position={[p.x, p.y, p.z]}>
          {/* Glow/halo */}
          <mesh>
            <sphereGeometry args={[p.size * 2.2, 12, 12]} />
            <meshBasicMaterial
              color={new THREE.Color().setHSL(p.hue, 1, 0.58)}
              transparent
              opacity={p.opacity * 0.20}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
          {/* Core */}
          <mesh>
            <sphereGeometry args={[p.size, 10, 10]} />
            <meshBasicMaterial
              color={new THREE.Color().setHSL(p.hue, 1, 0.80)}
              transparent
              opacity={p.opacity}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
        </group>
      ))}
    </>
  );
}
