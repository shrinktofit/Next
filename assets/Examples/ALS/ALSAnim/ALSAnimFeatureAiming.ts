import { _decorator, Vec3, Quat, toDegree, clamp, director } from 'cc';
import { getForward } from '../../../Scripts/Utils/NodeUtils';
import { clampMap } from '../Utility/ClampMap';
import { signedAngleVec3 } from '../Utility/SignedAngle';
import { ALSAnimFeature } from './ALSAnimFeature';
const { ccclass, property } = _decorator;

@ccclass('ALSAnimFeatureAiming')
export class ALSAnimFeatureAiming extends ALSAnimFeature {
    onUpdate(deltaTime: number) {
        const animationController = this.animationController

        const viewDir = this.characterInfo.viewDirection;

        const characterDir = getForward(this.node);
        characterDir.y = 0.0;
        characterDir.normalize();

        const pitch = Math.asin(viewDir.y);

        const viewDirHorizontal = Vec3.clone(viewDir);
        viewDirHorizontal.y = 0.0;
        viewDirHorizontal.normalize();

        const yaw = -signedAngleVec3(characterDir, viewDirHorizontal, Vec3.UP);
        
        animationController.setValue('SweepUpDown', pitch / (Math.PI / 2));
        const yawDeg = toDegree(yaw);
        animationController.setValue('AimLeftRight', yawDeg);

        animationController.setValue(
            `ForwardYawTime`,
            clampMap(yaw, -Math.PI, Math.PI, 0, 1)
        );
        animationController.setValue(
            `LeftYawTime`,
            clampMap(Math.abs(yaw), 0, Math.PI, 0.5, 0.0)
        );
        animationController.setValue(
            `RightYawTime`,
            clampMap(Math.abs(yaw), 0, Math.PI, 0.5, 1.0)
        );
    }
}