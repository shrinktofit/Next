import { _decorator, Vec3, Quat, toDegree, clamp, director, animation } from 'cc';
import { DEBUG } from 'cc/env';
import { ALSAnimFeature } from './ALSAnimFeature';
const { ccclass, property } = _decorator;

@ccclass('ALSAnimFeatureStop')
export class ALSAnimFeatureStop extends ALSAnimFeature {
    onStart() {
        listenToGraphEvent(this.animationController, `StopTransition`, () => {
            this.animationController.setValue(`StopTransition`, true);
        });

        listenToGraphEvent(this.animationController, '->N QuickStop', () => {
            this.animationController.setValue(`QuickStopN`, true);
        });
    }
}

function listenToGraphEvent(controller: animation.AnimationController, eventName: string, callback: () => void) {
    controller.graphEventReceiver.on(eventName, () => {
        if (false) {
            console.log(`Graph event ${eventName} triggered.`);
        }
        callback();
    });
}