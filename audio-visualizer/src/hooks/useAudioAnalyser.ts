import { useState, useEffect, useRef } from "react";

// Chỉ nhận string url, không nhận File!
export function useAudioAnalyser(audioSrc: string) {
  const [frequencyData, setFrequencyData] = useState<Uint8Array | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [gainNode, setGainNode] = useState<GainNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  useEffect(() => {
    if (!audioSrc) {
      setAudioElement(null);
      setIsPlaying(false);
      setGainNode(null);
      setFrequencyData(null);
      return;
    }
    // Tạo audio element với src đã là string url
    const audio = new window.Audio(audioSrc);
    audio.crossOrigin = "anonymous";
    audio.preload = "auto";
    setAudioElement(audio);

    // AudioContext setup
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const srcNode = ctx.createMediaElementSource(audio);
    const analyser = ctx.createAnalyser();
    const gain = ctx.createGain();
    srcNode.connect(gain);
    gain.connect(analyser);
    analyser.connect(ctx.destination);

    analyser.fftSize = 256;
    analyserRef.current = analyser;
    setGainNode(gain);

    let frameId: number;
    function update() {
      const arr = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(arr);
      setFrequencyData(arr);
      frameId = requestAnimationFrame(update);
    }
    update();

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);

    return () => {
      cancelAnimationFrame(frameId);
      audio.pause();
      audio.src = "";
      srcNode.disconnect();
      gain.disconnect();
      analyser.disconnect();
      ctx.close();
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      setAudioElement(null);
      setIsPlaying(false);
      setGainNode(null);
      setFrequencyData(null);
    };
  }, [audioSrc]);

  return { frequencyData, isPlaying, audioElement, gainNode };
}
