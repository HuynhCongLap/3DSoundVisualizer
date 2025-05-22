import React, { useRef, useMemo } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import * as THREE from "three";
import energyGlow from "../assets/glow.png"; // Đặt đúng path PNG bạn dùng

const PARTICLE_COUNT = 3200;
const LAYERS = 4;
const SPIRAL_RADIUS = 7;

function layeredNoise(x: number, y: number, z: number, t: number) {
  return (
    Math.sin(x * 1.3 + t * 0.2) * 0.4 +
    Math.cos(z * 1.7 + t * 0.13) * 0.28 +
    Math.sin((x + z) * 0.9 - t * 0.33) * 0.18 +
    Math.sin(y * 1.8 + t * 0.42) * 0.13
  );
}

export default function AudioGalaxyParticlesVisualizer({ frequencyData }: { frequencyData: Uint8Array }) {
  const geometryRefs = useRef(Array.from({ length: LAYERS }, () => React.createRef<THREE.BufferGeometry>()));
  const texture = useLoader(THREE.TextureLoader, energyGlow);

  // Tính toán cấu trúc spiral nhiều layer
  const layers = useMemo(
    () =>
      Array.from({ length: LAYERS }, (_, l) =>
        Array.from({ length: PARTICLE_COUNT }, (_, i) => {
          const t = i / PARTICLE_COUNT;
          const arm = i % 6;
          const baseAngle = t * Math.PI * 8 + arm * (Math.PI * 2 / 6) + l * Math.PI / LAYERS;
          const baseRadius = t * (SPIRAL_RADIUS - l * 0.6) + (Math.random() - 0.5) * 0.5;
          return { baseAngle, baseRadius, t, arm };
        })
      ),
    []
  );

  // Tạo buffer cho từng layer
  const positions = useRef(Array.from({ length: LAYERS }, () => new Float32Array(PARTICLE_COUNT * 3)));
  const colors = useRef(Array.from({ length: LAYERS }, () => new Float32Array(PARTICLE_COUNT * 3)));
  const sizes = useRef(Array.from({ length: LAYERS }, () => new Float32Array(PARTICLE_COUNT)));

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    for (let l = 0; l < LAYERS; l++) {
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const { baseAngle, baseRadius, t: percent, arm } = layers[l][i];
        const freqIdx = Math.floor(percent * (frequencyData.length - 1));
        const freqVal = frequencyData[freqIdx] / 255;
        const phase = t * (0.14 + 0.03 * l) + arm * 0.17;
        const spiral = baseRadius + freqVal * (0.8 + 0.8 * Math.sin(phase + i * 0.11));
        const n = layeredNoise(baseAngle, spiral, percent * 2.1, t + l * 3.7);

        positions.current[l][i * 3 + 0] = Math.cos(baseAngle + phase) * (spiral + n * 0.8);
        positions.current[l][i * 3 + 1] = n * (0.55 + l * 0.13) + freqVal * 0.6;
        positions.current[l][i * 3 + 2] = Math.sin(baseAngle + phase) * (spiral + n * 0.8);

        // Animate size từng hạt (cho sống động theo nhạc)
        sizes.current[l][i] = (0.16 + l * 0.05) * (1 + 1.7 * freqVal);

        // Màu gradient xanh lam - cyan - tím - trắng
        const nebulaColor = new THREE.Color();
        const dynamicHue = 0.58 + 0.16 * percent + 0.20 * Math.sin(percent * 5.3 + l * 1.7 + t * 0.11);
        nebulaColor.setHSL(
          dynamicHue, // blue/cyan/purple/white
          0.92 - 0.19 * percent + 0.16 * freqVal,
          0.61 + 0.32 * Math.pow(freqVal, 1.4) + 0.12 * l
        );
        colors.current[l][i * 3 + 0] = nebulaColor.r;
        colors.current[l][i * 3 + 1] = nebulaColor.g;
        colors.current[l][i * 3 + 2] = nebulaColor.b;
      }
      // Update geometry cho từng frame
      const geom = geometryRefs.current[l].current;
      if (geom) {
        geom.attributes.position.needsUpdate = true;
        geom.attributes.color.needsUpdate = true;
        if (geom.attributes.size) geom.attributes.size.needsUpdate = true;
      }
    }
  });

  // Vẫn dùng pointsMaterial để tận dụng texture glow (đẹp nhẹ, fast)
  return (
    <>
      {positions.current.map((pos, l) => (
        <points key={l}>
          <bufferGeometry ref={geometryRefs.current[l]}>
            <bufferAttribute
              attach="attributes-position"
              array={pos}
              count={pos.length / 3}
              itemSize={3}
            />
            <bufferAttribute
              attach="attributes-color"
              array={colors.current[l]}
              count={colors.current[l].length / 3}
              itemSize={3}
            />
          </bufferGeometry>
          <pointsMaterial
            map={texture}
            vertexColors
            size={0.21 + l * 0.10}
            sizeAttenuation
            opacity={0.065 + 0.055 * (LAYERS - l)} // giảm opacity mạnh!
            transparent
            depthWrite={false}
            alphaTest={0.06}
            blending={THREE.AdditiveBlending}
          />
        </points>
      ))}
    </>
  );
}
