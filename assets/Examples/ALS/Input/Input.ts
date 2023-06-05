import { Director, director, input as engineInput, Input as EngineInput, KeyCode } from "cc";
import { predefinedActions, predefinedAxes } from "./Predefined";

export type AxisId = number;

export type ActionId = number;

class InputManager {
    constructor() {
        for (const [id, { mappings }] of Object.entries(predefinedAxes)) {
            this._addAxis(id as unknown as number, ...mappings);
        }

        for (const [id, { mappings }] of Object.entries(predefinedActions)) {
            this._addAction(id as unknown as number, ...mappings);
        }
        
        this._initialize();

        director.on(Director.EVENT_BEFORE_UPDATE, () => {
            this.update(0.0);
        });
    }

    public getAxisValue(axisId: AxisId) {
        return this._axes[axisId]?.axis.value ?? 0.0;
    }

    public getActionEvent(actionId: ActionId): ActionEvent {
        const action = this._actions[actionId];
        if (!action) {
            return ActionEvent.None;
        }
        switch (action.state) {
            default:
            case ActionState.Inactive:
            case ActionState.AboutToBePressed:
            case ActionState.AboutToBeReleased:
            case ActionState.Alive:
                return ActionEvent.None;
            case ActionState.Pressed:
                return ActionEvent.Pressed;
            case ActionState.Released:
                return ActionEvent.Released;
        }
    }

    public update(deltaTime: number) {
        for (const [_, action] of Object.entries(this._actions)) {
            switch (action.state) {
                default:
                case ActionState.Inactive:
                case ActionState.Alive:
                    break;
                case ActionState.AboutToBePressed:
                    action.state = ActionState.Pressed;
                    break;
                case ActionState.AboutToBeReleased:
                    action.state = ActionState.Released;
                    break;
                case ActionState.Pressed:
                    action.state = ActionState.Alive;
                    break;
                case ActionState.Released:
                    action.state = ActionState.Inactive;
                    break;
            }
        }

        for (const [_, { axis, mappings }] of Object.entries(this._axes)) {
            let axisValue = 0.0;
            for (const mapping of mappings) {
                const pressed = this._pressedKeys.has(mapping.keyCode);
                if (pressed) {
                    axisValue += 1.0 * mapping.scale;
                }
            }
            axis.value = axisValue;
        }
    }

    private _addAxis(axisId: AxisId, ...mappings: { keyCode: KeyCode, scale: number }[]) {
        const axisRecord = this._axes[axisId] = new AxisRecord();
        for (const { keyCode, scale } of mappings) {
            axisRecord.mappings.push(new AxisMapping(keyCode, scale));
        }
    }

    private _addAction(actionId: ActionId, ...mappings: { keyCode: KeyCode }[]) {
        const actionRecord = this._actions[actionId] = new ActionRecord();
        for (const { keyCode } of mappings) {
            actionRecord.mappings.push(new ActionMapping(keyCode));
        }
    }

    private _initialize() {
        engineInput.on(EngineInput.EventType.KEY_DOWN, (event) => {
            this._onKeyDown(event.keyCode);
        });
        engineInput.on(EngineInput.EventType.KEY_UP, (event) => {
            this._onKeyUp(event.keyCode);
        });
    }

    public sendKeyDown(keyCode: KeyCode) {
        this._onKeyDown(keyCode);
    }

    public sendKeyUp(keyCode: KeyCode) {
        this._onKeyUp(keyCode);
    }

    private _axes: Record<AxisId, AxisRecord> = {};
    private _actions: Record<ActionId, ActionRecord> = {};
    private _pressedKeys = new Set();

    private _onKeyDown(keyCode: KeyCode) {
        this._pressedKeys.add(keyCode);
        for (const [_, action] of Object.entries(this._actions)) {
            if (action.mappings.some((mapping) => mapping.keyCode === keyCode)) {
                action.state = ActionState.AboutToBePressed;
            }
        }
    }

    private _onKeyUp(keyCode: KeyCode) {
        this._pressedKeys.delete(keyCode);
        for (const [_, action] of Object.entries(this._actions)) {
            if (action.mappings.some((mapping) => mapping.keyCode === keyCode)) {
                action.state = ActionState.AboutToBeReleased;
            }
        }
    }
}

class Axis {
    public value = 0.0;
}

class AxisMapping {
    constructor(keyCode: KeyCode, scale: number) {
        this.keyCode = keyCode;
        this.scale = scale;
    }

    public keyCode: KeyCode;

    public scale: number;
}

class AxisRecord {
    public readonly axis = new Axis();

    public readonly mappings: AxisMapping[] = [];
}

class Action {
}

class ActionMapping {
    constructor(public keyCode: KeyCode) {

    }
}

class ActionRecord {
    public readonly action = new Action();

    public readonly mappings: ActionMapping[] = [];
    
    public state = ActionState.Inactive;
}

enum ActionState {
    Inactive,
    AboutToBePressed,
    Pressed,
    Alive,
    AboutToBeReleased,
    Released,
}

export enum ActionEvent {
    None = 0,
    Pressed = 1,
    Released = 2,
}

export const globalInputManager = new InputManager();
