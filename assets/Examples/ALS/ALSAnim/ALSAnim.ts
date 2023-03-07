import { _decorator, Component, Node, error, animation } from 'cc';
import { ALSCharacterInfo } from '../ALSCharacterInfo';
import { ALSAnimFeature } from './ALSAnimFeature';
import { ALSAnimFeatureAiming } from './ALSAnimFeatureAiming';
import { ALSAnimFeatureLean } from './ALSAnimFeatureLean';
import { ALSAnimFeatureMovement } from './ALSAnimFeatureMovement';
import { ALSAnimFeatureStop } from './ALSAnimFeatureStop';
import { ALSAnimFeatureTurnInPlace } from './ALSAnimFeatureTurnInPlace';
const { ccclass, property, executionOrder } = _decorator;

const FEATURE_NAME_MOVEMENT = '移动';

const FEATURE_NAME_LEAN = '倾斜';

const FEATURE_NAME_TURN_IN_PLACE = '原地转向';

const FEATURE_NAME_AIMING = '瞄准';

const FEATURE_NAME_STOP = '停止';

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
        
        for (const feature of ([
            this.featureMovement,
            this.featureStop,
            this.featureLean,
            this.featureTurnInPlace,
            this.featureAiming,
        ] as const)) {
            if (feature.enabled) {
                feature._init(
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
        for (const feature of this._activatedFeatures) {
            feature.onUpdate(deltaTime);
        }
    }

    private _characterInfo!: ALSCharacterInfo;

    private _animationController!: animation.AnimationController;

    private _activatedFeatures: ALSAnimFeature[] = [];

    protected get characterInfo() {
        return this._characterInfo;
    }

    protected get animationController() {
        return this._animationController;
    }
}
