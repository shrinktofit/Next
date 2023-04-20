import { _decorator, Vec3, Quat, toDegree, clamp, director } from 'cc';
import { ALSAnimFeature } from './ALSAnimFeature';
import { ALSMovementState } from './ALSMovementState';
import { clampMap } from '../Utility/ClampMap';
import { UNIT_SCALE_ALS_TO_CC } from '../Utility/UnitConversion';
import { DEBUG } from 'cc/env';
import { VarName } from './VarName';
import { assertIsTrue } from '../Utility/Asserts';
import { ALSCharacterEventType } from '../ALSCharacterInfo';
import { RangedFloatRecord, getGlobalDebugInfoDisplay } from '../DebugInfoDisplay/DebugInfoDisplay';
const { ccclass, property } = _decorator;

const JUMP_PLAY_RATE_MIN = 1.2;
const JUMP_PLAY_RATE_MAX = 1.5;

@ccclass('ALSAnimFeatureJumpAndFall')
export class ALSAnimFeatureJumpAndFall extends ALSAnimFeature {
    @property
    debug = false;

    onStart() {
        this.characterInfo.on(ALSCharacterEventType.Jump, this.onJumped, this);

        if (this.debug) {
            const display = getGlobalDebugInfoDisplay();
            if (display) {
                this._debugRecords = {
                    jumpWalkRunBlend: display.addRangedFloat('JumpWalkRunBlend', 0.0, 0.0, 1.0, {}),
                    jumpPlayRate: display.addRangedFloat('JumpPlayRate', 0.0, JUMP_PLAY_RATE_MIN, JUMP_PLAY_RATE_MAX, {}),
                    jumpLandBlend: display.addRangedFloat('JumpLandBlend', 0.0, 0.0, 1.0, {}),
                    landHeavyLightBlend: display.addRangedFloat('LandHeavyLightBlend', 0.0, 0.0, 1.0, {}),
                };
            }
        }
    }
    
    onUpdate(deltaTime: number) {
        if (this._jumpedFlagUnsetTimer > 0.0) {
            this._jumpedFlagUnsetTimer -= deltaTime;
            if (this._jumpedFlagUnsetTimer <= 0.0) {
                this._unsetJumped();
            }
        }

        if (this.characterInfo.movementState !== ALSMovementState.InAir) {
            return;
        }

        const speed = this.characterInfo.speed;
        const fallSpeed = this.characterInfo.velocity.y;
        const landPrediction = this._calculateLandPrediction();

        this.animationController.setValue(VarName.Jumped, this._jumped);

        this.animationController.setValue(VarName.JumpPlayRate, this._jumpPlayRate);
        if (DEBUG && this._debugRecords) {
            this._debugRecords.jumpPlayRate.value = this._jumpPlayRate;
        }

        // Set `JumpWalkRunBlend` according to speed.
        {
            // TODO: interop speed increasing/decreasing
            const jumpWalkRunBlend = clampMap(
                speed, 200 * UNIT_SCALE_ALS_TO_CC, 500 * UNIT_SCALE_ALS_TO_CC, 0, 1);
            this.animationController.setValue(VarName.JumpWalkRunBlend, jumpWalkRunBlend);
            if (DEBUG && this._debugRecords) {
                this._debugRecords.jumpWalkRunBlend.value = jumpWalkRunBlend;
            }
        }

        // Set `LandHeavyLightBlend` according to fall speed.
        {
            // TODO: interop speed increasing/decreasing
            // TODO:
            // > ALS use clampMap(fallSpeed, -1000, 500, 0, 1) for blend in jump state,
            // > whereas use clampMap(abs(fallSpeed), 500, 1000, 0, 1) for blend in land state,
            // > we uniform use the later here.
            const landHeavyLightBlend = clampMap(
                Math.abs(fallSpeed), 500 * UNIT_SCALE_ALS_TO_CC, 1000 * UNIT_SCALE_ALS_TO_CC, 0.0, 1.0);
            this.animationController.setValue(VarName.LandHeavyLightBlend, landHeavyLightBlend);
            if (DEBUG && this._debugRecords) {
                this._debugRecords.landHeavyLightBlend.value = landHeavyLightBlend;
            }
        }

        // Set `JumpLandBlend` according to land prediction.
        {
            const jumpLandBlend = landPrediction;
            this.animationController.setValue(VarName.JumpLandBlend, jumpLandBlend);
            if (DEBUG && this._debugRecords) {
                this._debugRecords.jumpLandBlend.value = jumpLandBlend;
            }
        }
    }

    onJumped() {
        assertIsTrue(this.characterInfo.movementState === ALSMovementState.InAir);

        this._jumped = true;
        this._jumpPlayRate = clampMap(
            this.characterInfo.speed,
            0.0, 600.0,
            JUMP_PLAY_RATE_MIN, JUMP_PLAY_RATE_MAX,
        );
        this._jumpedFlagUnsetTimer = 0.1;
    }

    private _jumped = false;
    private _jumpPlayRate = 0.0;
    private _jumpedFlagUnsetTimer = 0.0;
    private _debugRecords: undefined | {
        jumpWalkRunBlend: RangedFloatRecord;
        jumpPlayRate: RangedFloatRecord;
        jumpLandBlend: RangedFloatRecord;
        landHeavyLightBlend: RangedFloatRecord;
    };

    private _unsetJumped() {
        this._jumped = false;
    }

    private _calculateLandPrediction() {
        const fallSpeed = this.characterInfo.velocity.y;
        if (fallSpeed >= -200 * UNIT_SCALE_ALS_TO_CC) {
            return 0.0;
        }



        return 0.0;
    }
}