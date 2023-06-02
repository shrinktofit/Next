import { _decorator, Vec3, Quat, toDegree, clamp, director } from 'cc';
import { ALSAnimFeature } from './ALSAnimFeature';
import { physics } from 'cc';
import { geometry } from 'cc';
import { CapsuleCollider } from 'cc';
import { getForward } from '../../../Scripts/Utils/NodeUtils';
import { UNIT_SCALE_ALS_TO_CC } from '../Utility/UnitConversion';
import { MantleDebugger } from './MantleDebugger';
import { DEBUG } from 'cc/env';
import { MovementAction } from '../ALSCharacterInfo';
import { ALSMovementState } from './ALSMovementState';
import { MovementMode } from '../Source/Logic/CharacterMovement';
import { VarName } from './VarName';
import { Animation } from 'cc';
import { error } from 'cc';
import { warn } from 'cc';
import { AnimationClip } from 'cc';
import { lerp } from 'cc';
import { clampMap } from '../Utility/ClampMap';
import { ccenum } from 'cc';
import { assertIsTrue } from '../Utility/Asserts';
import { CharacterController } from 'cc';
import { CapsuleCharacterController } from 'cc';
import { Node } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('ALSAnimFeatureMantle.TraceSettings')
class ALSMantleTraceSettings {
    @property
    maxLedgeHeight = 0.0;

    @property
    minLedgeHeight = 0.0;

    @property
    reachDistance = 0.0;

    @property
    forwardTraceRadius = 0.0;

    @property
    downwardTraceRadius = 0.0;
}

enum ALSMantleType {
    LowMantle,
    HighMantle,
    FallingCatch,
}
ccenum(ALSMantleType);

@ccclass('ALSMantleAsset')
export class ALSMantleAsset {
    @property({ type: ALSMantleType })
    public mantleTypesMatched: ALSMantleType[] = [];

    @property
    public animationGraphTriggerName = '';

    @property(AnimationClip)
    public positionCorrectionCurve: AnimationClip | null = null;

    @property
    public startingOffset = new Vec3();

    @property
    public lowHeight = 0.0;

    @property
    public lowPlayRate = 1.0;

    @property
    public lowStartPosition = 0.0;

    @property
    public highHeigh = 0.0;

    @property
    public highPlayRate = 1.0;

    @property
    public highStartPosition = 0.0;

    public getStartingPosition(mantleHeight: number) {
        return clampMap(
            mantleHeight,
            this.lowHeight,
            this.highHeigh,
            this.lowStartPosition,
            this.highStartPosition,
        );
    }

    public getPlayRate(mantleHeight: number) {
        return clampMap(
            mantleHeight,
            this.lowHeight,
            this.highHeigh,
            this.lowPlayRate,
            this.highPlayRate,
        );
    }
}

class MantleParams {
    readonly startingOffset = new Vec3();
    startingPosition = 0.0;
    playRate = 0.0;
}

@ccclass('ALSAnimFeatureMantle')
export class ALSAnimFeatureMantle extends ALSAnimFeature {
    @property
    groundedTraceSettings = new ALSMantleTraceSettings();

    @property
    automaticTraceSettings = new ALSMantleTraceSettings();

    @property
    fallingTraceSettings = new ALSMantleTraceSettings();

    @property(Animation)
    mantleTimeline: Animation | null = null;

    @property(ALSMantleAsset)
    mantleAssets: ALSMantleAsset[] = [];

    check() {
        return !!this.mantleTimeline;
    }

    onStart() {
        if (!this.mantleTimeline) {
            warn(`Mantle timeline is not configured.`);
        }

        this.characterInfo.onJumpInput.subscribe(this._onJumpInput, this);

        if (this.debug) {
            this._debugger = new MantleDebugger();
        }
    }
    
    onUpdate(deltaTime: number) {
        if (this._mantling) {
            this._mantleUpdate(deltaTime);
        }

        this._debugger?.update(deltaTime);
    }

    private _debugger: MantleDebugger | undefined;
    private _mantling = false;
    private _mantleTime = 0.0;
    private _mantleParams = new MantleParams();
    private _mantleStartPosition = new Vec3();
    private _mantleTargetPosition = new Vec3();

    private _onJumpInput() {
        if (this.characterInfo.movementState === ALSMovementState.Grounded) {
            this._mantleCheck(this.groundedTraceSettings);
        }
    }

    private _mantleCheck(traceSettings: ALSMantleTraceSettings) {
        if (DEBUG) {
            this._debugger?.clear();
        }

        const capsuleParams = this._getCapsuleParams();
        if (!capsuleParams) {
            error(
                `Could not decide capsule params. ` +
                `Please ensure you have a capsule character controller or capsule collider.`
            );
            return;
        }

        const traceDirection = getForward(this.node);
        const capsuleBaseLocation = getCapsuleBaseLocation(2.0 * UNIT_SCALE_ALS_TO_CC, capsuleParams.node);
        if (DEBUG) {
            this._debugger?.drawBaseCapsulePosition(capsuleBaseLocation);
        }

        let forwardTraceResult: undefined | typeof physics.PhysicsSystem.instance.sweepCastClosestResult;
        {
            const traceStart = Vec3.scaleAndAdd(new Vec3(), capsuleBaseLocation, traceDirection, -30.0 * UNIT_SCALE_ALS_TO_CC);
            traceStart.y += (traceSettings.maxLedgeHeight + traceSettings.minLedgeHeight) / 2.0;
            const traceEnd = Vec3.scaleAndAdd(new Vec3(), traceStart, traceDirection, traceSettings.reachDistance);
            const halfHeight = 1.0 * UNIT_SCALE_ALS_TO_CC + (traceSettings.maxLedgeHeight - traceSettings.minLedgeHeight) / 2.0;
            const traceRadius = traceSettings.forwardTraceRadius;
    
            const ray = geometry.Ray.fromPoints(new geometry.Ray(), traceStart, traceEnd);
            const hit = physics.PhysicsSystem.instance.sweepCapsuleClosest(
                ray,
                traceRadius,
                halfHeight * 2,
                Quat.IDENTITY,
                1 << 1,
                Vec3.distance(traceStart, traceEnd),
            );
            if (DEBUG) {
                this._debugger?.drawSweepCapsuleClosestParams(
                    ray,
                    traceRadius,
                    halfHeight * 2,
                    Quat.IDENTITY,
                    1 << 1,
                    Vec3.distance(traceStart, traceEnd),
                );
            }
            if (hit) {
                forwardTraceResult = physics.PhysicsSystem.instance.sweepCastClosestResult;
            }
        }
        if (!forwardTraceResult) {
            return;
        }
        if (DEBUG) {
            console.warn(`Forward trace hit.`);
            this._debugger?.drawForwardTraceResult(forwardTraceResult.clone());
        }

        let downTraceResult: undefined | typeof physics.PhysicsSystem.instance.sweepCastClosestResult;
        {
            const downTraceEnd = Vec3.clone(forwardTraceResult.hitPoint);
            downTraceEnd.y = capsuleBaseLocation.y;
            Vec3.scaleAndAdd(downTraceEnd, downTraceEnd, forwardTraceResult.hitNormal, -15 * UNIT_SCALE_ALS_TO_CC);
            const downTrackStart = Vec3.clone(downTraceEnd);
            downTrackStart.y += traceSettings.maxLedgeHeight + traceSettings.downwardTraceRadius + 1.0 * UNIT_SCALE_ALS_TO_CC;

            const downTraceRay = geometry.Ray.fromPoints(new geometry.Ray(), downTrackStart, downTraceEnd);

            const downTraceHit = physics.PhysicsSystem.instance.sweepSphereClosest(
                downTraceRay,
                traceSettings.downwardTraceRadius,
                1 << 1,
                Vec3.distance(downTrackStart, downTraceEnd),
            );
            if (DEBUG) {
                this._debugger?.drawDownTraceParams(
                    downTraceRay,
                    traceSettings.downwardTraceRadius,
                    1 << 1,
                Vec3.distance(downTrackStart, downTraceEnd),
                );
            }
            if (downTraceHit) {
                downTraceResult = physics.PhysicsSystem.instance.sweepCastClosestResult;
            }
        }
        if (!downTraceResult) {
            return;
        }
        if (DEBUG) {
            this._debugger?.drawDownTraceResult(downTraceResult.clone());
        }

        const mantleHeight = downTraceResult.hitPoint.y - this.node.worldPosition.y;

        let mantleType = ALSMantleType.LowMantle;
        if (this.characterInfo.movementState === ALSMovementState.InAir) {
            mantleType = ALSMantleType.FallingCatch;
        } else {
            mantleType = mantleHeight > (125 * UNIT_SCALE_ALS_TO_CC) ? ALSMantleType.HighMantle : ALSMantleType.LowMantle;
        }

        this._mantleStart(
            downTraceResult.hitPoint,
            mantleHeight,
            mantleType,
        );
    }

    private _mantleStart(
        targetPosition: Readonly<Vec3>,
        mantleHeight: number,
        mantleType: ALSMantleType,
    ) {
        if (!this.mantleTimeline) {
            return;
        }

        const mantleAsset = this._getMantleAsset(mantleType);
        if (!mantleAsset) {
            return;
        }

        const { _mantleParams: mantleParams } = this;
        this._mantling = true;
        this._mantleTime = 0.0;
        Vec3.copy(mantleParams.startingOffset, mantleAsset.startingOffset);
        mantleParams.startingPosition = mantleAsset.getStartingPosition(mantleHeight);
        mantleParams.playRate = mantleAsset.getPlayRate(mantleHeight);
        Vec3.copy(this._mantleStartPosition, this.node.worldPosition);
        Vec3.copy(this._mantleTargetPosition, targetPosition);

        this.characterInfo.characterMovement.movementMode = MovementMode.None;
        this.characterInfo.setMovementState(ALSMovementState.Mantling);
        this.animationController.setValue(mantleAsset.animationGraphTriggerName, true);
        this.animationController.setValue(VarName.MantleStartPosition, mantleParams.startingPosition);
        this.animationController.setValue(VarName.MantlePlayRate, mantleParams.playRate);

        this.mantleTimeline.play(mantleAsset.positionCorrectionCurve!.name);
        const state = this.mantleTimeline.getState(mantleAsset.positionCorrectionCurve!.name);
        assertIsTrue(state);
        state.setTime(mantleParams.startingPosition);
        state.speed = mantleParams.playRate;
        this.mantleTimeline.on(Animation.EventType.STOP, this._onMantleTimelineStop, this);
    }

    private _getMantleAsset(mantleType: ALSMantleType): ALSMantleAsset | undefined {
        if (this.mantleAssets.length === 0) {
            warn(`No any mantle asset is configured.`);
            return undefined;
        }
        const asset = this.mantleAssets.find((a) =>
            a.mantleTypesMatched.includes(mantleType));
        if (asset) {
            return asset;
        }
        warn(`No asset is configured for mantle type ${ALSMantleType[mantleType]}. The first one is used.`);
        return this.mantleAssets[0];
    }

    private _mantleEnd() {
        this._mantling = false;
        this.characterInfo.characterMovement.movementMode = MovementMode.Walking;
    }

    private _mantleUpdate(deltaTime: number) {
        this._mantleTime += deltaTime;
        
        const {
            x: positionAlpha,
            y: xzCorrectionAlpha,
            z: yCorrectionAlpha,
        } = this.mantleTimeline!.node.position;

        const resultPosition = new Vec3();
        resultPosition.x = lerp(this._mantleStartPosition.x, this._mantleTargetPosition.x, xzCorrectionAlpha);
        resultPosition.z = lerp(this._mantleStartPosition.z, this._mantleTargetPosition.z, xzCorrectionAlpha);
        resultPosition.y = lerp(this._mantleStartPosition.y, this._mantleTargetPosition.y, yCorrectionAlpha);
        this.node.worldPosition = resultPosition;
    }

    private _onMantleTimelineStop() {
        this.mantleTimeline!.off(Animation.EventType.STOP, this._onMantleTimelineStop, this);
        this._mantleEnd();
    }

    private _getCapsuleParams() {
        {
            const controller = this.node.getComponent(CapsuleCharacterController);
            if (controller) {
                return { node: this.node, radius: controller.radius, height: controller.height };
            }
        }
        {
            const collider = this.node.getComponent(CapsuleCollider);
            if (collider) {
                return { node: this.node, radius: collider.radius, height: collider.radius };
            }
        }
        return undefined;
    }
}

function getCapsuleBaseLocation(heightOffset: number, capsuleNode: Node) {
    return Vec3.scaleAndAdd(new Vec3(), capsuleNode.worldPosition, Vec3.UNIT_Y, heightOffset);
    // return Vec3.scaleAndAdd(new Vec3(),
    //     capsuleCollider.node.worldPosition, capsuleCollider.node.up, capsuleCollider.height / 2 + heightOffset);
}
