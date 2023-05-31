import { physics } from "cc";
import { geometry } from "cc";
import { drawCapsule, drawCube, drawLineOriginDirLen, drawSphere } from "../Utility/Gizmo";
import { Vec3 } from "cc";
import { Color } from "cc";
import { assertIsTrue } from "../Utility/Asserts";

const addDrawTask = Symbol('AddDrawTask');

const task: MethodDecorator = <T>(
    target: Object, propertyKey: PropertyKey, descriptor: TypedPropertyDescriptor<T>,
): TypedPropertyDescriptor<T> => {
    const method = descriptor.value;
    assertIsTrue(typeof method === 'function');
    return {
        value: function(this: MantleDebugger, ...args: T extends (...args: any[]) => any ? Parameters<T> : never) {
            this[addDrawTask](() => {
                method.apply(this, args);
            }, 99999);
        },
    } as TypedPropertyDescriptor<T>;
};

export class MantleDebugger {
    @task
    public drawBaseCapsulePosition(position: Readonly<Vec3>) {
        drawCube(position, Vec3.multiplyScalar(new Vec3(), Vec3.ONE, 0.2), Color.BLACK);
    }

    @task
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

    @task
    public drawForwardTraceResult(hit: typeof physics.PhysicsSystem['instance']['sweepCastClosestResult']) {
        this._drawHitResult(hit, Color.RED);
    }

    @task
    public drawDownTraceParams(
        ...args: Parameters<physics.PhysicsSystem['sweepSphereClosest']>
    ) {
        const [
            ray,
            radius,
            mask,
            maxDistance,
        ] = args;
        drawSphere(
            ray.o,
            radius,
            Color.BLUE,
        );
        const target = new Vec3();
        ray.computeHit(target, maxDistance ?? 999999.0);
        drawSphere(
            target,
            radius,
            Color.RED,
        );
    }

    @task
    public drawDownTraceResult(hit: typeof physics.PhysicsSystem['instance']['sweepCastClosestResult']) {
        this._drawHitResult(hit, Color.GREEN);
    }

    public clear() {
        this._drawTasks.length = 0;
    }

    public update(deltaTime: number) {
        for (let iTask = 0; iTask < this._drawTasks.length;) {
            const task = this._drawTasks[iTask];
            task.callback();
            task.liftTime -= deltaTime;
            if (task.liftTime < 0) {
                this._drawTasks.splice(iTask, 1);
            } else {
                ++iTask;
            }
        }
    }

    private _drawTasks: DrawTask[] = [];

    public [addDrawTask](callback: () => void, duration: number) {
        this._drawTasks.push(new DrawTask(callback, duration));
    }

    private _drawHitResult(hit: typeof physics.PhysicsSystem['instance']['sweepCastClosestResult'], color: Color) {
        drawCube(hit.hitPoint, Vec3.multiplyScalar(new Vec3(), Vec3.ONE, 0.1), color);
        drawLineOriginDirLen(hit.hitPoint, hit.hitNormal, 0.2, color);
    }
}

class DrawTask {
    constructor(public callback: () => void, public liftTime: number) {

    }
}