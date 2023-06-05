import { _decorator, Component, Node, Vec2, Vec3, Quat, NodeSpace, clamp, find, CharacterController as PhysicalCharacterController } from 'cc';
import { getForward } from '../../Scripts/Utils/NodeUtils';
import { ALSCharacterInfo } from './ALSCharacterInfo';
import { ActionEvent, globalInputManager } from './Input/Input';
import { PredefinedActionId, PredefinedAxisId } from './Input/Predefined';
import { CharacterMovement } from './Source/Logic/CharacterMovement';
import { error } from 'cc';
import { injectComponent } from './Source/Utils/InjectComponent';
import { signedAngleVec3 } from './Utility/SignedAngle';
import { toDegree } from 'cc';
import { toRadian } from 'cc';
import { ALSMovementState } from './ALSAnim/ALSMovementState';
import { ALSGait } from './ALSGait';
const { ccclass, property, requireComponent } = _decorator;

@ccclass('CharacterController')
@requireComponent([CharacterMovement])
export class CharacterController extends Component {
    @property
    public moveAccordingToCharacterDirection = false;

    @property
    public inPlace = false;

    @property({ unit: '°/s' })
    public turnSpeed = 180;

    start() {
    }

    update(deltaTime: number) {
        this._updateDesiredGait();

        const horizontalInput = new Vec2(
            globalInputManager.getAxisValue(PredefinedAxisId.MoveLeft),
            globalInputManager.getAxisValue(PredefinedAxisId.MoveForward),
        );
        if (!Vec2.equals(horizontalInput, Vec2.ZERO) && this._characterInfo.movementState === ALSMovementState.Grounded) {
            this._faceView(deltaTime);
            this._applyHorizontalInput(horizontalInput, deltaTime);
        }

        this._applyVerticalInput(deltaTime);

        if (!this.inPlace) {
            const movement = Vec3.multiplyScalar(new Vec3(), this._characterMovement.potentialVelocity, deltaTime);
                
            // this.node.translate(movement, NodeSpace.WORLD);
            this._physicalCharacterController.move(movement);

            this._characterMovement.feedbackIsOnGrounded(this._physicalCharacterController.onGround());
        }
    }

    @injectComponent(CharacterMovement)
    private _characterMovement!: CharacterMovement;

    @injectComponent(PhysicalCharacterController)
    private _physicalCharacterController!: PhysicalCharacterController;

    @injectComponent(ALSCharacterInfo)
    private _characterInfo!: ALSCharacterInfo;
    
    private _applyHorizontalInput(horizontalInput: Readonly<Vec2>, deltaTime: number) {
        const inputVector = new Vec3();
        Vec3.set(
            inputVector,
            horizontalInput.x,
            0.0,
            horizontalInput.y,
        );
        Vec2.normalize(inputVector, inputVector);
        const movementInputScale = 1.0;
        Vec3.multiplyScalar(inputVector, inputVector, movementInputScale);

        if (this.moveAccordingToCharacterDirection) {
            const viewDir = Vec3.clone(getForward(this.node));
            viewDir.y = 0.0;
            Vec3.normalize(viewDir, viewDir);

            const q = Quat.rotationTo(new Quat(), Vec3.UNIT_Z, viewDir);
            Vec3.transformQuat(inputVector, inputVector, q);
        } else {
            const viewDir = Vec3.clone(this._characterInfo.viewDirection);
            viewDir.y = 0.0;
            Vec3.normalize(viewDir, viewDir);
    
            const q = Quat.rotationTo(new Quat(), Vec3.UNIT_Z, viewDir);
            Vec3.transformQuat(inputVector, inputVector, q);
        }

        this._characterMovement.addInputVector(inputVector);
    }

    private _applyVerticalInput(deltaTime: number) {
        if (globalInputManager.getActionEvent(PredefinedActionId.Jump) === ActionEvent.Pressed) {
            this._characterInfo.handleJumpInput();
            if (this._characterInfo.movementState === ALSMovementState.Grounded) {
                this._characterMovement.jump();
            }
        }
    }

    private _faceView(deltaTime: number) {
        const viewDir = this._getViewDirection();
        viewDir.y = 0.0;
        viewDir.normalize();

        const characterDir = getForward(this.node);
        characterDir.y = 0.0;
        characterDir.normalize();

        const currentAimAngle = signedAngleVec3(characterDir, viewDir, Vec3.UNIT_Y);
        const currentAimAngleDegMag = toDegree(Math.abs(currentAimAngle));
        
        const maxRotDegMag = this.turnSpeed * deltaTime;
        const rotDegMag = Math.min(maxRotDegMag, currentAimAngleDegMag);
        const q = Quat.fromAxisAngle(new Quat(), Vec3.UNIT_Y, Math.sign(currentAimAngle) * toRadian(rotDegMag));
        this.node.rotate(q, NodeSpace.WORLD);
    }

    private _getViewDirection() {
        const mainCamera = find('Main Camera');
        if (!mainCamera) {
            return Vec3.set(new Vec3(), 0, 0, -1);
        } else {
            return Vec3.negate(new Vec3(), getForward(mainCamera));
        }
    }

    private _updateDesiredGait() {
        if (globalInputManager.getActionEvent(PredefinedActionId.WalkRunSwitch) === ActionEvent.Pressed) {
            switch (this._characterInfo.desiredGait) {
                case ALSGait.Running:
                    this._characterInfo.desiredGait = ALSGait.Walking;
                    break;
                case ALSGait.Walking:
                    this._characterInfo.desiredGait = ALSGait.Running;
                    break;
            }
        }

        switch (globalInputManager.getActionEvent(PredefinedActionId.Sprint)) {
            case ActionEvent.Pressed:
                this._characterInfo.desiredGait = ALSGait.Sprinting;
                break;
            case ActionEvent.Released:
                this._characterInfo.desiredGait = ALSGait.Running;
                break;
        }
    }
}
