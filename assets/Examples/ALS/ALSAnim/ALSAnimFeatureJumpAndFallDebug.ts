import { _decorator, Component, Node, animation, warn, approx } from 'cc';
import { ALSCharacterInfo } from '../ALSCharacterInfo';
import { Vec3 } from 'cc';
import { LineRenderer } from '../Debug/DebugRenderer';
import { director } from 'cc';
import { Color } from 'cc';
import { ALSAnimFeatureJumpAndFall } from './ALSAnimFeatureJumpAndFall';

const { ccclass, property } = _decorator;

export class ALSAnimFeatureJumpAndFallDebugHelper {
    constructor(
        private host: ALSAnimFeatureJumpAndFall,
        private animationController: animation.AnimationController,
        private characterInfo: ALSCharacterInfo,
    ) {
        const debugLineNode = new Node();
        director.getScene()?.addChild(debugLineNode);
        this._debugLineRenderer = new LineRenderer(debugLineNode);
    }

    public update(deltaTime: number) {

    }

    public showTrace(
        from: Readonly<Vec3>,
        dir: Readonly<Vec3>,
        traceLength: number,
        hitPoint?: Readonly<Vec3>,
    ) {
        this._debugLineRenderer.clear();
        this._debugLineRenderer.lineFromDirScale(from, dir, traceLength, Color.BLACK);
        this._debugLineRenderer.commit();
    }

    private _debugLineRenderer: LineRenderer;
}