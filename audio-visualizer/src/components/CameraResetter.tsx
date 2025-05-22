import { useEffect } from "react";
import { useThree } from "@react-three/fiber";

export default function CameraResetter({ visualizerType, controlsRef }: { visualizerType: string, controlsRef: any }) {
  const { camera } = useThree();

  useEffect(() => {
    camera.position.set(0, 2, 8);
    camera.lookAt(0, 0, 0);
    controlsRef.current?.reset?.();
  }, [visualizerType, camera, controlsRef]);

  return null;
}
