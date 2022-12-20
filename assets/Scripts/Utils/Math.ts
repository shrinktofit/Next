import * as cc from "cc";

export const VEC3_NEGATIVE_Y = Object.freeze(new cc.Vec3(0.0, -1.0, 0.0));

export function atan2Positive(y: number, x: number) {
    const r = Math.atan2(y, x);
    return r < 0 ? r + Math.PI * 2 : r;
}

export function reflect (out: cc.math.Vec3, input: cc.math.Vec3, normal: cc.math.Vec3) {
    return cc.math.Vec3.scaleAndAdd(out, input, normal, -2.0 * cc.math.Vec3.dot(input, normal));
}

export function toward(source: number, dest: number, maxStep: number) {
    const difference = dest - source;
    const distance = Math.abs(difference);
    const step = Math.sign(difference) * Math.min(distance, maxStep);
    return source += step;
}

export function towardVec3(source: cc.math.Vec3, dest: cc.math.Vec3, maxStep: cc.math.Vec3, out?: cc.math.Vec3) {
    out ??= new cc.math.Vec3();
    out.x = toward(source.x, dest.x, maxStep.x);
    out.y = toward(source.y, dest.y, maxStep.y);
    out.z = toward(source.z, dest.z, maxStep.z);
    return out;
}

const CACHE_A = new cc.Vec3();
const CACHE_B = new cc.Vec3();

export function getVectorAngleRightExclusive(a: cc.Vec3, b: cc.Vec3) {
    return cc.Vec3.angle(a, b);
    // const aNormalized = cc.Vec3.normalize(CACHE_A, a);
    // const bNormalized = cc.Vec3.normalize(CACHE_B, b);
    // const dot = cc.clamp(cc.Vec3.dot(aNormalized, bNormalized), -1, 1);
    // if (dot === -1) {
    //     return cc.toRadian(179.9999);
    // } else {
    //     return Math.acos(dot);
    // }
}