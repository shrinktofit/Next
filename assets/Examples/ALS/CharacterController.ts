import { _decorator, Component, Node, Vec2, Vec3, Quat, NodeSpace, clamp, find } from 'cc';
import { getForward } from '../../Scripts/Utils/NodeUtils';
import { ALSCharacterInfo } from './ALSCharacterInfo';
import { globalInputManager } from './Input/Input';
import { PredefinedAxisId } from './Input/Predefined';
const { ccclass, property } = _decorator;

@ccclass('CharacterController')
export class CharacterController extends Component {
    @property
    public debugView = false;

    public maxAcceleration = 2000.0 * 0.01;

    public maxMoveSpeed = 3.75;

    start() {
    }

    update(deltaTime: number) {
        this._hasRequestedVelocity = false;
        this._requestedMoveUseAcceleration = true;
        this._requestedMoveWithMaxSpeed = false;
        Vec3.zero(this._acceleration);

        this._applyInput(deltaTime);

        this._updateVelocity(
            deltaTime,
            5.0 * 0.01,
            1500.0 * 0.01,
        );
        
        const characterInfo = this.node.getComponent(ALSCharacterInfo);
        if (characterInfo) {
            Vec3.copy(characterInfo.velocity, this._velocity);
        }
    }

    private _acceleration = new Vec3();

    private _velocity = new Vec3();

    private _hasRequestedVelocity = false;
    private _requestedVelocity = new Vec3();
    private _requestedMoveWithMaxSpeed = false;
    private _requestedMoveUseAcceleration = true;
    
    private _applyInput(deltaTime: number) {
        const inputVelocity = new Vec2(
            globalInputManager.getAxisValue(PredefinedAxisId.MoveLeft),
            globalInputManager.getAxisValue(PredefinedAxisId.MoveForward),
        );
        this._hasRequestedVelocity = true;
        Vec3.set(
            this._requestedVelocity,
            inputVelocity.x,
            0.0,
            inputVelocity.y,
        );

        const _getViewDir = () => {
            const mainCamera = find('Main Camera');
            if (!mainCamera) {
                return new Vec3(0, 0, -1);
            }
            return Vec3.negate(new Vec3(), getForward(mainCamera));
        }

        const viewDir = _getViewDir();
        viewDir.y = 0.0;
        Vec3.normalize(viewDir, viewDir);

        const q = Quat.rotationTo(new Quat(), Vec3.UNIT_Z, viewDir);
        Vec3.transformQuat(this._requestedVelocity, this._requestedVelocity, q);
    }

    private _updateVelocity(deltaTime: number, friction: number, brakingDeceleration: number) {
        const {
            _acceleration: acceleration,
            _velocity: velocity,
        } = this;

        const isExceedingMaxSpeed = (maxSpeed: number) => {
            return Vec3.lengthSqr(this._velocity) > ((Math.max(0.0, maxSpeed)) ** 2) * 1.01;
        }

        // !!-----------------
        const useSeparateBrakingFriction = false;
        const brakingFriction = 1.0;  // Historical value, 1 would be more appropriate.
        const analogInputModifier = 0.0;
        const minAnalogSpeed = 0.0;
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
            this._applyVelocityBraking(deltaTime, actualBrakingFriction, brakingFriction);

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
            clampToMaxLength(this._velocity, this._velocity, newMaxInputSpeed);
        }

        if (!zeroRequestedAcceleration) {
            const newMaxRequestedSpeed = isExceedingMaxSpeed(requestedSpeed) ? Vec3.len(this._velocity) : requestedSpeed;
            Vec3.scaleAndAdd(velocity, velocity, requestedAcceleration, deltaTime);
            clampToMaxLength(this._velocity, this._velocity, newMaxRequestedSpeed);
        }
    }

    private _applyVelocityBraking(deltaTime: number, friction: number, brakingDeceleration: number) {
        const {
            _velocity: velocity,
        } = this;

        const brakingSubStepTime = 1.0 / 33.0;
        const MIN_TICK_TIME = 1e-6;
        const BRAKE_TO_STOP_VELOCITY = 10.0;

        if (Vec3.strictEquals(velocity, Vec3.ZERO)) {
            return;
        }

        const frictionFactor = Math.max(0, brakingDeceleration);
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

    private _applyRequestedMove (deltaTime: number, MaxAccel: number, maxSpeed: number, friction: number, brakingDeceleration: number): undefined | {
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
            clampToMaxLength(newAcceleration, newAcceleration, MaxAccel);
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
    };
}

function clampToMaxLength(out: Vec3, v: Vec3, maxLength: number) {
    if (maxLength < 1e-6) {
        return Vec3.copy(out, Vec3.ZERO);
    }
    const lenSqr = Vec3.lengthSqr(v);
    if (lenSqr > (maxLength ** 2)) {
        const scale = maxLength * (lenSqr ** (-1.0 / 2.0));
        return Vec3.multiplyScalar(out, v, scale);
    } else {
        return Vec3.copy(out, v);
    }
}