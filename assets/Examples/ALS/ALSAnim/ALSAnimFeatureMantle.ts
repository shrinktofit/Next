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

@ccclass('ALSAnimFeatureMantle')
export class ALSAnimFeatureMantle extends ALSAnimFeature {
    @property
    groundedTraceSettings = new ALSMantleTraceSettings();

    @property
    automaticTraceSettings = new ALSMantleTraceSettings();

    @property
    fallingTraceSettings = new ALSMantleTraceSettings();

    onStart() {
        this.characterInfo.onJumpInput.subscribe(this._onJumpInput, this);

        if (this.debug) {
            this._debugger = new MantleDebugger();
        }
    }
    
    onUpdate(deltaTime: number) {
    }

    private _debugger: MantleDebugger | undefined;

    private _onJumpInput() {
        if (this.characterInfo.movementState === ALSMovementState.Grounded) {
            this._mantleCheck(this.groundedTraceSettings);
        }
    }

    private _mantleCheck(traceSettings: ALSMantleTraceSettings) {
        const capsuleCollider = this.node.getComponent(CapsuleCollider);
        if (!capsuleCollider) {
            return;
        }

        const traceDirection = getForward(this.node);
        const capsuleBaseLocation = getCapsuleBaseLocation(2.0 * UNIT_SCALE_ALS_TO_CC, capsuleCollider);
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
            if (hit) {
                this._debugger?.drawSweepCapsuleClosestResult(physics.PhysicsSystem.instance.sweepCastClosestResult);
            }
        }
        if (!hit) {
            return;
        }

        console.warn(`Hit`);
        this._mantleStart();
    }

    private _mantleStart() {
        this.characterInfo.characterMovement.movementMode = MovementMode.None;
        this.characterInfo.setMovementState(ALSMovementState.Mantling);
        this.animationController.setValue(VarName.PlayMantle1mLH, true);
        setTimeout(() => {
            this._mantleEnd();
        }, 3000);
    }

    private _mantleEnd() {
        this.characterInfo.characterMovement.movementMode = MovementMode.Walking;
    }
}

function getCapsuleBaseLocation(heightOffset: number, capsuleCollider: CapsuleCollider) {
    return Vec3.scaleAndAdd(new Vec3(), capsuleCollider.node.worldPosition, capsuleCollider.node.up, capsuleCollider.height / 2 + heightOffset);
}