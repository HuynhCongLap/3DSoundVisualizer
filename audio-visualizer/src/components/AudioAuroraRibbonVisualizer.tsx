import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const SEGMENTS = 180;
const RIBBON_WIDTH = 0.9;

export default function AudioAuroraRibbonVisualizer({ frequencyData }: { frequencyData: Uint8Array }) {
  const meshRef = useRef<THREE.Mesh>(null);

  // Chuẩn hóa buffer
  const positions = useMemo(() => {
    const arr: number[] = [];
    for (let i = 0; i < SEGMENTS; i++) {
      arr.push(i,  1, 0); // Top
      arr.push(i, -1, 0); // Bottom
    }
    return new Float32Array(arr);
  }, []);

  const indices = useMemo(() => {
    const arr: number[] = [];
    for (let i = 0; i < SEGMENTS - 1; i++) {
      arr.push(i * 2, i * 2 + 1, i * 2 + 2);
      arr.push(i * 2 + 1, i * 2 + 3, i * 2 + 2);
    }
    return new Uint16Array(arr);
  }, []);

  const segmentIndex = useMemo(() => {
    const arr: number[] = [];
    for (let i = 0; i < SEGMENTS; i++) {
      arr.push(i, i);
    }
    return new Float32Array(arr);
  }, []);

  // Uniforms
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uRibbonWidth: { value: RIBBON_WIDTH },
    uFreq: { value: new Float32Array(SEGMENTS) }
  }), []);

  useFrame(({ clock }) => {
    uniforms.uTime.value = clock.getElapsedTime();
    if (frequencyData && uniforms.uFreq.value) {
      for (let i = 0; i < SEGMENTS; i++) {
        uniforms.uFreq.value[i] =
          frequencyData[Math.floor(i / SEGMENTS * frequencyData.length)] / 255;
      }
    }
  });

  return (
    <mesh ref={meshRef}>
      {/* SỬA ĐOẠN NÀY: KHÔNG CÒN <index ... /> node, chỉ còn index prop */}
      <bufferGeometry index={indices}>
        <bufferAttribute
          attach="attributes-position"
          array={positions}
          count={positions.length / 3}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-segmentIndex"
          array={segmentIndex}
          count={segmentIndex.length}
          itemSize={1}
        />
      </bufferGeometry>
      <shaderMaterial
        vertexShader={`
          uniform float uTime;
          uniform float uRibbonWidth;
          attribute vec3 position;
          attribute float segmentIndex;
          varying float vPos;
          varying float vY;
          varying float vFreq;
          uniform float uFreq[${SEGMENTS}];
          void main() {
            float x = segmentIndex;
            float y = position.y * uRibbonWidth;
            vPos = x / float(${SEGMENTS});
            vY = position.y;
            float freq = uFreq[int(x)];
            vFreq = freq;

            float baseWave = sin(uTime*1.1 + x*0.073) * 0.44;
            float freqWave = sin(uTime*1.9 + x*0.09 + freq*6.0) * 0.23 * freq;
            float z = baseWave + freqWave + freq*0.7;
            float width = 1.0 + freq*1.1;
            y *= width * (0.6 + 0.3*freq);

            gl_Position = projectionMatrix * modelViewMatrix * vec4(
              (x - float(${SEGMENTS})/2.0) * 0.14,
              y,
              z,
              1.0
            );
          }
        `}
        fragmentShader={`
          uniform float uTime;
          varying float vPos;
          varying float vY;
          varying float vFreq;
          void main() {
            // Aurora gradient: blue-green-cyan-pink
            vec3 c1 = vec3(0.2, 0.88, 1.0);
            vec3 c2 = vec3(0.5, 0.3, 1.0);
            vec3 c3 = vec3(1.0, 0.36, 0.96);
            vec3 c4 = vec3(0.51, 1.0, 0.85);
            float t = vPos + 0.13*sin(uTime*0.19 + vPos*11.0);
            vec3 grad = mix(c1, c2, smoothstep(0.0, 0.33, t));
            grad = mix(grad, c3, smoothstep(0.33, 0.67, t));
            grad = mix(grad, c4, smoothstep(0.67, 1.0, t));

            // Alpha theo chiều ribbon, mờ biên ngoài
            float alpha = 0.88 * (0.93 - pow(abs(vY), 2.1)) * (0.66 + 0.35*vFreq);

            // Nhẹ glow center
            float centerGlow = smoothstep(0.25, 0.03, abs(vY));

            gl_FragColor = vec4(mix(grad, vec3(1.0), centerGlow*0.16), alpha);
            if(gl_FragColor.a < 0.04) discard;
          }
        `}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}
