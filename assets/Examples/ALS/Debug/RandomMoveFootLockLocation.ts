import { _decorator, Component, Node, Vec3, animation } from 'cc';
import { interopTo } from '../Utility/InteropTo';
const { ccclass, property } = _decorator;

@ccclass('RandomMoveFootLockLocation')
export class RandomMoveFootLockLocation extends Component {
    @property(Node)
    initialNode!: Node;

    @property
    extentX = 0.5;

    @property
    extentY = 0.5;

    @property
    extentZ = 0.5;

    @property
    interopSpeed = 3;

    @property(animation.AnimationController)
    controller!: animation.AnimationController;

    @property
    varName = '';

    start() {
        Vec3.copy(this._initialPosition, this.initialNode.worldPosition);
        Vec3.copy(this._currentPosition, this._initialPosition);
    }

    update(deltaTime: number) {
        if (Vec3.equals(this._currentPosition, this._targetPosition)) {
            const r = () => (Math.random() - 0.5) * 2;
            Vec3.add(this._targetPosition, this._initialPosition, new Vec3(
                this.extentX * r(),
                this.extentY * r(),
                this.extentZ * r(),
            ));
        }

        this._currentPosition.x = interopTo(this._currentPosition.x, this._targetPosition.x, deltaTime, this.interopSpeed);
        this._currentPosition.y = interopTo(this._currentPosition.y, this._targetPosition.y, deltaTime, this.interopSpeed);
        this._currentPosition.z = interopTo(this._currentPosition.z, this._targetPosition.z, deltaTime, this.interopSpeed);

        this.node.worldPosition = this._currentPosition;

        this.controller.setValue_experimental(this.varName, this._currentPosition);
    }

    private _initialPosition = new Vec3();
    private _currentPosition = new Vec3();
    private _targetPosition = new Vec3();
}


