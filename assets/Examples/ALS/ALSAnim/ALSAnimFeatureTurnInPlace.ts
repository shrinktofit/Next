import { _decorator, Vec3, Quat, toDegree } from 'cc';
import { ALSAnimFeature } from './ALSAnimFeature';
import { getForward } from '../../../Scripts/Utils/NodeUtils';
import { signedAngleVec3 } from '../Utility/SignedAngle';
import { clampMap } from '../Utility/ClampMap';
const { ccclass, property } = _decorator;

@ccclass('ALSAnimFeatureTurnInPlace')
export class ALSAnimFeatureTurnInPlace extends ALSAnimFeature {
    @property({ min: 0, max: 180, step: 1, slide: true, unit: '°' })
    public minTurnAngle = 45.0;

    @property({ unit: 's' })
    public minTurnAngleDelay = 0.0;

    @property({ unit: 's' })
    public maxTurnAngleDelay = 0.75;

    @property({ min: 0, max: 180, step: 1, slide: true, unit: '°' })
    public turn180Threshold = 135.0;

    onStart() {
        const viewDir = Vec3.copy(this._lastViewDir, this.characterInfo.viewDirection);
        viewDir.y = 0.0;
        viewDir.normalize();
    }

    onUpdate(deltaTime: number) {
        const {
            characterInfo,
            animationController,
        } = this;

        if (!Vec3.equals(characterInfo.velocity, Vec3.ZERO)) {
            this._turning = false;
            animationController.setValue('Turning', this._turning);
            return;
        }

        this._updateTurning(deltaTime);

        animationController.setValue('Turning', this._turning);
        animationController.setValue('TurnInPlaceUse180', this._use180);

        if (this._turning) {
            const rotationAmount = animationController.getAdjointCurveValue('RotationAmount');
            const animationFullRotationAmount = this._use180 ? 180.0 : 90.0;
            const rotationAmount01 = Math.sign(rotationAmount) * Math.abs(rotationAmount) / animationFullRotationAmount;
            const r = Quat.fromAxisAngle(new Quat(), Vec3.UNIT_Y, this._initialDestTurnAngle * rotationAmount01);
            const rotation = Quat.multiply(new Quat(), r, this._startTurningRotation);
            this.node.rotation = rotation;
        }
    }

    private _turning = false;

    private _use180 = false;

    private _startTurningRotation = new Quat();

    private _initialDestTurnAngle = 0;

    private _lastViewDir = new Vec3();

    private _elapsedDelayTime = 0.0;

    private _updateTurning(deltaTime: number) {
        const viewDir = Vec3.clone(this.characterInfo.viewDirection);
        viewDir.y = 0.0;
        viewDir.normalize();

        if (!Vec3.equals(this._lastViewDir, viewDir)) {
            Vec3.copy(this._lastViewDir, viewDir);
            this._turning = false;
            return;
        }

        const characterDir = getForward(this.node);
        characterDir.y = 0.0;
        characterDir.normalize();
        
        if (Vec3.equals(characterDir, viewDir)) {
            this._turning = false;
            return;
        }

        const currentAimAngle = signedAngleVec3(characterDir, viewDir, Vec3.UNIT_Y);
        const currentAimAngleDegMag = toDegree(Math.abs(currentAimAngle));

        if (currentAimAngleDegMag < this.minTurnAngle) {
            this._elapsedDelayTime = 0.0;
            return;
        }

        this._elapsedDelayTime += deltaTime;
        const turnAngleDelay = clampMap(
            currentAimAngleDegMag,
            this.minTurnAngle,
            180.0,
            this.minTurnAngleDelay,
            this.maxTurnAngleDelay,
        );
        if (this._elapsedDelayTime >= turnAngleDelay) {
            if (!this._turning) {
                Quat.copy(this._startTurningRotation, this.node.rotation);
                this._initialDestTurnAngle = Math.abs(currentAimAngle);
                if (currentAimAngleDegMag >= this.turn180Threshold) {
                    this._use180 = true;
                } else {
                    this._use180 = false;
                }
                this._turning = true;
            }
            this.animationController.setValue('TurningAngle', toDegree(currentAimAngle));
        }
    }
}