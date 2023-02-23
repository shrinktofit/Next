import { clamp } from "cc";

export function interopTo(from: number, to: number, deltaTime: number, speed: number): number {
    if (speed <= 0.0) {
        return to;
    }
    const diff = to - from;
    if ((diff ** 2) < 1e-8) {
        return to;
    }
    // TODO: why? The `speed` means percentage/s?
    const delta = diff * clamp(deltaTime * speed, 0.0, 1.0);
    return from + delta;
}
