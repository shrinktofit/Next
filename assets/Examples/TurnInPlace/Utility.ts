import { clamp01, lerp } from "cc";

export function clampMap(
    value: number,
    inputMin: number, inputMax: number,
    outputMin: number, outputMax: number,
) {
    const t = (value - inputMin) / (inputMax - inputMin);
    const clamped = clamp01(t);
    return lerp(outputMin, outputMax, clamped);
}