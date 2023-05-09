import { _decorator, Component, Node, Vec3, Quat } from 'cc';
import { ALSAnimFeature } from './ALSAnimFeature';
import { clampToMaxLength } from '../Utility/ClampToMaxLength';
import { interopTo } from '../Utility/InteropTo';
import { assertIsTrue } from '../Utility/Asserts';
import { getGlobalDebugInfoDisplay, RangedFloatRecord } from '../DebugInfoDisplay/DebugInfoDisplay';
const { ccclass, property } = _decorator;

@ccclass('ALSAnimFeatureLean')
export class ALSAnimFeatureLean extends ALSAnimFeature {
    @property({ unit: '[0-1]/s', min: 0.0 })
    public groundedLeanInteropSpeed = 4.0;

    /** ALS does not do this. */
    @property
    public resetLeanAmountOnceShouldNotMove = false;

    public onStart() {
        super.onStart();
        if (this.debug) {
            const display = getGlobalDebugInfoDisplay();
            if (display) {
                this._debugRecords = {
                    leanAmountFB: display.addRangedFloat('LeanAmountFB', 0.0, -1.0, 1.0),
                    leanAmountLR: display.addRangedFloat('LeanAmountLR', 0.0, -1.0, 1.0),
                };
            }
        }
    }

    public onUpdate(deltaTime: number) {
        if (this.resetLeanAmountOnceShouldNotMove && !this.shouldMove) {
            this._currentLeanAmountFB = 0.0;
            this._currentLeanAmountLR = 0.0;
            return;
        }

        const {
            characterInfo: {
                velocity,
                acceleration,
                maxAcceleration,
                maxBrakingDeceleration,
            },
            _currentLeanAmountLR: currentLeanAmountLR,
            _currentLeanAmountFB: currentLeanAmountFB,
            groundedLeanInteropSpeed,
        } = this;

        const accelerationAmount = new Vec3();

        const maxAccelerationAmount = Vec3.dot(velocity, acceleration) > 0
            ? maxAcceleration
            : maxBrakingDeceleration;
        clampToMaxLength(accelerationAmount, acceleration, maxAccelerationAmount);
        assertIsTrue(maxAccelerationAmount !== 0.0);
        Vec3.multiplyScalar(accelerationAmount, accelerationAmount, 1.0 / maxAccelerationAmount);
        
        const invQ = Quat.invert(new Quat(), this.node.worldRotation);
        Vec3.transformQuat(accelerationAmount, accelerationAmount, invQ);

        const {
            x: targetLeanAmountLR,
            z: targetLeanAmountFB,
        } = accelerationAmount;

        const leanAmountLR = interopTo(currentLeanAmountLR, targetLeanAmountLR, deltaTime, groundedLeanInteropSpeed);
        const leanAmountFB = interopTo(currentLeanAmountFB, targetLeanAmountFB, deltaTime, groundedLeanInteropSpeed);

        this._currentLeanAmountLR = leanAmountLR;
        this._currentLeanAmountFB = leanAmountFB;

        this.animationController.setValue(`LeanAmountLR`, -leanAmountLR);
        this.animationController.setValue(`LeanAmountFB`, leanAmountFB);

        if (this._debugRecords) {
            this._debugRecords.leanAmountFB.value = leanAmountFB;
            this._debugRecords.leanAmountLR.value = leanAmountLR;
        }
    }

    private _currentLeanAmountFB = 0.0;
    private _currentLeanAmountLR = 0.0;

    private _debugRecords: {
        leanAmountFB: RangedFloatRecord;
        leanAmountLR: RangedFloatRecord;
    } | undefined;
}


