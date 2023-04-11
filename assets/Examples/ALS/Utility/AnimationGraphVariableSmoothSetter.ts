import { animation, lerp, clamp01 } from "cc";

export class AnimationGraphVariableSmoothSetter {
    constructor(
        private _animationController: animation.AnimationController,
        private _varName: string,
        private _duration: number,
        private _cubic: boolean = false,
    ) {
        this._source = this._animationController.getValue(_varName) as number;
        this._target = this._source;
    }

    public set(target: number) {
        if (this._duration <= 0.0) {
            this._elapsedTime = this._duration;
            this._source = this._target = target;
            this._writeActual(target);
        } else {
            this._source = this._calcCurrent();
            this._target = target;
            this._elapsedTime = 0.0;
        }
    }

    public update(deltaTime: number) {
        if (this._elapsedTime >= this._duration) {
            return;
        }
        this._elapsedTime += deltaTime;
        this._writeActual(this._calcCurrent());
    }

    private _source = 0.0;
    private _target = 0.0;
    private _elapsedTime = 0.0;

    private _calcCurrent() {
        const t = clamp01(this._elapsedTime / this._duration);
        const tTransformed = this._cubic ? t ** 3 : t;
        const current = lerp(this._source, this._target, tTransformed);
        return current;
    }

    private _writeActual(value: number) {
        this._animationController.setValue(this._varName, value);
    }
}