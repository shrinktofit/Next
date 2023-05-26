import { Vec3 } from 'cc';
import { _decorator, Node } from 'cc';
import { UNIT_SCALE_ALS_TO_CC } from './Utility/UnitConversion';
const { ccclass, property } = _decorator;

@ccclass('CharacterControllerFallingSimulation')
export class CharacterControllerFallingSimulation {
    @property
    public mass = 1.0;

    @property
    public gravity = 9.18;

    get falling() {
        return this._falling;
    }

    get velocity() {
        return this._velocity;
    }

    get acceleration() {
        return this._acceleration;
    }

    public declare node: Node;

    start() {

    }

    update(deltaTime: number) {
        if (this._falling) {
            this._acceleration = this.gravity;
            this._velocity += -this.gravity * deltaTime;
        } else {
            this._acceleration = 0.0;
        }

        const t = this._velocity * deltaTime;
        this.node.translate(new Vec3(0.0, t));

        if (this.node.worldPosition.y < 0.0) {
            this.node.worldPosition = new Vec3(this.node.worldPosition.x, 0.0, this.node.worldPosition.z);

            this._velocity = 0.0;
            this._acceleration = 0.0;

            this._falling = false;
        }
    }

    public jump() {
        if (!this._falling) {
            this._jump();
        }
    }

    private _falling = false;
    private _velocity = 0.0;
    private _acceleration = 0.0;

    private _jump() {
        if (this._falling) {
            return;
        }

        this._falling = true;

        this._velocity = 600 * UNIT_SCALE_ALS_TO_CC;
    }
}


