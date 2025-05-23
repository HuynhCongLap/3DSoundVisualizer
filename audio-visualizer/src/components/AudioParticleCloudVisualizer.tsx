import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { shaderMaterial } from "@react-three/drei";
import { extend } from "@react-three/fiber";

const PARTICLE_COUNT = 5500;
const DATA_SIZE = 256;

const ParticleCloudShader = shaderMaterial(
  {
    uTime: 0,
    uData: new Array(DATA_SIZE).fill(0),
    uParticleCount: PARTICLE_COUNT,
    uIntensity: 1.0,
  },
  // Vertex Shader
  `
  precision mediump float;

  uniform float uTime;
  uniform float uData[256];
  uniform int uParticleCount;
  uniform float uIntensity;

  attribute float idx;
  varying float vFreq;
  varying float vNoise;
  varying vec3 vColor;
  varying float vGlow;
  varying float vDepthFade;
  varying float vRadius;

  // HSV to RGB cho rainbow
  vec3 hsv2rgb(vec3 c) {
      vec4 K = vec4(1., 2./3., 1./3., 3.);
      vec3 p = abs(fract(c.xxx + K.xyz) * 6. - K.www);
      return c.z * mix(K.xxx, clamp(p - K.xxx, 0., 1.), c.y);
  }

  void main() {
    float id = idx;
    float t = id / float(uParticleCount);

    float angle = t * 6.2831853 * 3.0 + uTime * 0.17;
    float swirl = 0.52 * sin(uTime * 0.37 + t * 13.2);

    float freq = uData[int(mod(id, 256.0))] / 255.0;
    float radius = 2.6 + sin(uTime*0.6 + id) * 0.32 + freq * (0.9 + 0.7*sin(uTime*0.9+t*5.2));
    float theta = angle + swirl + sin(uTime*0.23 + id*0.012);

    float rnd = fract(sin(id*1.13)*43758.5453);
    float phi = acos(2.0 * rnd - 1.0);

    vec3 pos = vec3(
      radius * sin(phi) * cos(theta),
      radius * sin(phi) * sin(theta),
      radius * cos(phi)
    );

    float chaos = sin(uTime + id*0.0012)*0.42 + cos(uTime*0.8 + id*0.0007)*0.33;
    pos += vec3(
      chaos*freq*0.88 * sin(uTime*1.18+id*0.041),
      chaos*freq*0.92 * cos(uTime*0.77+id*0.035),
      chaos*freq*0.58 * sin(uTime*1.03-id*0.019)
    );

    float pulse = smoothstep(0.68, 0.97, freq) * 1.19;
    pos *= 1.0 + pulse * (0.73 + 0.37*sin(uTime*2.5+t*11.0));

    vFreq = freq;
    vNoise = chaos;
    vGlow = pulse;
    vRadius = radius;

    // --- MULTI-PALETTE GRADIENT + HSV RAINBOW ---
    // 6 màu pastel (hơi hướng "aurora"/spectrum)
    vec3 palette[6];
    palette[0] = vec3(0.13, 0.82, 0.99);  // blue cyan
    palette[1] = vec3(0.61, 0.88, 0.99);  // pale blue
    palette[2] = vec3(0.88, 0.70, 1.00);  // pastel purple
    palette[3] = vec3(1.00, 0.72, 0.86);  // pink
    palette[4] = vec3(0.98, 0.91, 0.64);  // yellow
    palette[5] = vec3(0.78, 1.00, 0.74);  // mint green

    float paletteMix = mod(t * 5.0 + freq*1.7 + swirl, 5.0);
    int idxA = int(floor(paletteMix));
    int idxB = idxA == 5 ? 0 : idxA + 1;
    float paletteFrac = fract(paletteMix);

    vec3 baseColor = mix(palette[idxA], palette[idxB], paletteFrac);

    // Mix thêm rainbow HSV để thêm sparkle
    float rainbowH = mod(t*1.3 + freq*0.8 + uTime*0.10, 1.0);
    vec3 rainbow = hsv2rgb(vec3(rainbowH, 0.85-0.3*freq, 0.92+0.2*freq));
    // trộn với base
    vec3 mixed = mix(baseColor, rainbow, 0.34 + 0.21*freq);

    // Highlight vàng ở viền ngoài
    vec3 gold = vec3(1.00, 0.97, 0.82);
    float goldEdge = smoothstep(3.0, 4.3, radius);
    vColor = mix(mixed, gold, goldEdge*0.65 + freq*0.08);

    // Fade particle alpha by Z-depth (xa thì mờ)
    float camZ = (modelViewMatrix * vec4(pos, 1.0)).z;
    vDepthFade = smoothstep(-2.0, -7.0, camZ);

    // Size dynamic
    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    float dist = abs(gl_Position.w);
    float baseSize = 32.0 + 24.0 * freq + 10.0 * pulse;
    gl_PointSize = clamp(baseSize / dist, 2.0, 24.0);
  }
  `,
  // Fragment Shader (CHỈ CẦN THÊM TWINKLE)
  `
  precision mediump float;

  varying float vFreq;
  varying float vNoise;
  varying vec3 vColor;
  varying float vGlow;
  varying float vDepthFade;
  varying float vRadius;

  uniform float uTime; // <- THÊM DÒNG NÀY

  void main() {
    float d = length(gl_PointCoord - vec2(0.5));
    float mainDisc = smoothstep(0.48, 0.21, d);
    float bokeh = smoothstep(0.27, 0.18, d) - smoothstep(0.38, 0.40, d);
    float angle = atan(gl_PointCoord.y - 0.5, gl_PointCoord.x - 0.5);
    float rays = pow(abs(sin(8.0 * angle)), 3.1) * (1.0 - d) * 0.14;
    float center = smoothstep(0.13, 0.07, d);

    float edgeGlow = smoothstep(3.0, 4.3, vRadius);

    float a = mainDisc * (0.20 + vFreq * 1.10) + bokeh * 0.17 + rays * 0.13 + center * 0.13;
    a *= 0.94 * vDepthFade;

    // ---- TWINKLE/SPARKLE ----
    float sparkle =
      0.78 + 0.35 * sin(
        uTime * (2.6 + vFreq * 3.1)
        + vRadius * 2.2
        + vGlow * 2.3
        + vNoise * 11.1
      );
    a *= clamp(sparkle, 0.65, 1.15);

    // Edge glow: gold + white highlight
    vec3 color = mix(vColor, vec3(1.0, 0.98, 0.92), 0.11*edgeGlow + 0.13*vGlow);

    color *= 1.13;

    gl_FragColor = vec4(color, a);

    if(gl_FragColor.a < 0.03) discard;
  }
  `
);

extend({ ParticleCloudShader });

type Props = {
  frequencyData: Uint8Array;
};

export default function AudioParticleCloudVisualizer({ frequencyData }: Props) {
  const pointsRef = useRef<any>(null);

  useFrame(({ clock }) => {
    if (!pointsRef.current) return;
    pointsRef.current.material.uniforms.uTime.value = clock.getElapsedTime();
    for (let i = 0; i < DATA_SIZE; i++) {
      pointsRef.current.material.uniforms.uData.value[i] =
        frequencyData?.[i % frequencyData.length] ?? 0;
    }
  });

  const positions = useMemo(() => {
    const arr = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) arr.push(0, 0, 0);
    return new Float32Array(arr);
  }, []);

  const idxArray = useMemo(() => {
    const arr = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) arr.push(i);
    return new Float32Array(arr);
  }, []);

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-idx" args={[idxArray, 1]} />
      </bufferGeometry>
      <particleCloudShader
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
