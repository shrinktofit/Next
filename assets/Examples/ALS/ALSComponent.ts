import { _decorator, Component, Node, error, animation } from 'cc';
import { ALSCharacterInfo } from './ALSCharacterInfo';
const { ccclass, property } = _decorator;

@ccclass('ALSComponent')
export class ALSComponent extends Component {
    start() {
        const requiredComponents = ([ALSCharacterInfo, animation.AnimationController] as const).map((ComponentConstructor) => {
            const component = this.node.getComponent(ComponentConstructor as typeof Component);
            if (!component) {
                error(`Missing component ${ComponentConstructor.name}`);
            }
            return component;
        }) as [
            ALSCharacterInfo | null,
            animation.AnimationController | null,
        ];
        if (requiredComponents.some((c) => !c)) {
            this.enabled = false;
            return;
        }

        const [
            characterInfo,
            animationController,
        ] = requiredComponents;
        this._characterInfo = characterInfo!;
        this._animationController = animationController!;
    }

    update(deltaTime: number) {
    }

    private _characterInfo!: ALSCharacterInfo;

    private _animationController!: animation.AnimationController;

    protected get characterInfo() {
        return this._characterInfo;
    }

    protected get animationController() {
        return this._animationController;
    }
}


