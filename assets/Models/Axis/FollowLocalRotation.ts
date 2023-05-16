import { _decorator, Component, Node } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('FollowLocalRotation')
export class FollowLocalRotation extends Component {
    @property(Node)
    target: Node | null = null;

    start() {

    }

    update(deltaTime: number) {
        if (this.target) {
            this.node.worldRotation = this.target.rotation;
            this.node.worldPosition = this.target.worldPosition;
        }    
    }
}


