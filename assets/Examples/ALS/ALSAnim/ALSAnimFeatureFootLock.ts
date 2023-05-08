import { _decorator, Vec3, Quat, animation, clamp01, Node } from 'cc';
import { VEC3_NEGATIVE_Y } from '../../../Scripts/Utils/Math';
import { ALSCharacterInfo } from '../ALSCharacterInfo';
import { signedAngleVec3 } from '../Utility/SignedAngle';
import { ALSAnimFeature } from './ALSAnimFeature';
import { FootLockDebugger } from './FootLockDebugger';
const { ccclass, property } = _decorator;

@ccclass('ALSAnimFeatureFootLock')
export class ALSAnimFeatureFootLock extends ALSAnimFeature {
    @property
    debug = false;

    @property
    leftFootEnabled = true;

    @property({
        type: Node,
        visible: function(this: ALSAnimFeatureFootLock) {
            return this.leftFootEnabled;
        },
    })
    leftFoot: Node | null = null;

    @property
    rightFootEnabled = true;

    @property({
        type: Node,
        visible: function(this: ALSAnimFeatureFootLock) {
            return this.rightFootEnabled;
        },
    })
    rightFoot: Node | null = null;

    onStart() {
        if (this.leftFootEnabled && this.leftFoot) {
            this._leftFootRecord = new FootLockRecord(
                this.animationController,
                this.characterInfo,
                'Foot Lock L',
                this.leftFoot,
                'FootLock_L_Alpha',
                'FootLock_L_Location'
            );
        }
        if (this.rightFootEnabled && this.rightFoot) {
            this._rightFootRecord = new FootLockRecord(
                this.animationController,
                this.characterInfo,
                'Foot Lock R',
                this.rightFoot,
                'FootLock_R_Alpha',
                'FootLock_R_Location'
            );
        }

        if (this.debug) {
            this._debugger = new FootLockDebugger();
        }
    }

    onUpdate(deltaTime: number) {
        this._debugger?.update(
            deltaTime,
            this.animationController,
            this.characterInfo,
        );

        for (const record of [this._leftFootRecord, this._rightFootRecord]) {
            if (record) {
                record.onUpdate(deltaTime);
            }
        }
    }

    private _leftFootRecord: FootLockRecord | null = null;
    private _rightFootRecord: FootLockRecord | null = null;
    private _debugger: FootLockDebugger | undefined = undefined;
}

class FootLockRecord {
    constructor(
        private _animationController: animation.AnimationController,
        private _characterInfo: ALSCharacterInfo,
        private _curveName: string,
        private _bone: Node,
        private _footLockAlphaVarName: string,
        private _footLockLocationVarName: string,
    ) {
    }

    onUpdate(deltaTime: number) {
        const {
            _animationController: animationController,
        } = this;

        const lockStrengthUnclamped = animationController.getAuxiliaryCurveValue_experimental(this._curveName);
        const lockStrength = clamp01(lockStrengthUnclamped);
        if (lockStrength < this._currentLockStrength || lockStrength >= 0.99) {
            this._currentLockStrength = lockStrength;
        }
        if (this._currentLockStrength >= 0.99) {
            Vec3.copy(this._lockingPosition, this._bone.worldPosition);
            Quat.copy(this._lockingRotation, this._bone.worldRotation);
        }
        if (this._currentLockStrength > 0.0) {
            this._setFootLockOffsets(
                deltaTime,
                this._lockingPosition,
                this._lockingRotation,
            );
        }

        animationController.setValue(this._footLockAlphaVarName, this._currentLockStrength);

        const skeletalSpaceLocalPosition = new Vec3();
        this._animationController.node.inverseTransformPoint(skeletalSpaceLocalPosition, this._lockingPosition);
        animationController.setValue_experimental(this._footLockLocationVarName, skeletalSpaceLocalPosition);

        const skeletalSpaceLockRotation = new Quat();
        Quat.invert(skeletalSpaceLockRotation, this._animationController.node.worldRotation);
        Quat.multiply(skeletalSpaceLockRotation, this._lockingRotation, skeletalSpaceLockRotation);
    }

    private _currentLockStrength = 1.0;
    private _lockingPosition = new Vec3();
    private _lockingRotation = new Quat();

    private _setFootLockOffsets(deltaTime: number, localPosition: Vec3, localRotation: Quat) {
        const {
            _animationController: animationController,
            _characterInfo: characterInfo,
        } = this;

        const rotationDifference = new Quat(Quat.IDENTITY);
        // Use the delta between the current and last updated rotation to find how much the foot should be rotated
	    // to remain planted on the ground.
        if (characterInfo.isMovingOnGround()) {
            subtractRotation(rotationDifference, characterInfo.worldRotation, characterInfo.lastUpdateWorldRotation);
            Quat.normalize(rotationDifference, rotationDifference);
        }
        if (!Quat.equals(rotationDifference, Quat.IDENTITY)) {
            // debugger; // Please test this case!
        }

        // Get the distance traveled between frames relative to the mesh rotation
	    // to find how much the foot should be offset to remain planted on the ground.
        const locationDifference = new Vec3();
        const CALCULATE_LOCATION_DIFFERENCE_USING_VELOCITY: boolean = false;
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