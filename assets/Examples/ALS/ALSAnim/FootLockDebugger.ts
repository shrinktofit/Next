import { _decorator, animation, game, input, Input, KeyCode, director, Vec3 } from 'cc';
import { ALSCharacterInfo } from '../ALSCharacterInfo';
import { CharacterController } from '../CharacterController';
import { getGlobalDebugInfoDisplay, RangedFloatRecord } from '../DebugInfoDisplay/DebugInfoDisplay';
import { globalInputManager } from '../Input/Input';

export class FootLockDebugger {
    constructor() {
        input.on(Input.EventType.KEY_UP, (event) => {
            switch (event.keyCode) {
                case KeyCode.KEY_H:
                    this._startDebug(StopStrategy.LOCK_LEFT_FOOT);
                    break;
                case KeyCode.KEY_J:
                    this._startDebug(StopStrategy.LOCK_RIGHT_FOOT);
                    break;
                case KeyCode.KEY_K:
                    this._startDebug(StopStrategy.PLANT_LEFT_FOOT);
                    break;
                case KeyCode.KEY_L:
                    this._startDebug(StopStrategy.PLANT_RIGHT_FOOT);
                    break;
            }
        });

        const display = getGlobalDebugInfoDisplay();
        if (display) {
            this._feetPositionRecord = display.addRangedFloat('FeetPosition', 0.0, -1.1, 1.1);
            this._records = {
                footLockL: display.addRangedFloat('FootLock_L', 0.0, 0.0, 3.0),
                footLockR: display.addRangedFloat('FootLock_R', 0.0, 0.0, 3.0),
                footLockAlphaL: display.addRangedFloat('FootLock_L_Alpha', 0.0, 0.0, 1.0),
                footLockAlphaR: display.addRangedFloat('FootLock_R_Alpha', 0.0, 0.0, 1.0),
            };
        }
    }

    public update(deltaTime: number, animationController: animation.AnimationController, characterInfo: ALSCharacterInfo) {
        if (this._feetPositionRecord) {
            this._feetPositionRecord.value = animationController.getAuxiliaryCurveValue_experimental('Feet_Position');
        }
        if (this._records) {
            this._records.footLockL.value = animationController.getAuxiliaryCurveValue_experimental('Foot Lock L') as number;
            this._records.footLockR.value = animationController.getAuxiliaryCurveValue_experimental('Foot Lock R') as number;
            this._records.footLockAlphaL.value = animationController.getValue('FootLock_L_Alpha') as number;
            this._records.footLockAlphaR.value = animationController.getValue('FootLock_R_Alpha') as number;
        }
        for (; ;) {
            switch (this._state) {
                case DebugState.NOT_STARTED:
                    break;
                case DebugState.AWAITING_MOVEMENT: {
                    const consumed = Math.min(this._timer, deltaTime);
                    this._timer -= consumed;
                    deltaTime -= consumed;
                    if (this._timer <= 0.0) {
                        this._state = DebugState.PREPARE_STOP;
                        continue;
                    }
                    const characterController = director.getScene()?.getComponentInChildren(CharacterController);
                    if (characterController) {
                        const v = Vec3.transformQuat(new Vec3(), Vec3.UNIT_Z, animationController.node.worldRotation);
                        characterController.addInputVector(Vec3.multiplyScalar(new Vec3(), v, 1.0));
                    }
                    break;
                }
                case DebugState.PREPARE_STOP: {
                    this._requestStop(animationController);
                    // const feetPosition = animationController.getAuxiliaryCurveValue_experimental('Feet_Position');
                    // if (feetPosition >= this._desiredFeetPositionMin && feetPosition <= this._desiredFeetPositionMax) {
                    //     this._requestStop(animationController);
                    // }
                    break;
                }
                case DebugState.SHOULD_PAUSE: {
                    // game.pause();
                    this._state = DebugState.NOT_STARTED;
                    break;
                }
                case DebugState.STOP_REQUESTED:
                    break;
            }

            break;
        }
    }

    private _state = DebugState.NOT_STARTED;
    private _desiredFeetPositionMin = 0.0;
    private _desiredFeetPositionMax = 0.0;
    private _timer = 0.0;

    private _startDebug(strategy: StopStrategy) {
        if (this._state !== DebugState.NOT_STARTED) {
            return;
        }
        let timer = 0.0;
        switch (strategy) {
            case StopStrategy.LOCK_LEFT_FOOT:
                timer = 1;
                break;
            case StopStrategy.LOCK_RIGHT_FOOT:
                timer = 0.5;
                break;
            case StopStrategy.PLANT_RIGHT_FOOT:
                timer = 1.2;
                break;
            case StopStrategy.PLANT_LEFT_FOOT:
                timer = 1.2 + 0.83 / 2;
                break;
        }
        this._desiredFeetPositionMin = 0.0;
        this._desiredFeetPositionMax = 0.0;
        this._state = DebugState.AWAITING_MOVEMENT;
        this._timer = timer;
    }

    private _requestStop(animationController: animation.AnimationController) {
        // globalInputManager.sendKeyUp(KeyCode.KEY_W);
        this._state = DebugState.NOT_STARTED;
    }

    private _feetPositionRecord: RangedFloatRecord | undefined;
    private _records: {
        footLockL: RangedFloatRecord;
        footLockR: RangedFloatRecord;
        footLockAlphaL: RangedFloatRecord;
        footLockAlphaR: RangedFloatRecord;
    } | undefined;
}

enum DebugState {
    NOT_STARTED,

    AWAITING_MOVEMENT,

    PREPARE_STOP,

    STOP_REQUESTED,

    SHOULD_PAUSE,
}

enum StopStrategy {
    LOCK_LEFT_FOOT,
    LOCK_RIGHT_FOOT,
    PLANT_LEFT_FOOT,
    PLANT_RIGHT_FOOT,
}
