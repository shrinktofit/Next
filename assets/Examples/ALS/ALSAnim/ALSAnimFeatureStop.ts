import { _decorator, Vec3, Quat, toDegree, clamp, director, animation, game } from 'cc';
import { DEBUG } from 'cc/env';
import { createRealtimeNumberChart, RealTimeNumberChart } from '../Debug/Charts/ChartService';
import { ALSAnimFeature } from './ALSAnimFeature';
const { ccclass, property } = _decorator;

@ccclass('ALSAnimFeatureStop')
export class ALSAnimFeatureStop extends ALSAnimFeature {
    @property
    debug = false;

    onStart() {
        if (this.debug) {
            this._debugChart = createRealtimeNumberChart?.({
                valueDescriptions: [{
                    displayName: 'Foot Lock L',
                }, {
                    displayName: 'Foot Lock R',
                }],
                minValue: -1. * 1.1,
                maxValue: 1. * 1.1,
            });
        }
        listenToGraphEvent(this.animationController, `StopTransition`, () => {
            this.animationController.setValue(`StopTransition`, true);
        });

        listenToGraphEvent(this.animationController, '->N QuickStop', () => {
            this.animationController.setValue(`QuickStopN`, true);
        });

        for (const eventName of ['-->LockLeftFoot', '-->LockRightFoot', '-->PlantLeftFoot', '-->PlantRightFoot']) {
            listenToGraphEvent(this.animationController, eventName, () => {
                console.warn(eventName);
                // game.pause();
            });
        }
    }

    onUpdate() {
        let i = 0;
        this._debugChart?.setValue(i++, this.animationController.getAuxiliaryCurveValue_experimental('Foot Lock L'));
        this._debugChart?.setValue(i++, this.animationController.getAuxiliaryCurveValue_experimental('Foot Lock R'));
        this._debugChart?.update();
    }

    private _debugChart: RealTimeNumberChart | undefined;
}

function listenToGraphEvent(controller: animation.AnimationController, eventName: string, callback: () => void) {
    controller.graphEventReceiver.on(eventName, () => {
        if (false) {
            console.log(`Graph event ${eventName} triggered.`);
        }
        callback();
    });
}