import { _decorator, Component, Node, Slider, animation } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('TestSetFootLockAlphas')
export class TestSetFootLockAlphas extends Component {
    public setL(slider: Slider) {
        this.node.getComponent(animation.AnimationController)?.setValue_experimental('FootLock_L_Alpha', slider.progress);
    }

    public setR(slider: Slider) {
        this.node.getComponent(animation.AnimationController)?.setValue_experimental('FootLock_R_Alpha', slider.progress);
    }
}


