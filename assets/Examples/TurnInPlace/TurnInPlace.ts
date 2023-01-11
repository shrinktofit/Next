import { _decorator, Component, Node, find, Vec3, v3, animation, Quat, toRadian, toDegree } from 'cc';
import { getForward } from '../../Scripts/Utils/NodeUtils';
import { clampMap } from './Utility';
const { ccclass, property } = _decorator;

@ccclass('TurnInPlace')
export class TurnInPlace extends Component {
    @property({ min: 0, max: 180, step: 1, slide: true, unit: '°' })
    public minTurnAngle = 45.0;

    @property({ unit: 's' })
    public minTurnAngleDelay = 0.0;

    @property({ unit: 's' })
    public maxTurnAngleDelay = 0.75;

    @property({ min: 0, max: 180, step: 1, slide: true, unit: '°' })
    public turn180Threshold = 135.0;

    start() {
        this._lastViewDir = this._getViewDir();
    }

    update(deltaTime: number) {
        const animationController = this.getComponent(animation.AnimationController);
        if (!animationController) {
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

    private _getViewDir() {
        const mainCamera = find('Main Camera');
        if (!mainCamera) {
            return new Vec3(0, 0, -1);
        }
        return Vec3.negate(v3(), getForward(mainCamera));
    }

    private _updateTurning(deltaTime: number) {
        const animationController = this.getComponent(animation.AnimationController);
        if (!animationController) {
            return;
        }

        const viewDir = this._getViewDir();
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
            animationController.setValue('TurningAngle', toDegree(currentAimAngle));
        }
    }
}

function signedAngleVec3(a: Readonly<Vec3>, b: Readonly<Vec3>, normal: Readonly<Vec3>) {
    const angle = Vec3.angle(a, b);
    const cross = Vec3.cross(new Vec3(), a, b);
    cross.normalize();
    return Vec3.dot(cross, normal) < 0 ? -angle : angle;
}

