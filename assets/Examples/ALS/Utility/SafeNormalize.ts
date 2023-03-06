import { Vec3 } from "cc";

export function safeNormalizeVec3(out: Vec3, v: Readonly<Vec3>, tolerance: number, resultIfZero: Readonly<Vec3> = Vec3.ZERO) {
    const sqr = Vec3.lengthSqr(v);
    if (sqr === 1.0) {
        return Vec3.copy(out, v);
    } else if (sqr < tolerance) {
        return Vec3.copy(out, resultIfZero);
    } else {
        const scale = 1.0 / Math.sqrt(sqr);
        return Vec3.multiplyScalar(out, v, scale);
    }
}
