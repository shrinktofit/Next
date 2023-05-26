import { sys } from "cc";
import { EDITOR } from "cc/env";

declare global {
    namespace globalThis {
        interface Navigator {
            msMaxTouchPoints: number;
        }
    }
}

export function useMouseInput() {
    return !isTouchDevice();
}

function isTouchDevice() {
    return !EDITOR && sys.hasFeature(sys.Feature.INPUT_TOUCH);
}