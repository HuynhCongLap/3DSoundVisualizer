import { useEffect, useState } from "react";

/**
 * Hook tạo dữ liệu tần số giả để visualizer có animation khi không có audio thật.
 * @param length Số bands (64, 128, 256 tuỳ visualizer của bạn)
 */
export default function useFakeFrequencyData(length = 128) {
  const [data, setData] = useState<Uint8Array>(() => new Uint8Array(length));

  useEffect(() => {
    let raf: number;
    function animate() {
      const arr = new Uint8Array(length);
      const t = Date.now() * 0.002;
      for (let i = 0; i < length; i++) {
        arr[i] = Math.floor(
          80 +
            70 * Math.sin(t + i * 0.3) +
            40 * Math.cos(t * 0.7 + i * 0.6) +
            Math.random() * 30
        );
      }
      setData(arr);
      raf = requestAnimationFrame(animate);
    }
    animate();
    return () => cancelAnimationFrame(raf);
  }, [length]);

  return data;
}
