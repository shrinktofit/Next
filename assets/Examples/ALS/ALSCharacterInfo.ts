import { _decorator, Component, Node, Vec3, find } from 'cc';
import { getForward } from '../../Scripts/Utils/NodeUtils';
const { ccclass, property } = _decorator;

@ccclass('ALSCharacterInfo')
export class ALSCharacterInfo extends Component {
    public get hasMovementInput() {
        // Determine if the character has movement input by getting its movement input amount.
        // The Movement Input Amount is equal to the current acceleration divided by the max acceleration so that
        // it has a range of 0-1, 1 being the maximum possible amount of input, and 0 being none.
        // If the character has movement input, update the Last Movement Input Rotation.
        const movementInputAmount = Vec3.len(this.acceleration) / this.maxAcceleration;
        return movementInputAmount > 0.0;
    }

    public get isMoving() {
        const { x, z } = this.velocity;
        return Math.sqrt(x * x + z * z) > 0.01;
    }

    public readonly velocity = new Vec3();

    public get speed() {
        return Vec3.len(this.velocity);
    }

    public readonly acceleration = new Vec3();

    public maxAcceleration = 0.0;

    public maxBrakingDeceleration = 0.0;

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


