
declare module "cc/editor/exotic-animation" {
    import {
        __private,
    } from 'cc';

    export const exoticAnimationTag: unique symbol;

    export class ExoticAnimation {
        public addNodeAnimation (path: string): __private._cocos_animation_exotic_animation_exotic_animation__ExoticNodeAnimation
    
        public collectAnimatedJoints (): string[];
    
        public split (from: number, to: number): ExoticAnimation;
    }

    export enum TransformFlag {
        POSITION = 0b111,
    
        ROTATION_X = 0b001_000,
        ROTATION_Y = 0b010_000,
        ROTATION_Z = 0b100_000,
        ROTATION = ROTATION_X | ROTATION_Y | ROTATION_Z,
    
        SCALE = 0b111_000_000,
    
        ALL = POSITION | ROTATION | SCALE,
    }
    
    export function removeNodeTransformAnimation(clip: AnimationClip, path: string, flags: TransformFlag): void;
}

declare module "cc/editor/serialization" {
    export class CCON {
        constructor(document: unknown, chunks: Uint8Array[]);
        get document(): unknown;
        get chunks(): Uint8Array[];
    }
    export function encodeCCONJson(ccon: CCON, chunkURLs: string[]): unknown;
    export function encodeCCONBinary(ccon: CCON): Uint8Array;
    export class BufferBuilder {
        get byteLength(): number;
        alignAs(align: number): number;
        append(view: ArrayBufferView): number;
        get(): Uint8Array;
    }
    export function decodeCCONBinary(bytes: Uint8Array): CCON;
    export function parseCCONJson(json: unknown): {
        chunks: string[];
        document: unknown;
    };
    export {};
}
