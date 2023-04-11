import { _decorator, Vec3, Quat, toDegree, clamp, director, animation, game } from 'cc';
import { DEBUG } from 'cc/env';
import { createRealtimeNumberChart, RealTimeNumberChart } from '../Debug/Charts/ChartService';
import { ALSAnimFeature } from './ALSAnimFeature';
const { ccclass, property } = _decorator;

const CHART_FEET_POSITION_ENABLED: boolean = true;

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
                },

                ...(CHART_FEET_POSITION_ENABLED ? [{
                    displayName: 'Feet Position',
                }]: []),

                {
                    displayName: 'Foot Lock L Alpha',
                }, {
                    displayName: 'Foot Lock R Alpha',
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

        for (const eventName of [
            '-> Debug Lock Left Foot',
            '-> Debug Lock Right Foot',
            '-> Debug Plant Left Foot',
            '-> Debug Plant Right Foot',
        ]) {
            listenToGraphEvent(this.animationController, eventName, () => {
                console.warn(eventName);
            });
        }

        for (const eventName of ['->N Stop L', '->N Stop R']) {
            listenToGraphEvent(this.animationController, eventName, () => {
                this.animationController.setValue(eventName, true);
                // game.pause();
            });
        }

        for (const eventName of ['Hips F', 'Hips B', 'Hips LF', 'Hips LB', 'Hips RF', 'Hips RB']) {
            listenToGraphEvent(this.animationController, eventName, () => {
                console.warn(eventName);
                
                let hipsDirection = HipsDirection.F;
                switch (eventName) {
                    case 'Hips F': hipsDirection = HipsDirection.F; break;
                    case 'Hips B': hipsDirection = HipsDirection.B; break;
                    case 'Hips LF': hipsDirection = HipsDirection.LF; break;
                    case 'Hips LB': hipsDirection = HipsDirection.LB; break;
                    case 'Hips RF': hipsDirection = HipsDirection.RF; break;
                    case 'Hips RB': hipsDirection = HipsDirection.RB; break;
                }
                this.animationController.setValue('TrackedHipsDirection', hipsDirection);
                this.animationController.setValue('TrackedHipsDirection_LB', hipsDirection === HipsDirection.LB);
                this.animationController.setValue('TrackedHipsDirection_RB', hipsDirection === HipsDirection.RB);
            });
        }
    }

    onUpdate() {
        let i = 0;
        this._debugChart?.setValue(i++, this.animationController.getAuxiliaryCurveValue_experimental('Foot Lock L'));
        this._debugChart?.setValue(i++, this.animationController.getAuxiliaryCurveValue_experimental('Foot Lock R'));
        if (CHART_FEET_POSITION_ENABLED) {
            this._debugChart?.setValue(i++, this.animationController.getAuxiliaryCurveValue_experimental('Feet_Position'));
        }
        this._debugChart?.setValue(i++, this.animationController.getValue('FootLock_L_Alpha') as number);
        this._debugChart?.setValue(i++, this.animationController.getValue('FootLock_R_Alpha') as number);
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

enum HipsDirection {
    F, B, LF, LB, RF, RB,
}