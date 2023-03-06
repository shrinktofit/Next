import { _decorator, Vec3, Quat, toDegree, clamp, clamp01 } from 'cc';
import { createRealtimeNumberChart, RealTimeNumberChart } from '../Debug/Charts/ChartService';
import { calculateMoveDirection, MoveDirection } from '../Internal/MoveDirection';
import { assertIsTrue } from '../Utility/Asserts';
import { interopTo } from '../Utility/InteropTo';
import { safeNormalizeVec3 } from '../Utility/SafeNormalize';
import { UNIT_SCALE_ALS_TO_CC } from '../Utility/UnitConversion';
import { ALSAnimFeature } from './ALSAnimFeature';
const { ccclass, property } = _decorator;

@ccclass('ALSAnimFeatureMovement')
export class ALSAnimFeatureMovement extends ALSAnimFeature {
    @property
    public debug = false;

    @property({ unit: '[0-1]/s', min: 0.0 })
    public velocityBlendInteropSpeed = 12.0;

    public onStart() {
        if (this.debug) {
            if (this._debugFB) {
                this._chart = createRealtimeNumberChart?.({
                    valueDescriptions: [
                        { displayName: 'N/A' },
                        { displayName: 'VelocityBlend.F' },
                        { displayName: 'VelocityBlend.B' },
                    ],
                    chart: {
                        type: 'pie',
                    },
                });
            } else {
                this._chart = createRealtimeNumberChart?.({
                    valueDescriptions: [
                        { displayName: 'VelocityBlend.F' },
                        { displayName: 'VelocityBlend.B' },
                        { displayName: 'VelocityBlend.L' },
                        { displayName: 'VelocityBlend.R' },
                    ],
                    chart: {
                        type: 'line',
                    },
                });
            }
        }
    }

    public onUpdate(deltaTime: number) {
        const {
            animationController,
        } = this;

        const shouldMove = this.shouldMove;

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
                _currentVelocityBlend: { f, b, l, r },
            } = this;
            animationController.setValue(`ShouldMove`, shouldMove);
            if (shouldMove) {
                animationController.setValue(`MovementDirection`, currentMoveDirection);
                const sumBlend = f + b + l + r;
                assertIsTrue(sumBlend !== 0.0);
                animationController.setValue(`VelocityBlendF`, f / sumBlend);
                animationController.setValue(`VelocityBlendB`, b / sumBlend);
                animationController.setValue(`VelocityBlendL`, l / sumBlend);
                animationController.setValue(`VelocityBlendR`, r / sumBlend);

                if (this._debugFB) {
                    if (this._chart) {
                        let i = 0;
                        const f_ = f / sumBlend;
                        const b_ = b / sumBlend;
                        this._chart.setValue(i++, (1.0 - clamp01(f_ + b_)));
                        this._chart.setValue(i++, f_);
                        this._chart.setValue(i++, b_);
                        this._chart.update();
                    }
                } else {
                    if (this._chart) {
                        let i = 0;
                        this._chart.setValue(i++, f);
                        this._chart.setValue(i++, b);
                        this._chart.setValue(i++, l);
                        this._chart.setValue(i++, r);
                        this._chart.update();
                    }
                }
            }
        }
    }

    private _currentMoveDirection = MoveDirection.Forward;

    private _currentVelocityBlend = new VelocityBlend();

    private _chart: RealTimeNumberChart | undefined;

    private _debugFB = true;

    private get _localVelocity() {
        const v = this.characterInfo.velocity;
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
        const {
            _currentVelocityBlend: currentVelocityBlend,
            velocityBlendInteropSpeed,
        } = this;

        const localVelocityNormalized = safeNormalizeVec3(new Vec3(), this._localVelocity, 0.1 * UNIT_SCALE_ALS_TO_CC);
        const sum =
            Math.abs(localVelocityNormalized.x) +
            Math.abs(localVelocityNormalized.y) +
            Math.abs(localVelocityNormalized.z);
        if (sum === 0.0) { // TODO?
            return;
        }
        assertIsTrue(sum !== 0.0);
        Vec3.multiplyScalar(localVelocityNormalized, localVelocityNormalized, 1.0 / sum);

        const { x, z } = localVelocityNormalized;

        const f = clamp(z, 0.0, 1.0);
        const b = Math.abs(clamp(z, -1.0, 0.0));
        const l = clamp(x, 0.0, 1.0);
        const r = Math.abs(clamp(x, -1.0, 0.0));

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

