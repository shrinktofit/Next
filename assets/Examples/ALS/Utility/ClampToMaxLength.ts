import { Vec3 } from "cc";

export function clampToMaxLength(out: Vec3, v: Readonly<Vec3>, maxLength: number) {
    if (maxLength < 1e-6) {
        return Vec3.copy(out, Vec3.ZERO);
    }
    const lenSqr = Vec3.lengthSqr(v);
    if (lenSqr > (maxLength ** 2)) {
        const scale = maxLength * (lenSqr ** (-1.0 / 2.0));
        return Vec3.multiplyScalar(out, v, scale);
    } else {
        return Vec3.copy(out, v);
    }
}
