import { _decorator, Component, Node, find, Vec3, v3, animation, toDegree, director } from 'cc';
import { getForward } from '../../Scripts/Utils/NodeUtils';
import { clampMap } from './Utility';
const { ccclass, property, executionOrder } = _decorator;

@ccclass('Aim')
@executionOrder(-99999)
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
        if (yawDeg !== this._yawDeg) {
            this._yawDeg = yawDeg;
        }

        if (globalThis.stats) {
            Object.assign(
                (globalThis.stats[director.getTotalFrames()] ??= {}),
                {
                    yaw: yawDeg,
                    ForwardYawTime: animationController.getValue('ForwardYawTime'),
                    LeftYawTime: animationController.getValue('ForwardYawTime'),
                    RightYawTime: animationController.getValue('ForwardYawTime'),
                },
            );
        }
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

