import React, { useRef, useMemo, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { shaderMaterial } from "@react-three/drei";
import { extend } from "@react-three/fiber";

// Number of particles
const PARTICLE_COUNT = 1200;

const ParticleMaterial = shaderMaterial(
  {
    uTime: 0,
    uPixelRatio: 1,
    uData: new Array(2048).fill(0),
    uParticleCount: PARTICLE_COUNT,
    uMorphT: 0,
    uColorA: new THREE.Color("#80ffea"),
    uColorB: new THREE.Color("#a890fe"),
    uGlowColor: new THREE.Color("#fff6e0"),
  },
  // Vertex Shader
  `
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uData[2048];
  uniform int uParticleCount;
  uniform float uMorphT; // 0: sphere, 1: torus, 2: cube
  varying float vFreq;
  varying float vNoise;
  varying float vHue;
  varying float vRand;
  varying float vMorphId;

  // Morph functions
  // posA: sphere, posB: torus, posC: cube

  void main() {
    float i = float(gl_VertexID);
    float count = float(uParticleCount);

    // Calculate unique but deterministic randoms
    float t = i / count;
    float rand1 = fract(sin(i * 127.1) * 43758.5453);
    float rand2 = fract(sin(i * 137.1) * 43758.5453);
    float rand3 = fract(sin(i * 149.7) * 43758.5453);

    // ---- SPHERE position ----
    float thetaS = rand1 * 6.2831853;
    float phiS = acos(2.0 * rand2 - 1.0);
    float rS = 3.1 + 0.36 * sin(uTime + rand1 * 6.28);
    float xS = rS * sin(phiS) * cos(thetaS);
    float yS = rS * sin(phiS) * sin(thetaS);
    float zS = rS * cos(phiS);

    // ---- TORUS position ----
    float u = rand1 * 6.2831853;
    float v = rand2 * 6.2831853;
    float R = 2.15;
    float r = 1.0 + 0.28 * sin(uTime + rand2 * 5.23);
    float xT = (R + r * cos(v)) * cos(u);
    float yT = (R + r * cos(v)) * sin(u);
    float zT = r * sin(v);

    // ---- CUBE position ----
    float side = 3.0;
    float xC = (rand1 - 0.5) * side * 2.0;
    float yC = (rand2 - 0.5) * side * 2.0;
    float zC = (rand3 - 0.5) * side * 2.0;

    // ---- Morphing ----
    float morphId = mod(floor(uMorphT), 3.0); // 0: sphere, 1: torus, 2: cube
    float nextMorphId = mod(morphId + 1.0, 3.0);
    float morphFrac = fract(uMorphT); // value from 0.0 to 1.0

    vec3 posA, posB;
    if (morphId < 0.5) { // Sphere -> Torus
      posA = vec3(xS, yS, zS);
      posB = vec3(xT, yT, zT);
    } else if (morphId < 1.5) { // Torus -> Cube
      posA = vec3(xT, yT, zT);
      posB = vec3(xC, yC, zC);
    } else { // Cube -> Sphere
      posA = vec3(xC, yC, zC);
      posB = vec3(xS, yS, zS);
    }
    vec3 pos = mix(posA, posB, morphFrac);

    // Audio & chaos
    float freq = uData[int(mod(i, 256.0))] / 255.0;
    float chaos = 1.2 + 2.5 * freq * abs(sin(uTime * 3.0 + rand1 * 25.));
    pos *= (1.0 + 0.2 * freq * chaos);

    // Burst khi bass mạnh
    if(freq > 0.70){
      pos += vec3(
        sin(uTime * 12.0 + rand1 * 16.0) * freq * 1.6,
        cos(uTime * 10.0 + rand2 * 15.0) * freq * 1.6,
        sin(uTime * 7.1 + rand3 * 17.0) * freq * 1.3
      );
    }

    vFreq = freq;
    vNoise = chaos;
    vHue = t;
    vRand = rand1;
    vMorphId = morphId;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    gl_PointSize = (8.0 + 16.0 * freq + 5.0 * rand3) * uPixelRatio;
  }
  `,
  // Fragment Shader
  `
  uniform float uTime;
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform vec3 uGlowColor;
  varying float vFreq;
  varying float vNoise;
  varying float vHue;
  varying float vRand;
  varying float vMorphId;

  // HSV to RGB
  vec3 hsv2rgb(vec3 c) {
      vec4 K = vec4(1., 2./3., 1./3., 3.);
      vec3 p = abs(fract(c.xxx + K.xyz) * 6. - K.www);
      return c.z * mix(K.xxx, clamp(p - K.xxx, 0., 1.), c.y);
  }

  void main() {
    float d = length(gl_PointCoord - vec2(0.5));
    float glow = smoothstep(0.44, 0.08, d);

    // Neon palette (luxury)
    float hue = mod(0.62 + 0.19 * vRand + 0.15 * vFreq + 0.27 * sin(uTime + vHue * 8.5 + vRand * 12.0), 1.0);
    float mappedHue = 0.55 + 0.2 * hue;
    float sat = 0.7 + 0.2 * abs(sin(uTime * 0.6 + vRand * 10.1));
    float val = 0.88 + 0.09 * vFreq + 0.07 * sin(uTime * 0.7 + vRand * 19.2);
    vec3 rainbow = hsv2rgb(vec3(mappedHue, sat, val));

    vec3 color = mix(uColorA, uColorB, 0.40 + 0.54 * vFreq);
    color = mix(color, rainbow, 0.68 + 0.18 * vRand);

    color *= 0.93 + 0.19 * vNoise;
    vec3 finalColor = mix(color, uGlowColor, glow * 0.62);
    float alpha = 0.18 + 0.47 * glow * (0.7 + 0.27 * vFreq);
    if (d > 0.5) discard;
    gl_FragColor = vec4(finalColor, alpha);
  }
  `
);

extend({ ParticleMaterial });

export default function AudioParticlesVisualizer({ frequencyData }: { frequencyData: Uint8Array }) {
  const pointsRef = useRef<any>(null);
  const { gl } = useThree();
  const morphRef = useRef({ morphT: 0, target: 0 });

  // Morph duration, auto animate (morph mỗi 8 giây)
  useFrame(({ clock }) => {
    if (!pointsRef.current) return;
    // Cập nhật morphT để chuyển dần giữa các shape
    let morph = morphRef.current;
    morph.morphT += 0.006; // tốc độ chuyển shape (0.005-0.01 là hợp lý)
    if (morph.morphT > 3.0) morph.morphT -= 3.0;

    pointsRef.current.material.uniforms.uTime.value = clock.getElapsedTime();
    pointsRef.current.material.uniforms.uPixelRatio.value = gl.getPixelRatio();
    pointsRef.current.material.uniforms.uMorphT.value = morph.morphT;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      pointsRef.current.material.uniforms.uData.value[i] =
        frequencyData?.[i % frequencyData.length] ?? 0;
    }
  });

  // Dummy positions (shader move)
  const positions = useMemo(() => {
    const arr = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) arr.push(0, 0, 0);
    return new Float32Array(arr);
  }, []);

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={PARTICLE_COUNT}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <particleMaterial
        uParticleCount={PARTICLE_COUNT}
        uColorA="#80ffea"
        uColorB="#a890fe"
        uGlowColor="#fff6e0"
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
