
import { animation, clamp, Component, director, lerp, Quat, toDegree, Vec3, _decorator } from 'cc';
import { ALSCharacterInfo } from './ALSCharacterInfo';
import { createRealtimeNumberChart, RealTimeNumberChart } from './Debug/Charts/ChartService';
import { calculateMoveDirection, MoveDirection } from './Internal/MoveDirection';
const { ccclass, property } = _decorator;

@ccclass('MoveAnimationController')
export class MoveAnimationController extends Component {
    @property
    public debug = false;

    public start() {
        const animationController = this.node.getComponent(animation.AnimationController);
        if (!animationController) {
            throw new Error(`Animation controller does not exist!`);
        }
        this._animationController = animationController;

        const characterInfo = this.node.getComponent(ALSCharacterInfo);
        if (!characterInfo) {
            throw new Error(`Character info does not exist!`);
        }
        this._characterInfo = characterInfo;

        if (this.debug) {
            this._chart = createRealtimeNumberChart?.({
                valueDescriptions: [
                    { displayName: 'VelocityBlend.F' },
                    { displayName: 'VelocityBlend.B' },
                    { displayName: 'VelocityBlend.L' },
                    { displayName: 'VelocityBlend.R' },
                ],
            });
        }
    }

    public update(deltaTime: number) {
        const {
            _animationController: animationController,
        } = this;

        const shouldMove = !Vec3.equals(this._localVelocity, Vec3.ZERO);

        if (shouldMove) {
            this._updateMoveDirection();
            this._updateVelocityBlend(deltaTime);
        }

        if (this._currentMoveDirection !== this._lastMoveDirection) {
            this._lastMoveDirection = this._currentMoveDirection;
            console.error(`Move Direction: ${MoveDirection[this._currentMoveDirection]}`);
        }

        // Push params to graph.
        {
            const {
                _currentMoveDirection: currentMoveDirection,
                _currentVelocityBlend: currentVelocityBlend,
            } = this;
            animationController.setValue(`ShouldMove`, shouldMove);
            if (shouldMove) {
                animationController.setValue(`MovementDirection`, currentMoveDirection);
                const sumBlend = currentVelocityBlend.f + currentVelocityBlend.b + currentVelocityBlend.l + currentVelocityBlend.r;
                animationController.setValue(`VelocityBlendF`, currentVelocityBlend.f / sumBlend);
                animationController.setValue(`VelocityBlendB`, currentVelocityBlend.b / sumBlend);
                animationController.setValue(`VelocityBlendL`, currentVelocityBlend.l / sumBlend);
                animationController.setValue(`VelocityBlendR`, currentVelocityBlend.r / sumBlend);
            }
        }

        if (this._chart) {
            let i = 0;
            this._chart.setValue(i++, this._currentVelocityBlend.f);
            this._chart.setValue(i++, this._currentVelocityBlend.b);
            this._chart.setValue(i++, this._currentVelocityBlend.l);
            this._chart.setValue(i++, this._currentVelocityBlend.r);
            this._chart.update();
        }
    }

    private _animationController!: animation.AnimationController;

    private _characterInfo!: ALSCharacterInfo;

    private _currentMoveDirection = MoveDirection.Forward;

    private _currentVelocityBlend = new VelocityBlend();

    private _chart: RealTimeNumberChart | undefined;

    private get _localVelocity() {
        const v = this._characterInfo.velocity;
        const invQ = Quat.invert(new Quat(), this.node.worldRotation);
        const localVelocity = Vec3.transformQuat(new Vec3(), v, invQ);
        return localVelocity;
    }

    private _updateMoveDirection() {
        const yaw = toDegree(calculateYawInRadians(this._localVelocity));
        this._currentMoveDirection = calculateMoveDirection(
            this._currentMoveDirection,
            70,
            -70,
            110,
            -110,
            5,
            yaw,
        );
    }

    private _updateVelocityBlend(deltaTime: number) {
        const { _currentVelocityBlend: currentVelocityBlend } = this;

        const localVelocityNormalized = Vec3.normalize(new Vec3(), this._localVelocity);
        const sum =
            Math.abs(localVelocityNormalized.x) +
            Math.abs(localVelocityNormalized.y) +
            Math.abs(localVelocityNormalized.z);
        if (sum === 0.0) {
            debugger;
        }
        Vec3.multiplyScalar(localVelocityNormalized, localVelocityNormalized, 1.0 / sum);

        const { x, z } = localVelocityNormalized;

        const f = clamp(0, 1.0, z);
        const b = Math.abs(clamp(-1.0, 0.0, z));
        const l = clamp(0, 1.0, x);
        const r = Math.abs(clamp(-1.0, 0.0, x));

        const velocityBlendInteropSpeed = 12 * 1;
        currentVelocityBlend.f = interopTo(currentVelocityBlend.f, f, deltaTime, velocityBlendInteropSpeed);
        currentVelocityBlend.b = interopTo(currentVelocityBlend.b, b, deltaTime, velocityBlendInteropSpeed);
        currentVelocityBlend.l = interopTo(currentVelocityBlend.l, l, deltaTime, velocityBlendInteropSpeed);
        currentVelocityBlend.r = interopTo(currentVelocityBlend.r, r, deltaTime, velocityBlendInteropSpeed);
    }
}

class VelocityBlend {
    public f = 0.0;
    public b = 0.0;
    public l = 0.0;
    public r = 0.0;
}

function calculateYawInRadians(localVelocity: Vec3) {
    const v = Vec3.clone(localVelocity);
    v.y = 0;
    v.normalize();

    const cross = Vec3.cross(new Vec3(), localVelocity, Vec3.UNIT_Z);
    cross.normalize();

    let angle = Vec3.angle(v, Vec3.UNIT_Z);
    if (Vec3.dot(cross, Vec3.UNIT_Y) < 0) {
        angle = -angle;
    }

    return angle;
}

function interopTo(from: number, to: number, deltaTime: number, speed: number): number {
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
