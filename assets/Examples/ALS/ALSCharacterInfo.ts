import { _decorator, Component, Node, Vec3, find } from 'cc';
import { getForward } from '../../Scripts/Utils/NodeUtils';
const { ccclass, property } = _decorator;

@ccclass('ALSCharacterInfo')
export class ALSCharacterInfo extends Component {
    public velocity = new Vec3();

    public get viewDirection(): Readonly<Vec3> {
        return this._viewDirection;
    }

    public update() {
        this._fetchViewDirection();
    }

    private readonly _viewDirection = new Vec3();

    private _fetchViewDirection() {
        const mainCamera = find('Main Camera');
        if (!mainCamera) {
            return Vec3.set(this._viewDirection, 0, 0, -1);
        } else {
            return Vec3.negate(this._viewDirection, getForward(mainCamera));
        }
    }
}


