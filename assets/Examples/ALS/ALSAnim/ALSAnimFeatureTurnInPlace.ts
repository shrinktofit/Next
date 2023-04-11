import { _decorator, Vec3, Quat, toDegree, Node, Color, warn, approx, toRadian } from 'cc';
import { ALSAnimFeature } from './ALSAnimFeature';
import { getForward } from '../../../Scripts/Utils/NodeUtils';
import { signedAngleVec3 } from '../Utility/SignedAngle';
import { clampMap } from '../Utility/ClampMap';
import { LineRenderer } from '../Debug/DebugRenderer';
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

    @property
    public debug = false;

    onStart() {
        getHorizontalViewDirection(this._lastViewDir, this.characterInfo.viewDirection);

        if (this.debug) {
            const node = new Node();
            this.node.scene.addChild(node);
            this._debugLineRenderer = new LineRenderer(node);

            for (const eventName of [
                `-->Turn In Place Left 90`, `-->Turn In Place Right 90`,
                `-->Turn In Place Left 180`, `-->Turn In Place Right 180`
            ]) {
                this.animationController.graphEventReceiver.on(eventName, () => {
                    warn(eventName);
                });
            }
        }
    }

    onUpdate(deltaTime: number) {
        this._updateTurning(deltaTime);
        this._updateAnimationValuesAndRotate(deltaTime);
        if (this._debugLineRenderer) {
            this._debugLineRenderer.clear();
            this._debugLineRenderer.lineFromDir(this.node.worldPosition, this._getCharacterHorizontalForward(new Vec3()), Color.RED);
            this._debugLineRenderer.lineFromDir(this.node.worldPosition, this._debugTargetViewDir, Color.BLUE);
            this._debugLineRenderer.lineFromDir(this.node.worldPosition, this._debugTurningStartCharDir, Color.GREEN);
            this._debugLineRenderer.commit();
        }
    }

    private _rotationAmountScale = 0;

    private _lastViewDir = new Vec3();

    private _elapsedDelayTime = 0.0;

    private _debugLineRenderer: LineRenderer | undefined = undefined;
    private _debugTurningStartCharDir = new Vec3();
    private _debugTargetViewDir = new Vec3();

    private _getCharacterHorizontalForward(out: Vec3) {
        const characterDir = getForward(this.node);
        characterDir.y = 0.0;
        Vec3.normalize(out, characterDir);
        return out;
    }

    private _updateTurning(deltaTime: number) {
        const {
            characterInfo,
        } = this;

        const enableTransition = this.animationController.getAuxiliaryCurveValue_experimental('Enable_Transition');
        if (enableTransition < 0.99) {
            return;
        }

        if (!Vec3.equals(characterInfo.velocity, Vec3.ZERO)) {
            return;
        }

        const characterDir = this._getCharacterHorizontalForward(new Vec3());

        const viewDir = getHorizontalViewDirection(new Vec3(), this.characterInfo.viewDirection);
        if (!Vec3.equals(this._lastViewDir, viewDir)) {
            Vec3.copy(this._lastViewDir, viewDir);
            this._elapsedDelayTime = 0.0;
            return;
        }

        this._requestTurn(characterDir, viewDir, deltaTime);
    }

    private _updateAnimationValuesAndRotate(deltaTime: number) {
        const {
            animationController,
        } = this;

        const rotationAmount = toRadian(animationController.getAuxiliaryCurveValue_experimental('RotationAmount'));
        const scaledRotationAmount = this._rotationAmountScale * rotationAmount;
        const rotationDeltaAngle = scaledRotationAmount * (deltaTime / (1.0 / 30.0));
        const rotationDelta = Quat.fromAxisAngle(new Quat(), Vec3.UNIT_Y, rotationDeltaAngle);
        const rotation = Quat.multiply(new Quat(), rotationDelta, this.node.rotation);
        this.node.rotation = rotation;
    }

    private _requestTurn(characterDir: Readonly<Vec3>, viewDir: Readonly<Vec3>, deltaTime: number) {
        const currentAimAngle = signedAngleVec3(characterDir, viewDir, Vec3.UNIT_Y);
        const currentAimAngleDegMag = toDegree(Math.abs(currentAimAngle));

        if (approx(currentAimAngleDegMag, 0.0, 1e-2) || currentAimAngleDegMag < this.minTurnAngle) {
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

        if (this._elapsedDelayTime < turnAngleDelay) {
            return;
        }

        let use180: boolean = false;
        if (currentAimAngleDegMag >= this.turn180Threshold) {
            use180 = true;
        } else {
            use180 = false;
        }

        let turnAnimId = TurnAnimId.NONE;
        if (currentAimAngle >= 0) {
            turnAnimId = use180 ? TurnAnimId.LEFT_180 : TurnAnimId.LEFT_90;
        } else {
            turnAnimId = use180 ? TurnAnimId.RIGHT_180 : TurnAnimId.RIGHT_90;
        }

        this._rotationAmountScale = Math.abs(currentAimAngleDegMag / (use180 ? 180.0 : 90.0));

        let triggerName = '';
        switch (turnAnimId) {
        default:
        case TurnAnimId.LEFT_90: triggerName = `TurnIPLeft90`; break;
        case TurnAnimId.RIGHT_90: triggerName = `TurnIPRight90`; break;
        case TurnAnimId.LEFT_180: triggerName = `TurnIPLeft180`; break;
        case TurnAnimId.RIGHT_180: triggerName = `TurnIPRight180`; break;
        }
        if (triggerName) {
            this.animationController.setValue(triggerName, true);
        }

        if (this.debug) {
            Vec3.copy(this._debugTargetViewDir, viewDir);
            Vec3.copy(this._debugTurningStartCharDir, characterDir);
            warn(`Start turning angle: ${toDegree(currentAimAngle)}`);
        }
    }
}

function getHorizontalViewDirection(out: Vec3, viewDirection: Readonly<Vec3>) {
    Vec3.copy(out, viewDirection);
    out.y = 0.0;
    Vec3.normalize(out, out);
    return out;
}

enum TurnAnimId {
    NONE,
    LEFT_90,
    LEFT_180,
    RIGHT_90,
    RIGHT_180,
}