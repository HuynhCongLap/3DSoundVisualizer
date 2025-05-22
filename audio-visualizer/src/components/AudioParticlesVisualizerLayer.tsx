import React, { useRef, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { shaderMaterial } from "@react-three/drei";
import { extend } from "@react-three/fiber";

// Số lượng trail step (vệt sáng)
const TRAIL_STEPS = 4;

// Custom Shader Material với hiệu ứng "diamond/bokeh/starburst"
const AudioParticlesShader = shaderMaterial(
  {
    uTime: 0,
    uPixelRatio: 1,
    uData: new Array(2048).fill(0),
    uParticleCount: 1200,
    uMorphT: 0,
    uTrailSteps: TRAIL_STEPS,
    uColorA: new THREE.Color("#7afcff"),
    uColorB: new THREE.Color("#ffa6ff"),
    uGlowColor: new THREE.Color("#fff6e0"),
    uHueBase: 0.55,
    uHueRange: 0.20,
    uSatBase: 0.74,
    uSatRange: 0.18,
    uValBase: 0.94,
    uValRange: 0.08,
    uAlphaBase: 0.13,
    uAlphaGlow: 0.40,
  },
  // Vertex Shader
  `
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uData[2048];
  uniform int uParticleCount;
  uniform float uMorphT;
  uniform int uTrailSteps;
  attribute float trailStep;
  varying float vFreq;
  varying float vNoise;
  varying float vHue;
  varying float vRand;
  varying float vTrailStep;

  void main() {
    float i = float(gl_VertexID);
    float count = float(uParticleCount);

    float t = i / count;
    float rand1 = fract(sin(i * 127.1) * 43758.5453);
    float rand2 = fract(sin(i * 137.1) * 43758.5453);
    float rand3 = fract(sin(i * 149.7) * 43758.5453);

    float trailT = 1.0 - trailStep / float(uTrailSteps);
    float trailOffset = uTime - trailStep * 0.07 - rand1 * 0.03;

    // ---- SPHERE
    float thetaS = rand1 * 6.2831853;
    float phiS = acos(2.0 * rand2 - 1.0);
    float rS = 3.1 + 0.36 * sin(trailOffset + rand1 * 6.28);
    float xS = rS * sin(phiS) * cos(thetaS);
    float yS = rS * sin(phiS) * sin(thetaS);
    float zS = rS * cos(phiS);

    // ---- TORUS
    float u = rand1 * 6.2831853;
    float v = rand2 * 6.2831853;
    float R = 2.15;
    float r = 1.0 + 0.28 * sin(trailOffset + rand2 * 5.23);
    float xT = (R + r * cos(v)) * cos(u);
    float yT = (R + r * cos(v)) * sin(u);
    float zT = r * sin(v);

    // ---- CUBE
    float side = 3.0;
    float xC = (rand1 - 0.5) * side * 2.0;
    float yC = (rand2 - 0.5) * side * 2.0;
    float zC = (rand3 - 0.5) * side * 2.0;

    float morphId = mod(floor(uMorphT), 3.0);
    float morphFrac = fract(uMorphT);

    vec3 posA, posB;
    if (morphId < 0.5) {
      posA = vec3(xS, yS, zS);
      posB = vec3(xT, yT, zT);
    } else if (morphId < 1.5) {
      posA = vec3(xT, yT, zT);
      posB = vec3(xC, yC, zC);
    } else {
      posA = vec3(xC, yC, zC);
      posB = vec3(xS, yS, zS);
    }
    vec3 pos = mix(posA, posB, morphFrac);

    float freq = uData[int(mod(i, 256.0))] / 255.0;
    float chaos = 1.2 + 2.5*freq*abs(sin(trailOffset*3.0+rand1*25.));
    pos *= (1.0 + 0.2 * freq * chaos);

    if(freq > 0.70){
      pos += vec3(
        sin(trailOffset*12.0+rand1*16.0)*freq*1.2,
        cos(trailOffset*10.0+rand2*15.0)*freq*1.2,
        sin(trailOffset*7.1+rand3*17.0)*freq*1.2
      );
    }

    vFreq = freq;
    vNoise = chaos;
    vHue = t;
    vRand = rand1;
    vTrailStep = trailT;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    gl_PointSize = (7.0 + 14.0 * freq + 4.0 * rand3) * uPixelRatio * (0.92 + 0.15 * (1.0 - trailT));
  }
  `,
  // ----------- FRAGMENT SHADER "BOKEH/DIAMOND/STARBURST" -----------
  `
  uniform float uTime;
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform vec3 uGlowColor;
  uniform float uHueBase;
  uniform float uHueRange;
  uniform float uSatBase;
  uniform float uSatRange;
  uniform float uValBase;
  uniform float uValRange;
  uniform float uAlphaBase;
  uniform float uAlphaGlow;
  varying float vFreq;
  varying float vNoise;
  varying float vHue;
  varying float vRand;
  varying float vTrailStep;

  vec3 hsv2rgb(vec3 c) {
      vec4 K = vec4(1., 2./3., 1./3., 3.);
      vec3 p = abs(fract(c.xxx + K.xyz) * 6. - K.www);
      return c.z * mix(K.xxx, clamp(p - K.xxx, 0., 1.), c.y);
  }

  void main() {
    float d = length(gl_PointCoord - vec2(0.5));
    float edge = smoothstep(0.49, 0.43, d); // Main disc

    // Starburst cross (like crystal rays)
    float angle = atan(gl_PointCoord.y - 0.5, gl_PointCoord.x - 0.5);
    float rays = pow(abs(sin(6.0 * angle)), 2.5) * 0.33;
    float halo = pow(1.0 - d, 2.5);

    // Bokeh ring
    float ring = smoothstep(0.33, 0.34, d) - smoothstep(0.39, 0.40, d);

    // Center highlight
    float center = smoothstep(0.13, 0.06, d);

    // Tổng hợp alpha (bokeh, starburst, ring, halo)
    float a = edge * (0.74 * halo + 0.21 * rays + 0.12 * center + 0.08 * ring);

    // Màu động như cũ
    float hue = mod(vHue + 0.19 * vRand + 0.13 * vFreq + 0.28 * sin(uTime + vHue*8.5 + vRand*12.0), 1.0);
    float mappedHue = uHueBase + uHueRange * hue;
    float sat = uSatBase + uSatRange * abs(sin(uTime*0.7 + vRand*10.1));
    float val = uValBase + uValRange * vFreq + 0.07 * sin(uTime*0.7 + vRand*19.2);
    vec3 rainbow = hsv2rgb(vec3(mappedHue, sat, val));
    vec3 color = mix(uColorA, uColorB, 0.38 + 0.56 * vFreq);
    color = mix(color, rainbow, 0.74 + 0.17 * vRand);
    color *= 0.93 + 0.19 * vNoise;

    // Glow vẫn mix ngoài alpha cho đẹp
    float glow = smoothstep(0.39, 0.08, d);
    vec3 finalColor = mix(color, uGlowColor, glow * 0.48);

    // Fade alpha cho trail (đuôi càng xa càng mờ)
    float trailAlpha = (uAlphaBase * vTrailStep * vTrailStep + uAlphaGlow * glow * (0.62 + 0.33 * vFreq) * vTrailStep);
    float totalAlpha = a * trailAlpha;

    gl_FragColor = vec4(finalColor, totalAlpha);
    if (totalAlpha < 0.01) discard;
  }
  `
);

extend({ AudioParticlesShader });

type Props = {
  frequencyData: Uint8Array;
  PARTICLE_COUNT: number;
  morphSpeed: number;
  morphOffset: number;
  colorA: string;
  colorB: string;
  glowColor: string;
  hueBase: number;
  hueRange: number;
  satBase: number;
  satRange: number;
  valBase: number;
  valRange: number;
  alphaBase: number;
  alphaGlow: number;
};

export default function AudioParticlesVisualizerLayer(props: Props) {
  const pointsRef = useRef<any>(null);
  const { gl } = useThree();
  const morphRef = useRef({ morphT: props.morphOffset });

  useFrame(({ clock }) => {
    if (!pointsRef.current) return;
    let morph = morphRef.current;
    morph.morphT += props.morphSpeed;
    if (morph.morphT > 3.0) morph.morphT -= 3.0;

    pointsRef.current.material.uniforms.uTime.value = clock.getElapsedTime();
    pointsRef.current.material.uniforms.uPixelRatio.value = gl.getPixelRatio();
    pointsRef.current.material.uniforms.uMorphT.value = morph.morphT;

    for (let i = 0; i < props.PARTICLE_COUNT; i++) {
      pointsRef.current.material.uniforms.uData.value[i] =
        props.frequencyData?.[i % props.frequencyData.length] ?? 0;
    }
  });

  // Build trailSteps * PARTICLE_COUNT particles
  const positions = useMemo(() => {
    const arr = [];
    for (let t = 0; t < TRAIL_STEPS; t++) {
      for (let i = 0; i < props.PARTICLE_COUNT; i++) {
        arr.push(0, 0, 0);
      }
    }
    return new Float32Array(arr);
  }, [props.PARTICLE_COUNT]);

  // Create an array for trailStep attribute
  const trailStepsArray = useMemo(() => {
    const arr = [];
    for (let t = 0; t < TRAIL_STEPS; t++) {
      for (let i = 0; i < props.PARTICLE_COUNT; i++) {
        arr.push(t);
      }
    }
    return new Float32Array(arr);
  }, [props.PARTICLE_COUNT]);

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={TRAIL_STEPS * props.PARTICLE_COUNT}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-trailStep"
          count={TRAIL_STEPS * props.PARTICLE_COUNT}
          array={trailStepsArray}
          itemSize={1}
        />
      </bufferGeometry>
      <audioParticlesShader
        uParticleCount={props.PARTICLE_COUNT}
        uColorA={props.colorA}
        uColorB={props.colorB}
        uGlowColor={props.glowColor}
        uHueBase={props.hueBase}
        uHueRange={props.hueRange}
        uSatBase={props.satBase}
        uSatRange={props.satRange}
        uValBase={props.valBase}
        uValRange={props.valRange}
        uAlphaBase={props.alphaBase}
        uAlphaGlow={props.alphaGlow}
        uTrailSteps={TRAIL_STEPS}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
