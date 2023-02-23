import { _decorator, Component, Node, approx } from 'cc';
import { createRealtimeNumberChart, RealTimeNumberChart } from './Charts/ChartService';
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
            return v.normalizedTime !== undefined;
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
        if (entries.length === 1) {
            if (this._prev1) {
                return;
            }
            this._prev1 = true;
        } else {
            this._prev1 = false;
        }
        const sumWeight = entries.reduce((r, v) => r += (v.weight ?? 0.0), 0.0);
        if (!approx(sumWeight, 1.0)) {
            debugger;
        }
        console.log(entries.map((e) => {
            const w = Math.trunc((e.weight ?? 0.0) * 100);
            const dw = Math.trunc(((e.weight ?? 0.0) - (lastWeights[e.name] ?? 0.0)) * 100);
            return `${e.name}/${w}%(${dw}%)`;
        }));

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
    }

    private _chart: RealTimeNumberChart | undefined;
}

function getFrac(n: number) {
    return n - Math.trunc(n);
}

