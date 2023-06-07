import { _decorator, Component, Node, error, animation } from 'cc';
import { ALSCharacterInfo } from '../ALSCharacterInfo';
import { ALSAnimFeature } from './ALSAnimFeature';
import { ALSAnimFeatureAiming } from './ALSAnimFeatureAiming';
import { ALSAnimFeatureFootLock } from './ALSAnimFeatureFootLock';
import { ALSAnimFeatureLean } from './ALSAnimFeatureLean';
import { ALSAnimFeatureMovement } from './ALSAnimFeatureMovement';
import { ALSAnimFeatureStop } from './ALSAnimFeatureStop';
import { ALSAnimFeatureTurnInPlace } from './ALSAnimFeatureTurnInPlace';
import { ALSAnimFeatureJumpAndFall } from './ALSAnimFeatureJumpAndFall';
import { VarName } from './VarName';
import { ALSAnimFeatureMantle } from './ALSAnimFeatureMantle';
import { warn } from 'cc';
import { EventTarget } from 'cc';
const { ccclass, property, executionOrder } = _decorator;

const FEATURE_NAME_MOVEMENT = '移动';

const FEATURE_NAME_LEAN = '倾斜';

const FEATURE_NAME_TURN_IN_PLACE = '原地转向';

const FEATURE_NAME_AIMING = '瞄准';

const FEATURE_NAME_STOP = '停止';

const FEATURE_NAME_FOOT_LOCK = '脚步锁定';

const FEATURE_NAME_JUMP_AND_FALL = '跳和下落';

const FEATURE_NAME_MANTLE = '攀越';

const GROUP_ENABLING = '启用';

function featureEnabling(getFeature: (this: ALSAnim) => ALSAnimFeature): PropertyDecorator {
    return () => {
        return {
            get(this: ALSAnim) {
                return getFeature.call(this).enabled;
            },
            set(this: ALSAnim, value: boolean) {
                getFeature.call(this).enabled = value;
            },
        };
    };
}

@ccclass('ALSAnim')
@executionOrder(1)
export class ALSAnim extends Component {
    @featureEnabling(function(this: ALSAnim) { return this.featureMovement; })
    @property({
        group: GROUP_ENABLING,
        displayName: FEATURE_NAME_MOVEMENT,
    })
    public featureMovementEnabled = true;

    @property({
        group: FEATURE_NAME_MOVEMENT,
    })
    public featureMovement = new ALSAnimFeatureMovement();

    @property({
        group: FEATURE_NAME_STOP,
    })
    public featureStop = new ALSAnimFeatureStop();

    @featureEnabling(function(this: ALSAnim) { return this.featureStop; })
    @property({
        group: GROUP_ENABLING,
        displayName: FEATURE_NAME_STOP,
    })
    public featureStopEnabled = true;

    @property({
        group: FEATURE_NAME_LEAN,
    })
    public featureLean = new ALSAnimFeatureLean();

    @featureEnabling(function(this: ALSAnim) { return this.featureLean; })
    @property({
        group: GROUP_ENABLING,
        displayName: FEATURE_NAME_LEAN,
    })
    public featureLeanEnabled = true;

    @property({
        group: FEATURE_NAME_TURN_IN_PLACE,
    })
    public featureTurnInPlace = new ALSAnimFeatureTurnInPlace();

    @featureEnabling(function(this: ALSAnim) { return this.featureTurnInPlace; })
    @property({
        group: GROUP_ENABLING,
        displayName: FEATURE_NAME_TURN_IN_PLACE,
    })
    public featureTurnInPlaceEnabled = true;

    @property({
        group: FEATURE_NAME_AIMING,
    })
    public featureAiming = new ALSAnimFeatureAiming();

    @featureEnabling(function(this: ALSAnim) { return this.featureAiming; })
    @property({
        group: GROUP_ENABLING,
        displayName: FEATURE_NAME_AIMING,
    })
    public featureAimingEnabled = true;

    @property({
        group: FEATURE_NAME_JUMP_AND_FALL,
    })
    public featureJumpAndFall = new ALSAnimFeatureJumpAndFall();

    @featureEnabling(function(this: ALSAnim) { return this.featureJumpAndFall; })
    @property({
        group: GROUP_ENABLING,
        displayName: FEATURE_NAME_JUMP_AND_FALL,
    })
    public featureJumpAndFallEnabled = true;

    @property({
        group: FEATURE_NAME_FOOT_LOCK,
    })
    public featureFootLock = new ALSAnimFeatureFootLock();

    @featureEnabling(function(this: ALSAnim) { return this.featureFootLock; })
    @property({
        group: GROUP_ENABLING,
        displayName: FEATURE_NAME_FOOT_LOCK,
    })
    public featureFootLockEnabled = true;

    @property({
        group: FEATURE_NAME_MANTLE,
    })
    public featureMantle = new ALSAnimFeatureMantle();

    @featureEnabling(function(this: ALSAnim) { return this.featureMantle; })
    @property({
        group: GROUP_ENABLING,
        displayName: FEATURE_NAME_MANTLE,
    })
    public featureMantleEnabled = true;

    @property({
        group: GROUP_ENABLING,
        displayName: '调试',
    })
    public debug = false;

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
        
        for (const feature of ([
            this.featureMovement,
            this.featureStop,
            this.featureLean,
            this.featureTurnInPlace,
            this.featureMantle, // Make sure mantle is prior than jump
            this.featureJumpAndFall,
            this.featureAiming,
            this.featureFootLock,
        ] as const)) {
            if (feature.enabled) {
                if (!this.debug) {
                    feature.debug = false;
                }
                feature._init(
                    this,
                    this.node,
                    characterInfo!,
                    animationController!,
                );
                feature.onStart();
                this._activatedFeatures.push(feature);
            }
        }
    }

    update(deltaTime: number) {
        this._animationController.setValue(VarName.HasMovementInput, this.characterInfo.hasMovementInput);
        this._animationController.setValue(VarName.Speed, this.characterInfo.speed);
        this._animationController.setValue(VarName.MovementState, this._characterInfo.movementState);

        for (const feature of this._activatedFeatures) {
            feature.onUpdate(deltaTime);
        }
    }

    public subscribeAnimationEvent(eventName: string, callback: (...args: any[]) => void, thisArg?: object) {
        if (!this._animationEventTarget.hasEventListener(eventName)) {
            Object.defineProperty(this, eventName, {
                value: (...args: unknown[]) => {
                    this._dispatchAnimEvent(eventName, ...args);
                },
            });
        }
        this._animationEventTarget.on(eventName, callback, thisArg);
    }

    public unsubscribeAnimationEvent(eventName: string, callback?: (...args: any[]) => void, thisArg?: object) {
        this._animationEventTarget.off(eventName, callback, thisArg);
        if (!this._animationEventTarget.hasEventListener(eventName)) {
            this[eventName] = undefined;
        }
    }

    private _characterInfo!: ALSCharacterInfo;

    private _animationController!: animation.AnimationController;

    private _activatedFeatures: ALSAnimFeature[] = [];

    private _animationEventTarget = new EventTarget();

    private _dispatchAnimEvent(eventName: string, ...args: unknown[]) {
        this._animationEventTarget.emit(eventName, ...args);
    }

    protected get characterInfo() {
        return this._characterInfo;
    }

    protected get animationController() {
        return this._animationController;
    }
}
