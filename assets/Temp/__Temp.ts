import { _decorator, Component, Node, approx, KeyCode, game, input, Input } from 'cc';
import { globalInputManager } from '../Examples/ALS/Input/Input';
import { createRealtimeNumberChart, RealTimeNumberChart } from '../Examples/ALS/Debug/Charts/ChartService';
const { ccclass, property } = _decorator;

@ccclass('__Temp')
export class __Temp extends Component {
    start() {
        // this._chart = createRealtimeNumberChart?.({
        //     valueDescriptions: [
        //         { displayName: 'F Time' },
        //         { displayName: 'F Weight' },
        //         { displayName: 'B Time' },
        //         { displayName: 'B Weight' },
        //     ],
        // });
        input.on(Input.EventType.KEY_UP, (event) => {
            if (event.keyCode === KeyCode.KEY_O) {
                this._debug = true;
                globalInputManager.sendKeyDown(KeyCode.KEY_W);
            } else {
                if (event.keyCode === KeyCode.KEY_P) {
                    globalInputManager.sendKeyDown(KeyCode.KEY_W);
                    debugger;
                }
            }
        });
    }

    private _prev1 = false;

    private _lastWeights: Record<string, number> = {};

    update(deltaTime: number) {
        const {xx} = (globalThis as unknown as {
            xx?: Map<any, {
                motion: any;
                weight?: number;
                normalizedTime?: number;
            }>
        });
        if (!xx) {
            return;
        }
        const entries = [...xx.values()].map((v) => ({
            name: v.motion.clip.name as string,
            normalizedTime: v.normalizedTime,
            weight: v.weight,
        })).filter((v) => {
            return v.normalizedTime !== undefined && (v.weight ?? 0.0) > 1e-6;
        }).sort((a, b) => {
            return a.name.localeCompare(b.name);
        });

        const lastWeights = this._lastWeights;
        this._lastWeights = {};
        for (const v of entries) {
            if (v.weight !== undefined) {
                this._lastWeights[v.name] = v.weight;
            }
        }
        if (entries.length === 0.0) {
            return;
        }
        // if (entries.length === 1) {
        //     if (this._prev1) {
        //         return;
        //     }
        //     this._prev1 = true;
        // } else {
        //     this._prev1 = false;
        // }
        // const sumWeight = entries.reduce((r, v) => r += (v.weight ?? 0.0), 0.0);
        // if (!approx(sumWeight, 1.0)) {
        //     debugger;
        // }
        console.log(entries.map((e) => {
            const w = Math.round((e.weight ?? 0.0) * 100);
            const dw = Math.round(((e.weight ?? 0.0) - (lastWeights[e.name] ?? 0.0)) * 100);
            const t = Math.round(getFrac(e.normalizedTime ?? 0.0) * 100);
            return `${e.name}/${w}%(${dw}%)@${t}%`;
        }).join(', '));

        const entryF = entries.find((e) => e.name === 'ALS_N_Run_F');
        const entryB = entries.find((e) => e.name === 'ALS_N_Run_B');

        if (this._chart) {
            let i = 0;
            this._chart.setValue(i++, getFrac(entryF?.normalizedTime ?? 0.0));
            this._chart.setValue(i++, entryF?.weight ?? 0.0);
            this._chart.setValue(i++, getFrac(entryB?.normalizedTime ?? 0.0));
            this._chart.setValue(i++, entryB?.weight ?? 0.0);
            this._chart.update();
        }

        if (this._debug) {
            const debugTime = 0.27;
            if (entries.length === 1 && entries[0].name === 'ALS_N_Walk_F' && approx(getFrac(entries[0].normalizedTime ?? 0.0), debugTime, 1e-2)) {
                this._debug = false;
                globalThis.slomo = 0.02;
                globalInputManager.sendKeyUp(KeyCode.KEY_W);
                globalInputManager.sendKeyDown(KeyCode.KEY_S);
                // setTimeout(() => {
                //     game.pause();
                // }, 2000);
                // game.pause();
            }
        }
    }

    private _chart: RealTimeNumberChart | undefined;
    private _debug = false;
}

function getFrac(n: number) {
    return n - Math.trunc(n);
}

