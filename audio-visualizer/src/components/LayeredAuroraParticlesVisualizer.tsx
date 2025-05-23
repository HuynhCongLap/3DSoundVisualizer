import AudioParticlesVisualizerLayer from "./AudioParticlesVisualizerLayer";

export default function LayeredAuroraParticlesVisualizer({ frequencyData }: { frequencyData: Uint8Array }) {
  return (
    <>
      {/* Layer 1: luxury cyan-purple */}
      <AudioParticlesVisualizerLayer
        frequencyData={frequencyData}
        PARTICLE_COUNT={1200}
        morphSpeed={0.006}
        morphOffset={0.0}
        colorA="#70e2ff"
        colorB="#c997fc"
        glowColor="#f3e6ff"
        hueBase={0.55} hueRange={0.20}
        satBase={0.74} satRange={0.18}
        valBase={0.94} valRange={0.08}
        alphaBase={0.16} alphaGlow={0.46}
      />
      {/* Layer 2: deep aurora blue-purple */}
      <AudioParticlesVisualizerLayer
        frequencyData={frequencyData}
        PARTICLE_COUNT={900}
        morphSpeed={0.0046}
        morphOffset={0.19}
        colorA="#95f7ef"
        colorB="#b48bf0"
        glowColor="#b6e6fa"
        hueBase={0.48} hueRange={0.20}
        satBase={0.64} satRange={0.15}
        valBase={0.92} valRange={0.10}
        alphaBase={0.11} alphaGlow={0.29}
      />
      {/* Layer 3: soft pink-blue */}
      <AudioParticlesVisualizerLayer
        frequencyData={frequencyData}
        PARTICLE_COUNT={600}
        morphSpeed={0.0041}
        morphOffset={0.38}
        colorA="#7ecbff"
        colorB="#ec8dfd"
        glowColor="#c9f3fc"
        hueBase={0.56} hueRange={0.19}
        satBase={0.71} satRange={0.16}
        valBase={0.91} valRange={0.08}
        alphaBase={0.09} alphaGlow={0.23}
      />
    </>
  );
}
