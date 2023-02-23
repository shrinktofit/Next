import { _decorator, Component, Node, Vec3, Quat } from 'cc';
import { ALSComponent } from './ALSComponent';
import { createRealtimeNumberChart, RealTimeNumberChart } from './Debug/Charts/ChartService';
import { clampToMaxLength } from './Utility/ClampToMaxLength';
import { interopTo } from './Utility/InteropTo';
const { ccclass, property } = _decorator;

@ccclass('ALSLean')
export class ALSLean extends ALSComponent {
    @property
    public groundedLeanInteropSpeed = 4.0;

    @property
    public debug = false;

    start() {
        super.start();
        if (this.debug) {
            this._debug = createRealtimeNumberChart?.({
                minValue: -1.0,
                maxValue: 1.0,
                valueDescriptions: [{
                    displayName: 'LR',
                }, {
                    displayName: 'FB',
                }],
            });
        }
    }

    update(deltaTime: number) {
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

        this._debug?.setValue(0, leanAmountLR);
        this._debug?.setValue(1, leanAmountFB);
        this._debug?.update();
    }

    private _currentLeanAmountFB = 0.0;
    private _currentLeanAmountLR = 0.0;

    private _debug: RealTimeNumberChart | undefined;
}


