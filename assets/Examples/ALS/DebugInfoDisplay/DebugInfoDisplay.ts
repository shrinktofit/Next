import { _decorator, Component, Node, Prefab, instantiate, Label, RichText, clamp01 } from 'cc';
const { ccclass, property } = _decorator;
import tabel from '../../../../External/table/table.js';

let singleton: DebugInfoDisplay | undefined = undefined;

@ccclass('DebugInfoDisplay')
export class DebugInfoDisplay extends Component {
    __preload() {
        singleton = this;
    }

    public addBoolean(label: string, value: boolean): BooleanRecord {
        return this._records[label] = new BooleanRecord(value);
    }

    public addRangedFloat(label: string, value: number, min: number, max: number, options: FloatOptions = {}): RangedFloatRecord {
        return this._records[label] = new RangedFloatRecord(value, min, max, options);
    }

    public update() {
        if (Object.keys(this._records).length === 0) {
            this.node.getChildByName('Text')!.getComponent(RichText)!.string = `<color=#000000>No any info.</color>`;
            return;
        }
        const data: string[][] = [];
        for (const [label, record] of Object.entries(this._records)) {
            let string = '';
            if (record instanceof RangedFloatRecord) {
                const { min, max, value, options } = record;
                const steps = 10;
                const t = clamp01((record.value - record.min) / (record.max - record.min));
                const progressSteps = Math.round( steps * t);
                const repeated = (length: number, character: string) => new Array(length).fill(character).join('');
                const bar = `${repeated(progressSteps, ' ')}${repeated(1, '=')}${repeated(steps - progressSteps, ' ')}`;
                string = `[${bar}]${value.toFixed(options.fractionDigits ?? 2)}([${record.min}, ${record.max}])`;
            } else if (record instanceof BooleanRecord) {
                string = `${record.value ? '√' : '×'}`;
            }
            data.push([label, string]);
        }
        const formatted = tabel.table(data, {

        });
        this.node.getChildByName('Text')!.getComponent(RichText)!.string = `<color=#000000>${formatted}</color>`;
    }

    private _records: Record<string, RangedFloatRecord | BooleanRecord> = {};
}

export const getGlobalDebugInfoDisplay = () => {
    return singleton;
}

export interface FloatOptions {
    fractionDigits?: number;
}

export class RangedFloatRecord {
    constructor(
        public value: number,
        public min: number,
        public max: number,
        public options: FloatOptions,
    ) {

    }
}

export class BooleanRecord {
    constructor(public value: boolean) {
    }
}
