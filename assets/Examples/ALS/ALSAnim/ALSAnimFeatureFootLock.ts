import { _decorator, Vec3, Quat, animation, clamp01, Node } from 'cc';
import { VEC3_NEGATIVE_Y } from '../../../Scripts/Utils/Math';
import { ALSCharacterInfo } from '../ALSCharacterInfo';
import { signedAngleVec3 } from '../Utility/SignedAngle';
import { ALSAnimFeature } from './ALSAnimFeature';
import { FootLockDebugger } from './FootLockDebugger';
import { interopToQuat, interopToVec3 } from '../Utility/InteropTo';
import { ALSMovementState } from './ALSMovementState';
import { DEBUG } from 'cc/env';
import { drawCube } from '../Utility/Gizmo';
import { Color } from 'cc';
import { componentToWorldPosition, worldToComponentPosition, worldToComponentRotation } from '../Source/Utils/ComponentSpaceConversion';
import { game } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('ALSAnimFeatureFootLock.FootLockSettings')
export class FootLockSettings {
    @property(Node)
    ikBone: Node | null = null;

    @property
    lockCurveName = 'Foot Lock [LR]';

    @property
    enableCurveName = 'Enable_FootIK_[LR]';

    @property
    lockAlphaVariableName = 'FootLock_[LR]_Alpha';

    @property
    lockLocationVariableName = 'FootLock_[LR]_Location';

    @property
    lockRotationVariableName = 'FootLock_[LR]_Rotation';
}


@ccclass('ALSAnimFeatureFootLock')
export class ALSAnimFeatureFootLock extends ALSAnimFeature {
    @property
    leftFootEnabled = true;

    @property({
        visible: function(this: ALSAnimFeatureFootLock) {
            return this.leftFootEnabled;
        },
    })
    leftFootSettings = new FootLockSettings();

    @property
    rightFootEnabled = true;

    @property({
        visible: function(this: ALSAnimFeatureFootLock) {
            return this.rightFootEnabled;
        },
    })
    rightFootSettings = new FootLockSettings();

    onStart() {
        if (this.leftFootEnabled && this.leftFootSettings.ikBone) {
            this._leftFootRecord = new FootLockRecord(
                this,
                this.animationController,
                this.characterInfo,
                this.leftFootSettings.enableCurveName,
                this.leftFootSettings.lockCurveName,
                this.leftFootSettings.ikBone,
                this.leftFootSettings.lockAlphaVariableName,
                this.leftFootSettings.lockLocationVariableName,
            );
        }
        if (this.rightFootEnabled && this.rightFootSettings.ikBone) {
            this._rightFootRecord = new FootLockRecord(
                this,
                this.animationController,
                this.characterInfo,
                this.rightFootSettings.enableCurveName,
                this.rightFootSettings.lockCurveName,
                this.rightFootSettings.ikBone,
                this.rightFootSettings.lockAlphaVariableName,
                this.rightFootSettings.lockLocationVariableName,
            );
        }

        if (this.debug) {
            this._debugger = new FootLockDebugger();
        }
    }

    onUpdate(deltaTime: number) {
        for (const record of [this._leftFootRecord, this._rightFootRecord]) {
            if (record) {
                record.onUpdate(deltaTime);
            }
        }

        this._debugger?.update(
            deltaTime,
            this.animationController,
            this.characterInfo,
        );
    }

    private _leftFootRecord: FootLockRecord | null = null;
    private _rightFootRecord: FootLockRecord | null = null;
    private _debugger: FootLockDebugger | undefined = undefined;
}

class FootLockRecord {
    constructor(
        private _owner: ALSAnimFeatureFootLock,
        private _animationController: animation.AnimationController,
        private _characterInfo: ALSCharacterInfo,
        private _enableLockCurveName: string,
        private _lockCurveName: string,
        private _bone: Node,
        private _footLockAlphaVarName: string,
        private _footLockLocationVarName: string,
    ) {
    }

    onUpdate(deltaTime: number) {
        // if (this._updateCount > 2) {
        //     this._debugUpdate(deltaTime);
        //     return;
        // }

        this._setFootLocking(deltaTime);
        this._debugUpdate(deltaTime);

        const { _animationController: animationController } = this;
        animationController.setValue(this._footLockAlphaVarName, this._currentLockStrength);
        animationController.setValue_experimental(this._footLockLocationVarName, this._lockingPosition);
        // const skeletalSpaceLocalPosition = new Vec3();
        // this._animationController.node.inverseTransformPoint(skeletalSpaceLocalPosition, this._lockingPosition);
        // animationController.setValue_experimental(this._footLockLocationVarName, skeletalSpaceLocalPosition);

        // const skeletalSpaceLockRotation = new Quat();
        // Quat.invert(skeletalSpaceLockRotation, this._animationController.node.worldRotation);
        // Quat.multiply(skeletalSpaceLockRotation, this._lockingRotation, skeletalSpaceLockRotation);
    }

    private _currentLockStrength = 0.0;
    private _lockingPosition = new Vec3();
    private _lockingRotation = new Quat();

    private _setFootLocking(deltaTime: number) {
        const { _animationController: animationController } = this;

        if (animationController.getAuxiliaryCurveValue_experimental(this._enableLockCurveName) <= 0.0) {
            return;
        }

        const lockCurveValue = animationController.getAuxiliaryCurveValue_experimental(this._lockCurveName);
        // const lockStrength = lockCurveValue;
        const lockStrength = clamp01(lockCurveValue);

        if (lockStrength < this._currentLockStrength || lockStrength >= 0.99) {
            this._currentLockStrength = lockStrength;
        }
        if (this._currentLockStrength >= 0.99) {
            worldToComponentPosition(this._lockingPosition, this._bone.worldPosition, animationController);
            worldToComponentRotation(this._lockingRotation, this._bone.worldRotation, animationController);
        }
        if (this._currentLockStrength > 0.0) {
            this._setFootLockOffsets(
                deltaTime,
                this._lockingPosition,
                this._lockingRotation,
            );
        }

        if (this._characterInfo.movementState === ALSMovementState.InAir) {
            this._resetIKOffsets(deltaTime);
        } else {
            
        }
    }

    private _setFootLockOffsets(deltaTime: number, localPosition: Vec3, localRotation: Quat) {
        const {
            _animationController: animationController,
            _characterInfo: characterInfo,
        } = this;

        const rotationDifference = new Quat(Quat.IDENTITY);
        // Use the delta between the current and last updated rotation to find how much the foot should be rotated
	    // to remain planted on the ground.
        if (characterInfo.movingOnGround) {
            subtractRotation(rotationDifference, characterInfo.worldRotation, characterInfo.lastUpdateWorldRotation);
            Quat.normalize(rotationDifference, rotationDifference);
        }
        if (!Quat.equals(rotationDifference, Quat.IDENTITY)) {
            // debugger; // Please test this case!
        }

        // Get the distance traveled between frames relative to the mesh rotation
	    // to find how much the foot should be offset to remain planted on the ground.
        const locationDifference = new Vec3();
        const CALCULATE_LOCATION_DIFFERENCE_USING_VELOCITY: boolean = true;
        if (CALCULATE_LOCATION_DIFFERENCE_USING_VELOCITY) {
            Vec3.multiplyScalar(locationDifference, characterInfo.velocity, deltaTime);
        } else {
            // This is different from ALS.
            Vec3.subtract(locationDifference, characterInfo.worldPosition, characterInfo.lastUpdateWorldPosition);
        }
        const invRotation = Quat.invert(new Quat(), animationController.node.rotation);
        Vec3.transformQuat(locationDifference, locationDifference, invRotation);

        // Subtract the location difference from the current local location and rotate
	    // it by the rotation difference to keep the foot planted in component space.
        Vec3.subtract(localPosition, localPosition, locationDifference);
        const q = Quat.fromAxisAngle(new Quat(), VEC3_NEGATIVE_Y, extractYawInRotation(rotationDifference));
        Vec3.transformQuat(localPosition, localPosition, q);

        // Subtract the Rotation Difference from the current Local Rotation to get the new local rotation.
        subtractRotation(localRotation, localRotation, rotationDifference);
        Quat.normalize(localRotation, localRotation);
    }

    private _resetIKOffsets(deltaTime: number) {
        interopToVec3(this._lockingPosition, this._lockingPosition, Vec3.ZERO, deltaTime, 15);
        interopToQuat(this._lockingRotation, this._lockingRotation, Quat.IDENTITY, deltaTime, 15);
    }

    private _debugUpdate(deltaTime: number) {
        if (!DEBUG || !this._owner.debug) {
            return;
        }
        drawCube(
            componentToWorldPosition(new Vec3(), this._lockingPosition, this._animationController),
            Vec3.multiplyScalar(new Vec3(), Vec3.ONE, 0.1),
            Color.RED,
        );
        // drawCube(
        //     componentToWorldPosition(new Vec3(), worldToComponentPosition(new Vec3(), this._bone.worldPosition, this._animationController), this._animationController),
        //     Vec3.multiplyScalar(new Vec3(), Vec3.ONE, 0.1),
        //     Color.GREEN,
        // );
        drawCube(
            Vec3.lerp(
                new Vec3(),
                componentToWorldPosition(new Vec3(), this._lockingPosition, this._animationController),
                this._bone.worldPosition,
                this._currentLockStrength,
            ),
            Vec3.multiplyScalar(new Vec3(), Vec3.ONE, 0.1),
            Color.BLACK,
        );
        drawCube(
            this._bone.worldPosition,
            Vec3.multiplyScalar(new Vec3(), Vec3.ONE, 0.1),
            Color.BLUE,
        );
    }
}

const subtractRotation = (() => {
    const cacheInv = new Quat();
    return (out: Quat, a: Readonly<Quat>, b: Readonly<Quat>) => {
        // c * b = a
        //     c = a * inv(b)
        const invB = Quat.invert(cacheInv, b);
        return Quat.multiply(out, a, invB);
    };
})();

function extractYawInRotation(rotation: Readonly<Quat>): number {
    // TODO: may be erroneous.
    const v = Vec3.transformQuat(new Vec3(), Vec3.UNIT_X, rotation);
    return signedAngleVec3(Vec3.UNIT_X, v, Vec3.UP);
}

