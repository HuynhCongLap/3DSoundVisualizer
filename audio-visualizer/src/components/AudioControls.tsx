type Props = {
  isPlaying: boolean;
  onPlayPause: () => void;
  onVolume: (volume: number) => void;
  volume: number;
};

export default function AudioControls({ isPlaying, onPlayPause, onVolume, volume }: Props) {
  return (
    <div className="flex items-center gap-4 px-6 py-3 bg-black/40 rounded-lg shadow-lg">
      {/* Play/Pause Button */}
      <button
        onClick={onPlayPause}
        className="text-white bg-indigo-600 hover:bg-indigo-700 rounded-full w-10 h-10 flex items-center justify-center"
        title={isPlaying ? "Pause" : "Play"}
      >
        {/* Icon changes depending on playing state */}
        {isPlaying ? (
          <svg width="24" height="24" fill="none" stroke="currentColor"><rect x="6" y="6" width="4" height="12"/><rect x="14" y="6" width="4" height="12"/></svg>
        ) : (
          <svg width="24" height="24" fill="none" stroke="currentColor"><polygon points="6,4 20,12 6,20" /></svg>
        )}
      </button>

      {/* Volume Slider */}
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={volume}
        onChange={e => onVolume(Number(e.target.value))}
        className="w-32 accent-indigo-500"
        title="Volume"
      />
      <span className="text-white">{Math.round(volume * 100)}%</span>
    </div>
  );
}
