import {DreiShaderMaterial} from "./components/AudioParticlesVisualizerLayer.tsx";

declare global {
    namespace JSX {
        interface IntrinsicElements {
            audioParticlesShader: ReactThreeFiber.Node<typeof AudioParticlesShader & JSX.IntrinsicElements['audioParticlesShader'], typeof AudioParticlesShader>
        }
    }
}