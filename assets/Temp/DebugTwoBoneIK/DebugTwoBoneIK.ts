import { _decorator, Component, Node, Slider, Vec3, lerp, animation } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('DebugTwoBoneIK')
export class DebugTwoBoneIK extends Component {
    @property
    public minX = -2;
    @property
    public maxX = 2;
    @property
    public minY = -2;
    @property
    public maxY = 2;
    @property
    public minZ = -2;
    @property
    public maxZ = 2;

    @property(Node)
    public endEffectorPositionIndicator: Node | null = null;

    start() {

    }

    update(deltaTime: number) {
        
    }

    public onSliderXChanged(slider: Slider) {
        this._value.x = lerp(this.minX, this.maxX, slider.progress);
        this._update();
    }

    public onSliderYChanged(slider: Slider) {
        this._value.y = lerp(this.minY, this.maxY, slider.progress);
        this._update();
    }

    public onSliderZChanged(slider: Slider) {
        this._value.z = lerp(this.minZ, this.maxZ, slider.progress);
        this._update();
    }

    private _value = new Vec3();

    private _update() {
        this.getComponent(animation.AnimationController)?.setValue_experimental('EndEffectorPosition', this._value);
        this.endEffectorPositionIndicator?.setPosition(this._value);
    }
}


