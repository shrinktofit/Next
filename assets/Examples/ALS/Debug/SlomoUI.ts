import { _decorator, Component, Node, Slider } from 'cc';
import { slomo } from './Slomo';
const { ccclass, property } = _decorator;

@ccclass('SlomoUI')
export class SlomoUI extends Component {
    start() {
        const slider = this.node.getComponent(Slider);
        if (slider) {
            this.onSliderValueChanged(slider);
        }
    }

    public onSliderValueChanged(slider: Slider) {
        slomo(slider.progress);
    }
}


