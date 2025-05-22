import { useEffect, useRef, useState } from "react";

// Custom hook to analyze audio file and return frequency data, playing state, audio element, and gain node
export function useAudioAnalyser(audioFile: File | null) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [frequencyData, setFrequencyData] = useState<Uint8Array | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null); // Use ref, not state!

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);

  useEffect(() => {
    if (!audioFile) {
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      setFrequencyData(null);
      setIsPlaying(false);
      setAudioElement(null);
      gainNodeRef.current = null;
      return;
    }

    const audioContext = new AudioContext();
    audioContextRef.current = audioContext;

    const audioElem = new Audio(URL.createObjectURL(audioFile));
    audioElem.crossOrigin = "anonymous";
    setAudioElement(audioElem);

    const source = audioContext.createMediaElementSource(audioElem);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 128;
    analyserRef.current = analyser;

    // Create GainNode via ref (NOT useState)
    const gain = audioContext.createGain();
    gainNodeRef.current = gain;

    source.connect(analyser);
    analyser.connect(gain);
    gain.connect(audioContext.destination);

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    dataArrayRef.current = dataArray;

    let animationId: number;
    const tick = () => {
      if (analyserRef.current && dataArrayRef.current) {
        analyserRef.current.getByteFrequencyData(dataArrayRef.current);
        setFrequencyData(new Uint8Array(dataArrayRef.current));
      }
      animationId = requestAnimationFrame(tick);
    };
    tick();

    audioElem.volume = 1;
    audioElem.play();
    setIsPlaying(true);

    audioElem.onplay = () => setIsPlaying(true);
    audioElem.onpause = () => setIsPlaying(false);

    return () => {
      audioElem.pause();
      audioElem.src = "";
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      gainNodeRef.current = null;
      cancelAnimationFrame(animationId);
    };
  }, [audioFile]);

  // Expose gainNode via ref (never undefined if hook worked)
  return { frequencyData, isPlaying, audioElement, gainNode: gainNodeRef.current };
}
