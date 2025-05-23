import { useState, useEffect, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import AudioTunnelWaveVisualizer from "./components/AudioTunnelWaveVisualizer";
import AudioParticleCloudVisualizer from "./components/AudioParticleCloudVisualizer";
import CameraResetter from "./components/CameraResetter";
import { useAudioAnalyser } from "./hooks/useAudioAnalyser";
import useFakeFrequencyData from "./hooks/useFakeFrequencyData";
import {
  Play, Pause, SkipForward, SkipBack, Shuffle, Repeat, Plus, Volume2, Eye, Music
} from "lucide-react";
import LayeredAuroraParticlesVisualizer from "./components/LayeredAuroraParticlesVisualizer";
import YouTubeSearchBar from "./components/YouTubeSearchBar";

// Định nghĩa type Song cho cả mp3/local và YouTube
type Song =
  | File
  | { name: string; url: string }
  | { name: string; youtubeId: string; type: "youtube"; thumbnail: string };

const visualizerOptions = [
  { value: "tunnel", label: "Tunnel Wave" },
  { value: "cloud", label: "Particle Cloud" },
  { value: "aurora", label: "Aurora" },
];
type VisualizerType = typeof visualizerOptions[number]["value"];

function formatTime(s: number) {
  if (isNaN(s)) return "0:00";
  const min = Math.floor(s / 60);
  const sec = Math.floor(s % 60).toString().padStart(2, "0");
  return `${min}:${sec}`;
}

function useObjectUrl(file: File | null) {
  const [url, setUrl] = useState<string>("");
  useEffect(() => {
    if (!file) {
      setUrl("");
      return;
    }
    const objUrl = URL.createObjectURL(file);
    setUrl(objUrl);
    return () => {
      URL.revokeObjectURL(objUrl);
    };
  }, [file]);
  return url;
}

export default function App() {
  // State
  const [playlist, setPlaylist] = useState<Song[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const currentSong = playlist[currentIndex] || null;
  const [showPlaylist, setShowPlaylist] = useState(true);
  const [showEffectMenu, setShowEffectMenu] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showYTSearch, setShowYTSearch] = useState(false);
  const [loadingDemo, setLoadingDemo] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const [visualizerType, setVisualizerType] = useState<VisualizerType>("cloud");
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [repeat, setRepeat] = useState(false);
  const [shuffle, setShuffle] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const controlsRef = useRef<any>(null);

  // Song Info
  const songName = currentSong
    ? "name" in currentSong
      ? (currentSong as { name: string }).name
      : (currentSong as File).name.replace(/\.[^/.]+$/, "")
    : "";
  const artistName = "Unknown Artist";

  // File/URL for current song
  const fileSong =
    currentSong && !(typeof currentSong === "object" && "youtubeId" in currentSong)
      ? currentSong instanceof File
        ? currentSong
        : null
      : null;
  const fileSongUrl = useObjectUrl(fileSong);
  const audioSource =
    fileSongUrl ||
    (currentSong &&
    typeof currentSong === "object" &&
    "url" in currentSong &&
    !("youtubeId" in currentSong)
      ? currentSong.url
      : "");

  // Check bài hiện tại là YouTube?
  const isYouTube =
    currentSong &&
    typeof currentSong === "object" &&
    "youtubeId" in currentSong &&
    currentSong.type === "youtube";

  // Hook phân tích audio thật (mp3/local)
  const {
    frequencyData: realFrequencyData,
    isPlaying,
    audioElement,
    gainNode
  } = useAudioAnalyser(isYouTube ? "" : audioSource);

  // Dữ liệu tần số giả cho YouTube (nên để 128 hoặc tuỳ visualizer)
  const fakeFrequencyData = useFakeFrequencyData(128);

  // Dữ liệu đưa vào visualizer: thật nếu mp3, giả nếu YouTube
  const visualizerFrequencyData = isYouTube ? fakeFrequencyData : realFrequencyData;

  // Volume (gain)
  useEffect(() => {
    if (gainNode) gainNode.gain.value = volume;
  }, [gainNode, volume]);

  // Sync currentTime/duration (mp3/local only)
  useEffect(() => {
    if (!audioElement || isYouTube) return;
    const update = () => {
      setCurrentTime(audioElement.currentTime);
      setDuration(audioElement.duration || 0);
    };
    audioElement.addEventListener("timeupdate", update);
    audioElement.addEventListener("loadedmetadata", update);
    return () => {
      audioElement.removeEventListener("timeupdate", update);
      audioElement.removeEventListener("loadedmetadata", update);
    };
  }, [audioElement, isYouTube]);

  // Auto play mỗi khi đổi bài hoặc audio element mới
  useEffect(() => {
    if (audioElement && playlist.length > 0 && !isYouTube) {
      audioElement.currentTime = 0;
      audioElement.play().catch(() => {});
    }
  }, [audioElement, currentSong, playlist.length, isYouTube]);

  // Seek nhạc (mp3/local only)
  const handleSeek = (val: number) => {
    if (audioElement && !isYouTube) audioElement.currentTime = val;
    setCurrentTime(val);
  };

  // Play/pause (mp3/local only)
  const handlePlayPause = () => {
    if (!currentSong || !audioElement || isYouTube) return;
    if (isPlaying) audioElement.pause();
    else audioElement.play();
  };

  // Next/Prev logic
  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(idx => idx - 1);
    } else if (audioElement && !isYouTube) {
      audioElement.currentTime = 0;
    }
  };
  const handleNext = () => {
    if (shuffle && playlist.length > 1) {
      let next;
      do {
        next = Math.floor(Math.random() * playlist.length);
      } while (next === currentIndex && playlist.length > 1);
      setCurrentIndex(next);
    } else if (currentIndex < playlist.length - 1) {
      setCurrentIndex(idx => idx + 1);
    } else if (repeat && playlist.length > 0) {
      setCurrentIndex(0);
    }
  };

  // Add song: menu dropdown
  const handleAddSong = () => setShowAddMenu(v => !v);

  // Upload local file - AUTO PLAY ngay sau khi upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setPlaylist(prev => [...prev, ...files]);
      if (playlist.length === 0 && files.length > 0) setCurrentIndex(0);
      setShowAddMenu(false);

      setTimeout(() => {
        const audio = document.querySelector("audio");
        if (audio) audio.play().catch(() => {});
      }, 220);
    }
  };

  // Try my playlist: fetch demo-playlist.json, auto play
  const handleTryDemoPlaylist = async () => {
    setLoadingDemo(true);
    try {
      const res = await fetch("/demo-songs/demo-playlist.json");
      if (!res.ok) throw new Error(`Playlist not found! Status: ${res.status}`);
      const songs: Song[] = await res.json();
      setPlaylist(songs);
      setCurrentIndex(0);
      setShowAddMenu(false);

      setTimeout(() => {
        const audio = document.querySelector("audio");
        if (audio) audio.play().catch(() => {});
      }, 220);
    } catch (err) {
      alert("Could not load demo playlist.\n" + err);
      console.error("Fetch demo-playlist.json error:", err);
    }
    setLoadingDemo(false);
  };

  // Khi hết bài, auto next bài tiếp theo (nếu có)
  useEffect(() => {
    if (!audioElement || isYouTube) return;
    const handleEnded = () => {
      if (shuffle && playlist.length > 1) {
        let next;
        do {
          next = Math.floor(Math.random() * playlist.length);
        } while (next === currentIndex && playlist.length > 1);
        setCurrentIndex(next);
      } else if (currentIndex < playlist.length - 1) {
        setCurrentIndex(idx => idx + 1);
      } else if (repeat && playlist.length > 0) {
        setCurrentIndex(0);
      }
    };
    audioElement.addEventListener("ended", handleEnded);
    return () => audioElement.removeEventListener("ended", handleEnded);
  }, [audioElement, playlist.length, currentIndex, repeat, shuffle, isYouTube]);

  // Close menu khi click ra ngoài
  useEffect(() => {
    const onClick = () => {
      setShowEffectMenu(false);
      setShowAddMenu(false);
      setShowYTSearch(false);
    };
    if (showEffectMenu || showAddMenu || showYTSearch) {
      window.addEventListener("click", onClick);
      return () => window.removeEventListener("click", onClick);
    }
  }, [showEffectMenu, showAddMenu, showYTSearch]);

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-[#11101d] via-[#23243a] to-[#120a16]">
      {/* Floating menu góc phải */}
      <div className="fixed top-6 right-10 z-50 flex flex-col items-end gap-3">
        {/* Nút icon Visualizer */}
        <div className="relative">
          <button
            className="w-10 h-10 flex items-center justify-center rounded-full bg-black/50 border border-indigo-400 hover:bg-indigo-800 transition relative"
            onClick={e => { e.stopPropagation(); setShowEffectMenu(v => !v); }}
            title="Select Visualizer"
          >
            <Eye className="w-6 h-6 text-indigo-300" />
          </button>
          {showEffectMenu && (
            <div className="absolute top-12 right-0 bg-[#23243a] rounded-xl shadow-xl border border-indigo-800 p-2 min-w-[160px] z-50 animate-fade-in"
              onClick={e => e.stopPropagation()}
            >
              {visualizerOptions.map(opt => (
                <button
                  key={opt.value}
                  className={`w-full text-left px-4 py-2 rounded-lg mb-1
                    ${visualizerType === opt.value ? "bg-indigo-600 text-white font-bold" : "hover:bg-indigo-700/50 text-indigo-100"}`}
                  onClick={() => { setVisualizerType(opt.value as VisualizerType); setShowEffectMenu(false); }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
        {/* Nút toggle show/hide playlist */}
        {playlist.length > 0 && (
          <button
            className="w-10 h-10 flex items-center justify-center rounded-full bg-black/50 border border-indigo-600 hover:bg-indigo-900 transition"
            onClick={e => { e.stopPropagation(); setShowPlaylist(v => !v); }}
            title={showPlaylist ? "Hide Playlist" : "Show Playlist"}
          >
            <span className="text-indigo-300 text-xs font-bold">PL</span>
          </button>
        )}
        {/* Nút mở YouTube Search */}
        <button
          className="w-10 h-10 flex items-center justify-center rounded-full bg-black/50 border border-indigo-400 hover:bg-indigo-800 transition"
          onClick={e => { e.stopPropagation(); setShowYTSearch(v => !v); }}
          title="Add online music"
        >
          <Music className="w-6 h-6 text-indigo-200" />
        </button>
        {/* Playlist */}
        {showPlaylist && playlist.length > 0 && (
          <div className="w-80 max-h-96 bg-black/50 rounded-xl shadow px-4 py-3 backdrop-blur-lg border border-indigo-700/50 mt-2">
            <div className="text-indigo-300 text-xs mb-2 font-bold tracking-wider">Playlist</div>
            <ul className="max-h-80 overflow-y-auto custom-scrollbar">
              {playlist.map((song, i) => (
                <li
                  key={i}
                  onClick={() => setCurrentIndex(i)}
                  className={`py-1 px-2 rounded cursor-pointer mb-1 flex items-center gap-2
                    ${i === currentIndex ? "bg-indigo-700/60 text-white font-bold" : "hover:bg-indigo-900/30 text-slate-300"}`}
                >
                  <span className="truncate flex-1">
                    {"youtubeId" in (song as any)
                      ? (song as any).name + " (YouTube)"
                      : "name" in song
                        ? (song as { name: string }).name
                        : (song as File).name.replace(/\.[^/.]+$/, "")
                    }
                  </span>
                  {i === currentIndex && <span className="text-indigo-200 text-xs">●</span>}
                </li>
              ))}
            </ul>
          </div>
        )}
        {/* YouTube SearchBar popup */}
        {showYTSearch && (
          <YouTubeSearchBar
            onAddToPlaylist={song => {
              setPlaylist(prev => [...prev, song]);
              if (playlist.length === 0) setCurrentIndex(0);
            }}
            onClose={() => setShowYTSearch(false)}
          />
        )}
      </div>

      {/* Main 3D canvas */}
      <Canvas camera={{ position: [0, 2, 8], fov: 60 }}>
        <ambientLight intensity={1} />
        {visualizerFrequencyData && (
          <>
            {visualizerType === "tunnel" && (
              <AudioTunnelWaveVisualizer frequencyData={visualizerFrequencyData} />
            )}
            {visualizerType === "cloud" && (
              <AudioParticleCloudVisualizer frequencyData={visualizerFrequencyData} />
            )}
            {visualizerType === "aurora" && (
              <LayeredAuroraParticlesVisualizer frequencyData={visualizerFrequencyData} />
            )}
          </>
        )}
        <OrbitControls ref={controlsRef} />
        <EffectComposer>
          <Bloom intensity={0.2} luminanceThreshold={0.08} luminanceSmoothing={0.92} height={1200} />
        </EffectComposer>
        <CameraResetter visualizerType={visualizerType} controlsRef={controlsRef} />
      </Canvas>

      {/* Hiện iframe nhỏ góc phải dưới nếu đang là bài YouTube */}
      {isYouTube && (
        <div className="fixed bottom-6 right-8 z-50 shadow-2xl rounded-xl overflow-hidden border-2 border-indigo-800 bg-black/90">
          <iframe
            width={320}
            height={180}
            src={`https://www.youtube.com/embed/${(currentSong as any).youtubeId}?autoplay=1&controls=1`}
            frameBorder={0}
            allow="autoplay; encrypted-media"
            allowFullScreen
            title={songName}
            className="block"
          />
        </div>
      )}

      {/* Music Controls UI */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center w-full">
        {/* Song info hoặc hướng dẫn thêm nhạc */}
        <div className="mb-2 text-center min-h-[48px] flex flex-col items-center justify-center">
          {currentSong ? (
            <>
              <div className="text-lg font-semibold text-white">{songName}</div>
              <div className="text-sm text-indigo-300">{artistName}</div>
            </>
          ) : (
            <div className="text-slate-400 text-base italic">
              No song selected — Click
              <span className="inline-block px-2 py-1 bg-indigo-700/60 rounded-lg mx-1 text-white font-semibold">+</span>
              to add music
            </div>
          )}
        </div>
        {/* Controls row */}
        <div className="flex items-center gap-4 bg-black/60 px-6 py-3 rounded-2xl shadow-lg backdrop-blur">
          <button onClick={handlePrev} disabled={!currentSong}
            className={`p-2 hover:bg-indigo-800/40 rounded-full ${!currentSong ? "opacity-30 cursor-not-allowed" : ""}`}
            title="Prev">
            <SkipBack className="w-6 h-6 text-indigo-300" />
          </button>
          <button
            disabled={!currentSong || isYouTube}
            className={`p-3 rounded-full bg-indigo-600 shadow-lg hover:scale-110 transition ${!currentSong || isYouTube ? "opacity-40 cursor-not-allowed" : ""}`}
            onClick={handlePlayPause}
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? <Pause className="w-7 h-7 text-white" /> : <Play className="w-7 h-7 text-white" />}
          </button>
          <button onClick={handleNext} disabled={!currentSong}
            className={`p-2 hover:bg-indigo-800/40 rounded-full ${!currentSong ? "opacity-30 cursor-not-allowed" : ""}`}
            title="Next">
            <SkipForward className="w-6 h-6 text-indigo-300" />
          </button>
          <button
            className={`p-2 hover:bg-indigo-800/40 rounded-full ${shuffle ? "bg-indigo-500/30" : ""}`}
            onClick={() => setShuffle(s => !s)}
            title="Shuffle"
            disabled={!currentSong}
          >
            <Shuffle className="w-5 h-5 text-indigo-300" />
          </button>
          <button
            className={`p-2 hover:bg-indigo-800/40 rounded-full ${repeat ? "bg-indigo-500/30" : ""}`}
            onClick={() => setRepeat(r => !r)}
            title="Repeat"
            disabled={!currentSong}
          >
            <Repeat className="w-5 h-5 text-indigo-300" />
          </button>
          {/* Add Song button: dropdown menu */}
          <div className="relative">
            <button
              className="p-2 hover:bg-indigo-800/40 rounded-full"
              title="Add Song"
              onClick={e => { e.stopPropagation(); handleAddSong(); }}
            >
              <Plus className="w-5 h-5 text-indigo-300" />
            </button>
            {showAddMenu && (
              <div
                className="absolute right-0 bottom-14 bg-[#23243a] rounded-xl shadow-xl border border-indigo-800 p-2 min-w-[190px] max-w-[250px] z-50 animate-fade-in"
                style={{}}
                onClick={e => e.stopPropagation()}
              >
                {/* menu items */}
                <button
                  className="w-full text-left px-4 py-2 rounded-lg mb-1 hover:bg-indigo-700/50 text-indigo-100"
                  onClick={() => { setShowAddMenu(false); fileInputRef.current?.click(); }}
                >Upload from your device</button>
                <button
                  className="w-full text-left px-4 py-2 rounded-lg hover:bg-indigo-700/50 text-indigo-100 flex items-center gap-2 disabled:opacity-50"
                  onClick={handleTryDemoPlaylist}
                  disabled={loadingDemo}
                >
                  {loadingDemo && <span className="animate-spin w-4 h-4 border-b-2 border-white rounded-full inline-block"></span>}
                  🎵 Try my playlist
                </button>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".mp3,audio/mp3,audio/mpeg"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        </div>
        {/* Seekbar (chỉ cho mp3/local, không cho YouTube) */}
        {!isYouTube && (
          <>
            <div className="flex items-center w-[380px] max-w-full gap-3 mt-3">
              <span className="text-xs text-slate-300 w-9 text-right">{formatTime(currentTime)}</span>
              <input
                type="range"
                min={0}
                max={duration}
                value={currentSong ? currentTime : 0}
                onChange={e => handleSeek(Number(e.target.value))}
                disabled={!currentSong}
                className={`flex-1 accent-indigo-500 h-2 rounded-full ${!currentSong ? "opacity-40 cursor-not-allowed" : ""}`}
              />
              <span className="text-xs text-slate-300 w-9">{formatTime(duration)}</span>
            </div>
            {/* Volume */}
            <div className="flex items-center gap-2 mt-2">
              <Volume2 className="w-5 h-5 text-indigo-300" />
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={volume}
                onChange={e => setVolume(+e.target.value)}
                className="accent-indigo-400"
                style={{ width: 90 }}
                disabled={!currentSong}
              />
            </div>
          </>
        )}
      </div>

      {/* Custom scrollbar CSS */}
      <style>
        {`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #6d28d9;
          border-radius: 8px;
        }
        .custom-scrollbar {
          scrollbar-color: #6d28d9 #23243a;
          scrollbar-width: thin;
        }
        .animate-fade-in {
          animation: fadeIn 0.22s;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-12px);}
          to { opacity: 1; transform: none;}
        }
        `}
      </style>
    </div>
  );
}
