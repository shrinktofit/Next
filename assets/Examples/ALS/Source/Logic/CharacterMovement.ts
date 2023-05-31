import { _decorator, Component, Node, Vec2, Vec3, Quat, NodeSpace, clamp, find } from 'cc';
import { clampToMaxLength } from '../../Utility/ClampToMaxLength';
import { UNIT_SCALE_ALS_TO_CC } from '../../Utility/UnitConversion';
import { CharacterControllerFallingSimulation } from '../../CharacterControllerFallingSimulation';
import { Event } from '../Utils/Event';
const { ccclass, property } = _decorator;

export enum MovementMode {
    None,
    Walking,
    Falling,
}

export enum CharacterMovementEventType {
    MovementModeChanged,
}

@ccclass('CharacterMovement')
export class CharacterMovement extends Component {
    @property
    public moveAccordingToCharacterDirection = false;

    @property
    public inPlace = false;

    public maxAcceleration = 2000.0 * UNIT_SCALE_ALS_TO_CC;

    public maxBrakingDeceleration = 1250.0 * UNIT_SCALE_ALS_TO_CC;

    public maxMoveSpeed = 375 * UNIT_SCALE_ALS_TO_CC;

    public minAnalogWalkSpeed = 25 * UNIT_SCALE_ALS_TO_CC;

    /**
     * Unit: [0-1]/s.
     */
    public groundFriction = 4.0;

    public brakingFrictionFactor = 0.0;

    /**
     * Historical value, 1 would be more appropriate.
     */
    public brakingFriction = 0.0;

    @property
    public fallingSimulation = new CharacterControllerFallingSimulation();

    public readonly onMovementModeChanged = new Event<(oldMovementMode: MovementMode) => void>();

    public readonly onJumped = new Event();

    get velocity() {
        return new Vec3(this._velocity.x, this.fallingSimulation.velocity, this._velocity.z);
    }

    get potentialVelocity() {
        return new Vec3(this._velocity.x, this.fallingSimulation.potentialVelocity, this._velocity.z);
    }

    get acceleration() {
        return new Vec3(this._acceleration.x, this.fallingSimulation.acceleration, this._acceleration.z);
    }

    get movementMode() {
        return this._movementMode;
    }

    set movementMode(value) {
        const old = this._movementMode;
        if (old === value) {
            return;
        }
        this._movementMode = value;
        this.onMovementModeChanged.emit(old);
    }

    start() {
        this.fallingSimulation.node = this.node;
        this.fallingSimulation.start();
    }

    update(deltaTime: number) {
        this._hasRequestedVelocity = false;
        this._requestedMoveUseAcceleration = true;
        this._requestedMoveWithMaxSpeed = false;
        Vec3.zero(this._acceleration);

        if (this._movementMode === MovementMode.Walking) {
            this._controlledCharacterMove(
                this._inputVector,
                deltaTime,
            );
        }

        this.fallingSimulation.update(deltaTime);

        this._updateMode();

        Vec3.zero(this._inputVector);
    }

    public feedbackIsOnGrounded(v: boolean) {
        this.fallingSimulation.feedbackIsOnGrounded(v);
        this._updateMode();
    }

    public addInputVector(input: Readonly<Vec3>) {
        Vec3.add(this._inputVector, this._inputVector, input);
    }

    public jump() {
        this.fallingSimulation.jump();
        if (this.fallingSimulation.falling && this._movementMode !== MovementMode.Falling) {
            this.movementMode = MovementMode.Falling;
            this.onJumped.emit();
        }
    }

    private _inputVector = new Vec3();

    private _acceleration = new Vec3();

    private _velocity = new Vec3();

    private _analogInputModifier = 0.0;

    private _hasRequestedVelocity = false;
    private _requestedVelocity = new Vec3();
    private _requestedMoveWithMaxSpeed = false;
    private _requestedMoveUseAcceleration = true;
    private _movementMode = MovementMode.Walking;

    private _updateMode() {
        switch (this.movementMode) {
            case MovementMode.None:
                break;
            case MovementMode.Walking:
                if (this.fallingSimulation.falling) {
                    this.movementMode = MovementMode.Falling;
                }
                break;
            case MovementMode.Falling:
                if (!this.fallingSimulation.falling) {
                    this.movementMode = MovementMode.Walking;
                }
                break;
        }
    }

    private _controlledCharacterMove(inputVector: Readonly<Vec3>, deltaTime: number) {
        const constrainedInputVector = this._constrainInputAcceleration(new Vec3(), inputVector);
        this._scaleInputAcceleration(this._acceleration, constrainedInputVector);
        this._analogInputModifier = this._computeAnalogInputModifier();
        this._calcVelocity(
            deltaTime,
            this.groundFriction,
            this.maxBrakingDeceleration,
        );
    }

    private _calcVelocity(deltaTime: number, friction: number, brakingDeceleration: number) {
        const {
            _acceleration: acceleration,
            _velocity: velocity,
            brakingFriction,
        } = this;

        const isExceedingMaxSpeed = (maxSpeed: number) => {
            return Vec3.lengthSqr(this._velocity) > ((Math.max(0.0, maxSpeed)) ** 2) * 1.01;
        }

        // !!-----------------
        const useSeparateBrakingFriction = false;
        const analogInputModifier = this._analogInputModifier;
        const minAnalogSpeed = this.minAnalogWalkSpeed;
        // ------------------

        let zeroRequestedAcceleration = true;
        let maxSpeed = this.maxMoveSpeed;
        let requestedSpeed = 0.0;
        let requestedAcceleration = new Vec3();
        const req = this._applyRequestedMove(
            deltaTime,
            this.maxAcceleration,
            maxSpeed,
            friction,
            brakingDeceleration,
        );
        if (req) {
            zeroRequestedAcceleration = false;
            requestedSpeed = req.requestedSpeed;
            Vec3.copy(requestedAcceleration, req.acceleration);
        }

        const maxInputSpeed = Math.max(maxSpeed * analogInputModifier, minAnalogSpeed);
        maxSpeed = Math.max(requestedSpeed, maxInputSpeed);

        const zeroAcceleration = Vec3.strictEquals(acceleration, Vec3.ZERO);
        const velocityOverMax = isExceedingMaxSpeed(maxSpeed);

        if ((zeroAcceleration && zeroRequestedAcceleration) || velocityOverMax) {
            const oldVelocity = Vec3.clone(velocity);
            
            const actualBrakingFriction = (useSeparateBrakingFriction ? brakingFriction : friction);
            this._applyVelocityBraking(deltaTime, actualBrakingFriction, brakingDeceleration);

            if (velocityOverMax
                && Vec3.lengthSqr(velocity) < (maxSpeed ** 2)
                && Vec3.dot(acceleration, oldVelocity) > 0.0
            ) {
                Vec3.normalize(oldVelocity, oldVelocity);
                Vec3.multiplyScalar(velocity, oldVelocity, maxSpeed);
            }
        } else if (!zeroAcceleration) {
            const accelerationDir = Vec3.normalize(new Vec3(), acceleration);
            const velSize = Vec3.len(velocity);
            const diff = Vec3.scaleAndAdd(new Vec3(), velocity, accelerationDir, -velSize);
            Vec3.scaleAndAdd(velocity, velocity, diff, -Math.min(deltaTime * friction, 1.0));
        }

        if (!zeroAcceleration) {
            const newMaxInputSpeed = isExceedingMaxSpeed(maxInputSpeed) ? Vec3.len(this._velocity) : maxInputSpeed;
            Vec3.scaleAndAdd(velocity, velocity, acceleration, deltaTime);
            clampToMaxLength(velocity, this._velocity, newMaxInputSpeed);
        }

        if (!zeroRequestedAcceleration) {
            const newMaxRequestedSpeed = isExceedingMaxSpeed(requestedSpeed) ? Vec3.len(this._velocity) : requestedSpeed;
            Vec3.scaleAndAdd(velocity, velocity, requestedAcceleration, deltaTime);
            clampToMaxLength(velocity, this._velocity, newMaxRequestedSpeed);
        }
    }

    private _applyVelocityBraking(deltaTime: number, friction: number, brakingDeceleration: number) {
        const {
            _velocity: velocity,
            brakingFrictionFactor,
        } = this;

        const brakingSubStepTime = 1.0 / 33.0;
        const MIN_TICK_TIME = 1e-6;
        const BRAKE_TO_STOP_VELOCITY = 10.0 * UNIT_SCALE_ALS_TO_CC;

        if (Vec3.strictEquals(velocity, Vec3.ZERO)) {
            return;
        }

        const frictionFactor = Math.max(0, brakingFrictionFactor);
        friction = Math.max(0, friction * frictionFactor);
        brakingDeceleration = Math.max(0, brakingDeceleration);
        const zeroFriction = (friction == 0);
        const zeroBraking = (brakingDeceleration == 0);

        if (zeroFriction && zeroBraking) {
            return;
        }

        const oldVel = Vec3.clone(velocity);

        // subdivide braking to get reasonably consistent results at lower frame rates
        // (important for packet loss situations w/ networking)
        let remainingTime = deltaTime;
        const maxTimeStep = clamp(brakingSubStepTime, 1.0 / 75.0, 1.0 / 20.0);

        // Decelerate to brake to a stop
        const revAccel = zeroBraking
            ? Vec3.clone(Vec3.ZERO)
            : Vec3.multiplyScalar(new Vec3(), Vec3.normalize(new Vec3(), velocity), -brakingDeceleration);
        while (remainingTime >= MIN_TICK_TIME) {
            // Zero friction uses constant deceleration, so no need for iteration.
            const dt = ((remainingTime > maxTimeStep && !zeroFriction) ? Math.min(maxTimeStep, remainingTime * 0.5) : remainingTime);
            remainingTime -= dt;

            // apply friction and braking
            const dir = Vec3.scaleAndAdd(new Vec3(), revAccel, velocity, -friction);
            Vec3.scaleAndAdd(velocity, velocity, dir, dt);
            
            // Don't reverse direction
            if (Vec3.dot(velocity, oldVel) <= 0) {
                Vec3.copy(velocity, Vec3.ZERO);
                return;
            }
        }

        // Clamp to zero if nearly zero, or if below min threshold and braking.
        const VSizeSq = Vec3.lengthSqr(velocity);
        if (VSizeSq <= 1e-5 || (!zeroBraking && VSizeSq <= (BRAKE_TO_STOP_VELOCITY ** 2))) {
            Vec3.copy(velocity, Vec3.ZERO);
        }
    }

    private _applyRequestedMove (deltaTime: number, maxAccel: number, maxSpeed: number, friction: number, _brakingDeceleration: number): undefined | {
        acceleration: Vec3;
        requestedSpeed: number;
    } {
        const {
            _hasRequestedVelocity: hasRequestedVelocity,
        } = this;
        if (!hasRequestedVelocity) {
            return undefined;
        }
        const {
            _requestedVelocity: requestedVelocity,
            _requestedMoveWithMaxSpeed: requestedMoveWithMaxSpeed,
        } = this;
        const requestedSpeedSquared = Vec3.lengthSqr(requestedVelocity);
        if (requestedSpeedSquared < 1e-6) {
            return undefined;
        }
        const { _velocity: velocity } = this;

        const shouldComputeAccelerationToReachRequestedVelocity = (requestedSpeed: number) => {
            return this._requestedMoveUseAcceleration && Vec3.lengthSqr(this._velocity) < ((requestedSpeed * 1.01) ** 2);
        };

        // Compute requested speed from path following
        let requestedSpeed = Math.sqrt(requestedSpeedSquared);
        const requestedMoveDir = Vec3.multiplyScalar(new Vec3(), requestedVelocity, 1.0 / requestedSpeed);
        requestedSpeed = (requestedMoveWithMaxSpeed ? maxSpeed : Math.min(maxSpeed, requestedSpeed));
        
        // Compute actual requested velocity
        const moveVelocity = Vec3.multiplyScalar(new Vec3(), requestedMoveDir, requestedSpeed);
        
        // Compute acceleration. Use MaxAccel to limit speed increase, 1% buffer.
        const newAcceleration = new Vec3();
        const currentSpeedSq = Vec3.lengthSqr(velocity);
        if (shouldComputeAccelerationToReachRequestedVelocity(requestedSpeed)) {
            // Turn in the same manner as with input acceleration.
            const velSize = Math.sqrt(currentSpeedSq);
            {
                const diff = Vec3.scaleAndAdd(new Vec3(), velocity, requestedMoveDir, -velSize);
                Vec3.scaleAndAdd(velocity, velocity, diff, -Math.min(deltaTime * friction, 1));
            }

            // How much do we need to accelerate to get to the new velocity?
            Vec3.subtract(newAcceleration, moveVelocity, velocity);
            Vec3.multiplyScalar(newAcceleration, newAcceleration, 1.0 / deltaTime);
            clampToMaxLength(newAcceleration, newAcceleration, maxAccel);
        } else {
            // Just set velocity directly.
            // If decelerating we do so instantly, so we don't slide through the destination if we can't brake fast enough.
            Vec3.copy(velocity, moveVelocity);
        }

        // Copy to out params
        return {
            requestedSpeed,
            acceleration: newAcceleration,
        };
    }

    private _constrainInputAcceleration(out: Vec3, inputAcceleration: Readonly<Vec3>) {
        return Vec3.set(out, inputAcceleration.x, 0.0, inputAcceleration.z);
    }

    private _scaleInputAcceleration(out: Vec3, inputAcceleration: Readonly<Vec3>) {
        const result = new Vec3();
        clampToMaxLength(result, inputAcceleration, 1.0);
        Vec3.multiplyScalar(result, result, this.maxAcceleration);
        Vec3.copy(out, result);
    }

    private _computeAnalogInputModifier() {
        const maxAccel = this.maxAcceleration;
        const { _acceleration: acceleration } = this;
        if (acceleration.lengthSqr() > 0.0 && maxAccel > 1e-8) {
            return clamp(acceleration.length() / maxAccel, 0.0, 1.0);
        }
        return 0.0;
    }
}
