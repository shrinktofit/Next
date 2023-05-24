import { physics } from "cc";
import { geometry } from "cc";
import { drawCapsule, drawCube, drawLineOriginDirLen } from "../Utility/Gizmo";
import { Vec3 } from "cc";
import { Color } from "cc";

export class MantleDebugger {
    public drawSweepCapsuleClosestParams(
        ...args: Parameters<physics.PhysicsSystem['sweepCapsule']>
    ) {
        const [
            ray,
            radius,
            height,
            orientation,
            mask,
            maxDistance,
        ] = args;
        drawCapsule(
            ray.o,
            Vec3.ZERO,
            radius,
            height,
            Color.BLUE,
        );
        const target = new Vec3();
        ray.computeHit(target, maxDistance ?? 999999.0);
        drawCapsule(
            target,
            Vec3.ZERO,
            radius,
            height,
            Color.RED,
        );
    }

    public drawSweepCapsuleClosestResult(hit: typeof physics.PhysicsSystem['instance']['sweepCastClosestResult']) {
        drawCube(hit.hitPoint, Vec3.multiplyScalar(new Vec3(), Vec3.ONE, 0.1), Color.YELLOW);
        drawLineOriginDirLen(hit.hitPoint, hit.hitNormal, 0.2, Color.YELLOW);
    }
}

