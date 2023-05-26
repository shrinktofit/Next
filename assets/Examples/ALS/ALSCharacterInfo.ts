import { _decorator, Component, Node, Vec3, find, Quat } from 'cc';
import { getForward } from '../../Scripts/Utils/NodeUtils';
import { ALSGait } from './ALSGait';
import { UNIT_SCALE_ALS_TO_CC } from './Utility/UnitConversion';
import { ALSMovementState } from './ALSAnim/ALSMovementState';
import { CharacterMovement, MovementMode } from './Source/Logic/CharacterMovement';
import { injectComponent } from './Source/Utils/InjectComponent';
import { Event } from './Source/Utils/Event';
const { ccclass, property } = _decorator;

export enum MovementAction {
    None,
    LowMantle,
	HighMantle,
	Rolling,
	GettingUp,
}

@ccclass('ALSCharacterInfo')
export class ALSCharacterInfo extends Component {
    @property
    public walkSpeed = 165 * UNIT_SCALE_ALS_TO_CC;

    @property
    public runSpeed = 350 * UNIT_SCALE_ALS_TO_CC;

    @property
    public sprintSpeed = 600 * UNIT_SCALE_ALS_TO_CC;

    get characterMovement() {
        return this._characterMovement;
    }

    public get hasMovementInput() {
        // Determine if the character has movement input by getting its movement input amount.
        // The Movement Input Amount is equal to the current acceleration divided by the max acceleration so that
        // it has a range of 0-1, 1 being the maximum possible amount of input, and 0 being none.
        // If the character has movement input, update the Last Movement Input Rotation.
        const movementInputAmount = Vec3.len(this.replicatedAcceleration) / this.maxAcceleration;
        return movementInputAmount > 0.0;
    }

    public get isMoving() {
        const { x, z } = this.velocity;
        return Math.sqrt(x * x + z * z) > 0.01;
    }

    public readonly velocity = new Vec3();

    public get speed() {
        const { x, z } = this.velocity;
        return Math.sqrt(x * x + z * z);
    }

    public get acceleration() {
        return this._acceleration as Readonly<Vec3>;
    }

    public replicatedAcceleration = new Vec3();

    public maxAcceleration = 0.0;

    public maxBrakingDeceleration = 0.0;

    public get viewDirection(): Readonly<Vec3> {
        return this._viewDirection;
    }

    public get worldPosition() {
        return this.node.worldPosition;
    }

    public get worldRotation() {
        return this.node.worldRotation;
    }

    public get lastUpdateWorldPosition() {
        return this._lastUpdateWorldPosition as Readonly<Vec3>;
    }

    public get lastUpdateWorldRotation() {
        return this._lastUpdateWorldRotation as Readonly<Quat>;
    }

    public get movementState() {
        return this._movementState;
    }

    public movementAction = MovementAction.None;

    public isMovingOnGround() {
        return true;
    }

    get gait() {
        return this._gait;
    }

    get onJumped() {
        return this._characterMovement.onJumped;
    }

    readonly onJumpInput = new Event();

    public start() {
        this._characterMovement.onMovementModeChanged.subscribe(this._onMovementModeChanged, this);

        this._setLastUpdateTransform();
    }

    public update(deltaTime: number) {
        this._grabCharacterMovementInfo();
        
        this._updateAcceleration(deltaTime);

        // Set the Allowed Gait
        const allowedGait = this._getAllowedGait();

        // Determine the Actual Gait. If it is different from the current Gait, Set the new Gait Event.
        const actualGait = this._getActualGait(allowedGait);
        if (actualGait !== this._gait) {
            this._setGait(actualGait);
        }

        this._setAllowedGait(allowedGait);
        
        this._fetchViewDirection();
    }

    public lateUpdate() {
        this._setLastUpdateTransform();
    }

    public setMovementState(newState: ALSMovementState, force = false) {
        if (force || newState !== this._movementState) {
            this._preMovementState = this._movementState;
            this._movementState = newState;
            this._onMovementStateChanged();
        }
    }

    public handleJumpInput() {
        this.onJumpInput.emit();
    }

    @injectComponent(CharacterMovement)
    private _characterMovement!: CharacterMovement;

    private _preMovementState = ALSMovementState.Grounded;
    private _movementState: ALSMovementState = ALSMovementState.Grounded;
    private readonly _acceleration = new Vec3();
    private readonly _lastVelocity = new Vec3();
    private readonly _viewDirection = new Vec3();
    private readonly _lastUpdateWorldPosition = new Vec3();
    private readonly _lastUpdateWorldRotation = new Quat();
    private _gait = ALSGait.Walking;

    private _grabCharacterMovementInfo() {
        const { _characterMovement: characterMovement } = this;
        Vec3.copy(this.velocity, characterMovement.velocity);
        Vec3.copy(this.replicatedAcceleration, characterMovement.acceleration);
        this.maxAcceleration = characterMovement.maxAcceleration;
        this.maxBrakingDeceleration = characterMovement.maxBrakingDeceleration;
    }

    private _onMovementModeChanged(oldMode: MovementMode) {
        switch (this._characterMovement.movementMode) {
            default:
            case MovementMode.None:
                break;
            case MovementMode.Walking:
                this.setMovementState(ALSMovementState.Grounded);
                break;
            case MovementMode.Falling:
                this.setMovementState(ALSMovementState.InAir);
                break;
        }
    }

    private _onMovementStateChanged() {
        // TODO:
    }

    protected _setLastUpdateTransform() {
        Vec3.copy(this._lastUpdateWorldPosition, this.node.worldPosition);
        Quat.copy(this._lastUpdateWorldRotation, this.node.worldRotation);
    }

    private _fetchViewDirection() {
        const mainCamera = find('Main Camera');
        if (!mainCamera) {
            return Vec3.set(this._viewDirection, 0, 0, -1);
        } else {
            return Vec3.negate(this._viewDirection, getForward(mainCamera));
        }
    }

    private _updateAcceleration(deltaTime: number) {
        const newAcceleration = new Vec3();
        Vec3.subtract(newAcceleration, this.velocity, this._lastVelocity);
        Vec3.multiplyScalar(newAcceleration, newAcceleration, 1.0 / deltaTime);
        if (Vec3.equals(newAcceleration, Vec3.ZERO) || this._isLocallyControlled()) {
            Vec3.copy(this._acceleration, newAcceleration);
        } else {
            Vec3.multiplyScalar(this._acceleration, this._acceleration, 0.5);
        }
        Vec3.copy(this._lastVelocity, this.velocity);
    }

    private _getActualGait(allowedGait: ALSGait): ALSGait {
        const speed = this.speed;
        if (speed > this.runSpeed + 10 * UNIT_SCALE_ALS_TO_CC) {
            if (allowedGait === ALSGait.Sprinting) {
                return ALSGait.Sprinting;
            } else {
                return ALSGait.Running;
            }
        }
        if (speed >= this.walkSpeed + 10 * UNIT_SCALE_ALS_TO_CC) {
            return ALSGait.Running;
        }
        return ALSGait.Walking;
    }

    private _setGait(newGait: ALSGait, force = false) {
        if (force || this._gait !== newGait) {
            const prev = this._gait;
            this._gait = newGait;
            this._onGaitChange(prev);
        }
    }

    private _getAllowedGait() {
        return ALSGait.Running;
    }

    private _onGaitChange(previousGait: ALSGait) {
        // TODO
    }

    private _setAllowedGait(newAllowedGait: ALSGait) {
        // TODO
    }

    private _isLocallyControlled() {
        // TODO
        return true;
    }
}


