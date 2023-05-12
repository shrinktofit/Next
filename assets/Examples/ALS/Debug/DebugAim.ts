import { find } from 'cc';
import { Quat } from 'cc';
import { toRadian } from 'cc';
import { Vec3 } from 'cc';
import { _decorator, Node } from 'cc';
import { tween } from 'cc';
import { getForward } from '../../../Scripts/Utils/NodeUtils';
import { FirstPersonCamera } from '../../../Scripts/FirstPersonCamera';
import { DEBUG, EDITOR } from 'cc/env';
import { animation } from 'cc';
import { director } from 'cc';
import { game } from 'cc';

if (DEBUG && !EDITOR) {
    // ALS also has this bug.
    Object.defineProperty(globalThis, 'run_aim_bug_2023512', {
        value: (pause = false) => {
            // Slomo 0.5
            const TIME_MULTIPLIER = 1.0 / 5.;
            const character = find('AnimMan')!;
            const anim = character.getComponent(animation.AnimationController)!;
            const events = ['AimLeftEnter', 'AimRightEnter', 'SwitchEnter', 'AimForwardEnter'];
            tween(new TweenTarget(character))
                .call(() => { console.clear(); })
                .to(0.0, { 'positionDeg': 70.0 })
                .delay(0.5)
                .call(() => { console.warn('Start'); })
                .to(2. * TIME_MULTIPLIER, { 'positionDeg': -70, })
                .call(() => { console.warn('Start back'); if (pause) { game.pause(); } })
                .to(0.8 * TIME_MULTIPLIER, { positionDeg: 30 })
                .call(() => {
                    for (const eventName of events) {
                        anim.offCustomEvent_experimental(eventName);
                    }
                })
                .start();
            for (const eventName of events) {
                anim.onCustomEvent_experimental(eventName, () => {
                    console.warn(director.getTotalFrames(), eventName, `${anim.getValue('AimLeftRight')}`);
                });
            }
        },
    });

    class TweenTarget {
        constructor(private node: Node) {}

        get positionDeg() {
            return this._positionDeg;
        }
    
        set positionDeg (value) {
            this._positionDeg = value;
            const camera = find('Main Camera')!.getComponent(FirstPersonCamera)!;
            const cameraOldDir = Vec3.subtract(new Vec3(), camera.node.worldPosition, camera.target.worldPosition);
            const cameraOldDist = Vec3.len(cameraOldDir);
            cameraOldDir.normalize();
            const horizontalDir = new Vec3(cameraOldDir.x, 0.0, cameraOldDir.z);
            horizontalDir.normalize();
            const liftQ = Quat.rotationTo(new Quat(), horizontalDir, cameraOldDir);
    
            const dir = Vec3.transformQuat(new Vec3(), getForward(this.node), Quat.fromAxisAngle(new Quat(), Vec3.UNIT_Y, toRadian(this._positionDeg)));
            // const axis = Vec3.cross(new Vec3(), dir, Vec3.UNIT_Y);
            // axis.normalize();
            // Vec3.transformQuat(dir, dir, liftQ);
            Vec3.scaleAndAdd(dir, camera.target.worldPosition, dir, cameraOldDist);
            camera.node.worldPosition = dir;
            camera.node.lookAt(camera.target.worldPosition);
        }
    
        private _positionDeg: number = 0.0;
    }
}


