import { _decorator, Component, Node, find, Vec3, v3, animation } from 'cc';
import { getForward } from '../../Scripts/Utils/NodeUtils';
import { clampMap } from './Utility';
const { ccclass, property } = _decorator;

@ccclass('Aim')
export class Aim extends Component {
    start() {
    }

    update(deltaTime: number) {
        const animationController = this.getComponent(animation.AnimationController);
        if (!animationController) {
            return;
        }

        const viewDir = this._getViewDir();

        const characterDir = getForward(this.node);
        characterDir.y = 0.0;
        characterDir.normalize();

        const pitch = Math.asin(viewDir.y);

        const viewDirHorizontal = Vec3.clone(viewDir);
        viewDirHorizontal.y = 0.0;
        viewDirHorizontal.normalize();

        const yaw = signedAngleVec3(characterDir, viewDirHorizontal, Vec3.UP);
        const yawClampedMapped = clampMap(-yaw, -Math.PI, Math.PI, 0, 1);
        
        animationController.setValue('SweepUpDown', pitch / (Math.PI / 2));
        animationController.setValue('AimLeftRight', yawClampedMapped);
    }

    private _getViewDir() {
        const mainCamera = find('Main Camera');
        if (!mainCamera) {
            return new Vec3(0, 0, -1);
        }
        return Vec3.negate(v3(), getForward(mainCamera));
    }
}

function signedAngleVec3(a: Readonly<Vec3>, b: Readonly<Vec3>, normal: Readonly<Vec3>) {
    const angle = Vec3.angle(a, b);
    const cross = Vec3.cross(new Vec3(), a, b);
    cross.normalize();
    return Vec3.dot(cross, normal) < 0 ? -angle : angle;
}

