import { _decorator, Vec3, Quat, toDegree, clamp, clamp01, lerp, warn, animation } from 'cc';
import { DEBUG } from 'cc/env';
import { ALSGait } from '../ALSGait';
import { calculateMoveDirection, MoveDirection } from '../Internal/MoveDirection';
import { AnimationGraphVariableSmoothSetter } from '../Utility/AnimationGraphVariableSmoothSetter';
import { assertIsTrue } from '../Utility/Asserts';
import { interopTo } from '../Utility/InteropTo';
import { safeNormalizeVec3 } from '../Utility/SafeNormalize';
import { UNIT_SCALE_ALS_TO_CC } from '../Utility/UnitConversion';
import { ALSAnimFeature } from './ALSAnimFeature';
import { ALSAnimFeatureMovementDebug } from './ALSAnimFeatureMovementDebug';
import { ALSMovementState } from './ALSMovementState';
const { ccclass, property } = _decorator;

export enum GraphVarName {
    ShouldMove = 'ShouldMove',
    WalkRunBlend = 'WalkRunBlend',
    StrideBlend = 'StrideBlend',
    VelocityBlendF = 'VelocityBlendF',
    VelocityBlendB = 'VelocityBlendB',
    VelocityBlendL = 'VelocityBlendL',
    VelocityBlendR = 'VelocityBlendR',
    MovementDirection = 'MovementDirection',
}

@ccclass('ALSAnimFeatureMovement')
export class ALSAnimFeatureMovement extends ALSAnimFeature {
    @property({ unit: '[0-1]/s', min: 0.0 })
    public velocityBlendInteropSpeed = 12.0;

    public onStart() {
        this._walkRunBlendSmoothSetter = new AnimationGraphVariableSmoothSetter(
            this.animationController,
            GraphVarName.WalkRunBlend,
            0.736806,
        );
        if (DEBUG && this.debug) {
            this._debugger = new ALSAnimFeatureMovementDebug(
                this,
                this.animationController,
                this.characterInfo,
            );
        }
    }

    public onUpdate(deltaTime: number) {
        if (this.characterInfo.movementState !== ALSMovementState.Grounded) {
            return;
        }

        const {
            animationController,
        } = this;

        this._walkRunBlendSmoothSetter.update(deltaTime);

        const shouldMove = this.shouldMove;

        if (shouldMove) {
            this._updateMoveDirection();
            this._updateVelocityBlend(deltaTime);
            this._updateWalkRunBlend();
            this._updateStrideBlend();
        }

        // Push params to graph.
        {
            const {
                _currentMoveDirection: currentMoveDirection,
                _currentVelocityBlend: { f, b, l, r },
            } = this;
            animationController.setValue(GraphVarName.ShouldMove, shouldMove);
            if (shouldMove) {
                animationController.setValue(GraphVarName.MovementDirection, currentMoveDirection);
                const sumBlend = f + b + l + r;
                assertIsTrue(sumBlend !== 0.0);
                animationController.setValue(GraphVarName.VelocityBlendF, f / sumBlend);
                animationController.setValue(GraphVarName.VelocityBlendB, b / sumBlend);
                animationController.setValue(GraphVarName.VelocityBlendL, l / sumBlend);
                animationController.setValue(GraphVarName.VelocityBlendR, r / sumBlend);
            }
        }

        this._debugger?.update(deltaTime);
    }

    private _debugger: undefined | ALSAnimFeatureMovementDebug = undefined;

    private _currentMoveDirection = MoveDirection.Forward;

    private _currentVelocityBlend = new VelocityBlend();

    private declare _walkRunBlendSmoothSetter: AnimationGraphVariableSmoothSetter;

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

    private _updateWalkRunBlend() {
        const gait = this.characterInfo.gait;
        const walkRunBlend = gait === ALSGait.Walking ? 0.0 : 1.0;
        this._walkRunBlendSmoothSetter.set(walkRunBlend);
    }

    private _updateStrideBlend() {
        const speed = this.characterInfo.speed;
        const speedNormalized = lerp(0.2, 1.0, clamp01(speed / 3.6));
        this.animationController.setValue(GraphVarName.StrideBlend, speedNormalized);
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
