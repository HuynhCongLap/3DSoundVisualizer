import { useRef, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { shaderMaterial } from "@react-three/drei";
import { extend } from "@react-three/fiber";

const TRAIL_STEPS = 4;

const AudioParticlesShader = shaderMaterial(
  {
    uTime: 0,
    uPixelRatio: 1,
    uData: new Array(2048).fill(0),
    uParticleCount: 1200,
    uMorphT: 0,
    uTrailSteps: TRAIL_STEPS,
    uColorA: new THREE.Color("#d0f5ff"),
    uColorB: new THREE.Color("#ffd6fa"),
    uGlowColor: new THREE.Color("#fffbea"),
    uHueBase: 0.62,
    uHueRange: 0.29,
    uSatBase: 0.62,
    uSatRange: 0.27,
    uValBase: 0.93,
    uValRange: 0.09,
    uAlphaBase: 0.16,      // thấp hơn nữa
    uAlphaGlow: 0.38,      // thấp hơn
    uAudioLevel: 0.0,
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

    float thetaS = rand1 * 6.2831853;
    float phiS = acos(2.0 * rand2 - 1.0);
    float rS = 3.1 + 0.36 * sin(trailOffset + rand1 * 6.28);
    float xS = rS * sin(phiS) * cos(thetaS);
    float yS = rS * sin(phiS) * sin(thetaS);
    float zS = rS * cos(phiS);

    float u = rand1 * 6.2831853;
    float v = rand2 * 6.2831853;
    float R = 2.15;
    float r = 1.0 + 0.28 * sin(trailOffset + rand2 * 5.23);
    float xT = (R + r * cos(v)) * cos(u);
    float yT = (R + r * cos(v)) * sin(u);
    float zT = r * sin(v);

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
    float dist = abs(gl_Position.w);
    float baseSize = 30.0 + 25.5 * freq + 7.5 * rand3 + 9.0 * (1.0 - trailT);
    gl_PointSize = clamp(baseSize / dist, 2.5, 22.0);
  }
  `,
  // Fragment Shader
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
  uniform float uAudioLevel;
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
    float edge = smoothstep(0.47, 0.19, d);

    float angle = atan(gl_PointCoord.y - 0.5, gl_PointCoord.x - 0.5);
    float rays = pow(abs(sin(8.0 * angle)), 3.4) * (1.0 - d) * 0.17;
    float ring = smoothstep(0.31, 0.17, d) - smoothstep(0.38, 0.42, d);
    float center = smoothstep(0.11, 0.06, d);

    float a = edge * (0.76 + 0.09 * rays + 0.07 * ring + 0.07 * center);

    float hue = mod(vHue + 0.13 * vRand + 0.19 * vFreq + 0.20 * sin(uTime + vHue*7.7 + vRand*6.9), 1.0);
    float mappedHue = uHueBase + uHueRange * hue;
    float sat = uSatBase + uSatRange * abs(sin(uTime*0.73 + vRand*10.8));
    float val = uValBase + uValRange * vFreq + 0.07 * sin(uTime*0.6 + vRand*13.2);
    vec3 rainbow = hsv2rgb(vec3(mappedHue, sat, val));
    vec3 color = mix(uColorA, uColorB, 0.32 + 0.59 * vFreq);
    color = mix(color, rainbow, 0.64 + 0.21 * vRand);

    float glow = smoothstep(0.38, 0.09, d);
    vec3 finalColor = mix(color, uGlowColor, glow * (0.33 + 0.48 * uAudioLevel));
    finalColor *= (0.92 + 0.85 * uAudioLevel);

    float trailAlpha = (uAlphaBase * vTrailStep * vTrailStep + uAlphaGlow * glow * (0.50 + 0.61 * vFreq) * vTrailStep);

    float twinkle = 0.8 + 0.21 * sin(
        uTime * (2.2 + vFreq * 2.1)
        + vRand * 8.3 + vTrailStep * 2.6
        + vNoise * 7.0
    );

    float totalAlpha = a * trailAlpha * clamp(twinkle, 0.70, 1.07) * (0.78 + 0.9 * uAudioLevel);

    gl_FragColor = vec4(finalColor, totalAlpha);

    if (gl_FragColor.a < 0.025) discard;
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

    // Dùng MAX để nhận diện peak, scale nhẹ hơn nữa
    const freq = props.frequencyData;
    let audioLevel = 0;
    if (freq && freq.length > 0) {
      audioLevel = Math.max(...freq) / 255;
    }
    audioLevel = Math.pow(audioLevel, 1.13) * 0.95 + 0.015;

    pointsRef.current.material.uniforms.uAudioLevel.value = audioLevel;

    for (let i = 0; i < props.PARTICLE_COUNT; i++) {
      pointsRef.current.material.uniforms.uData.value[i] =
        props.frequencyData?.[i % props.frequencyData.length] ?? 0;
    }
  });

  const positions = useMemo(() => {
    const arr = [];
    for (let t = 0; t < TRAIL_STEPS; t++) {
      for (let i = 0; i < props.PARTICLE_COUNT; i++) {
        arr.push(0, 0, 0);
      }
    }
    return new Float32Array(arr);
  }, [props.PARTICLE_COUNT]);

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
          args={[positions, 3, true]}
        />
        <bufferAttribute
          attach="attributes-trailStep"
          args={[trailStepsArray, 1, true]}
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
