declare global {
  namespace React {
    namespace JSX {
      interface IntrinsicElements {
        particleCloudShader: any;
        // Thêm các shader khác nếu muốn:
        audioParticlesShader?: any;
        particleCloudTrailShader?: any;
      }
    }
  }
}
export {};