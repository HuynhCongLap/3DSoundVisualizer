import { useState, useEffect, useRef } from "react";
import Select from "react-select";
import AudioUploader from "./components/AudioUploader";
import AudioControls from "./components/AudioControls";
import { useAudioAnalyser } from "./hooks/useAudioAnalyser";
import { Canvas} from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { EffectComposer, Bloom, ChromaticAberration, Glitch } from "@react-three/postprocessing";
import LayeredAuroraParticlesVisualizer from "./components/LayeredAuroraParticlesVisualizer";
import AudioGalaxyParticlesVisualizer from "./components/AudioGalaxyParticlesVisualizer";
import AudioTunnelWaveVisualizer from "./components/AudioTunnelWaveVisualizer";
import CameraResetter from "./components/CameraResetter"; // Đường dẫn tùy bạn

// Preset options for visualizer
const visualizerOptions = [
  { value: "aurora", label: "Layered Aurora Morph" },
  { value: "galaxy", label: "Galaxy Spiral" },
  { value: "tunnel", label: "Tunnel Wave" }
];

type VisualizerType = typeof visualizerOptions[number]["value"];

function App() {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const { frequencyData, isPlaying, audioElement, gainNode } = useAudioAnalyser(audioFile);
  const [volume, setVolume] = useState(0.7);
  const [visualizerType, setVisualizerType] = useState<VisualizerType>("aurora");
  // ... bên trong App ...
  const controlsRef = useRef<any>(null);

  // Sync gainNode when volume changes
  useEffect(() => {
    if (gainNode) {
      gainNode.gain.value = volume;
    }
  }, [gainNode, volume]);

  const handlePlayPause = () => {
    if (!audioElement) return;
    if (isPlaying) {
      audioElement.pause();
    } else {
      audioElement.play();
    }
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-[#11101d] via-[#23243a] to-[#120a16]">
      {/* Upload audio if none selected */}
      {!audioFile && (
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          <AudioUploader onFile={setAudioFile} />
        </div>
      )}

      {/* Visualizer selector using react-select */}
      {audioFile && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-30 w-56">
          <Select
            options={visualizerOptions as any}
            value={visualizerOptions.find(o => o.value === visualizerType)}
            onChange={opt => setVisualizerType(opt!.value as VisualizerType)}
            theme={theme => ({
              ...theme,
              borderRadius: 12,
              colors: {
                ...theme.colors,
                neutral0: "#23243a",      // Dropdown background
                neutral80: "#fff",        // Main text
                primary25: "#a78bfa",     // Hover option
                primary: "#7c3aed",       // Selected option
              }
            })}
            isSearchable={false}
            styles={{
              control: (base) => ({
                ...base,
                background: "#23243a",
                border: "none",
                boxShadow: "0 2px 8px #0002",
                minHeight: "44px",
                color: "#fff",
              }),
              menu: (base) => ({
                ...base,
                background: "#23243a",
                borderRadius: "0.75rem",
                color: "#fff",
                boxShadow: "0 6px 24px #0003"
              }),
              singleValue: (base) => ({
                ...base,
                color: "#fff",
                fontWeight: 700,
                letterSpacing: "0.01em"
              }),
              option: (base, state) => ({
                ...base,
                background: state.isSelected
                  ? "#7c3aed"
                  : state.isFocused
                  ? "#a78bfa"
                  : "#23243a",
                color: "#fff",
                fontWeight: 600,
                cursor: "pointer",
                fontSize: "1rem"
              }),
            }}
          />
        </div>
      )}

      {/* Audio controls appear when file is loaded */}
      {audioFile && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20">
          <AudioControls
            isPlaying={isPlaying}
            onPlayPause={handlePlayPause}
            onVolume={setVolume}
            volume={volume}
          />
        </div>
      )}

      {/* Main 3D canvas */}
      <Canvas camera={{ position: [0, 2, 8], fov: 60 }}>
        <ambientLight intensity={1} />
        {frequencyData && (
          <>
            {visualizerType === "aurora" && (
              <LayeredAuroraParticlesVisualizer frequencyData={frequencyData} />
            )}
            {visualizerType === "galaxy" && (
              <AudioGalaxyParticlesVisualizer frequencyData={frequencyData} />
            )}
            {visualizerType === "tunnel" && frequencyData && (
              <AudioTunnelWaveVisualizer frequencyData={frequencyData} />
            )}
          </>
        )}
        <OrbitControls ref={controlsRef}/>
        <EffectComposer>
          <Bloom intensity={0.5} luminanceThreshold={0.08} luminanceSmoothing={0.92} height={1200} />
        </EffectComposer>
        <CameraResetter visualizerType={visualizerType} controlsRef={controlsRef} />
      </Canvas>
    </div>
  );
}

export default App;
