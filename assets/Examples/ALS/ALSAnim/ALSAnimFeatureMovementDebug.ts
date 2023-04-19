import { _decorator, Component, Node, animation, warn, approx } from 'cc';
import { ALSCharacterInfo } from '../ALSCharacterInfo';
import { createRealtimeNumberChart, RealTimeNumberChart } from '../Debug/Charts/ChartService';
import { BooleanRecord, getGlobalDebugInfoDisplay, RangedFloatRecord } from '../DebugInfoDisplay/DebugInfoDisplay';
import { MoveDirection } from '../Internal/MoveDirection';
import { ALSAnimFeatureMovement, GraphVarName } from './ALSAnimFeatureMovement';
import { Vec3 } from 'cc';

const { ccclass, property } = _decorator;

export class ALSAnimFeatureMovementDebug {
    constructor(
        private host: ALSAnimFeatureMovement,
        private animationController: animation.AnimationController,
        private characterInfo: ALSCharacterInfo,
    ) {
        if (false) {
            if (this._debugFB) {
                this._chart = createRealtimeNumberChart?.({
                    valueDescriptions: [
                        { displayName: 'N/A' },
                        { displayName: 'VelocityBlend.F' },
                        { displayName: 'VelocityBlend.B' },
                    ],
                    chart: {
                        type: 'pie',
                    },
                });
            } else {
                this._chart = createRealtimeNumberChart?.({
                    valueDescriptions: [
                        { displayName: 'VelocityBlend.F' },
                        { displayName: 'VelocityBlend.B' },
                        { displayName: 'VelocityBlend.L' },
                        { displayName: 'VelocityBlend.R' },
                    ],
                    chart: {
                        type: 'line',
                    },
                });
            }
        }

        const display = getGlobalDebugInfoDisplay();
        if (display) {
            this._debugDisplayRecords = {
                shouldMove: display.addBoolean('ShouldMove', false),
                walkRunBlend: display.addRangedFloat(`WalkRunBlend`, 0.0, 0.0, 1.0),
                strideBlend: display.addRangedFloat(`StrideBlend`, 0.0, 0.0, 1.0),
                velocityBlend: {
                    f: display.addRangedFloat(`Velocity.F`, 0.0, 0.0, 1.0),
                    b: display.addRangedFloat(`Velocity.B`, 0.0, 0.0, 1.0),
                    l: display.addRangedFloat(`Velocity.L`, 0.0, 0.0, 1.0),
                    r: display.addRangedFloat(`Velocity.R`, 0.0, 0.0, 1.0),
                },
            };
        }
        
        this.animationController.graphEventReceiver.on('debug-->NotMoving', () => {
            warn(`Not moving`);
        });
    }

    private _lastSpeed = 0.0;
    private _lastAcceleration = new Vec3();

    public update(deltaTime: number) {
        if (!approx(this._lastSpeed, this.characterInfo.speed, 1e-5)) {
            warn(`Speed: ${this.characterInfo.speed}`);
        }
        this._lastSpeed = this.characterInfo.speed;

        if (!Vec3.equals(this._lastAcceleration, this.characterInfo.acceleration, 1e-5)) {
            warn(`Acceleration: ${this.characterInfo.acceleration}`);
        }
        Vec3.copy(this._lastAcceleration, this.characterInfo.acceleration);

        const currentShouldMove = this.animationController.getValue(GraphVarName.ShouldMove) as boolean;
        if (currentShouldMove !== this._lastShouldMove && !currentShouldMove) {
            debugger;
        }
        this._lastShouldMove = currentShouldMove;

        const currentMoveDirection = this.animationController.getValue(GraphVarName.MovementDirection) as MoveDirection;
        if (currentMoveDirection !== this._lastMoveDirection) {
            this._lastMoveDirection = currentMoveDirection;
            console.error(`Move Direction: ${MoveDirection[currentMoveDirection]}`);
        }

        if (this._debugDisplayRecords) {
            this._debugDisplayRecords.shouldMove.value = this.animationController.getValue(GraphVarName.ShouldMove) as boolean;
            this._debugDisplayRecords.walkRunBlend.value = this.animationController.getValue(GraphVarName.WalkRunBlend) as number;
            this._debugDisplayRecords.strideBlend.value = this.animationController.getValue(GraphVarName.StrideBlend) as number;
            this._debugDisplayRecords.velocityBlend.f.value = this.animationController.getValue(GraphVarName.VelocityBlendF) as number;
            this._debugDisplayRecords.velocityBlend.b.value = this.animationController.getValue(GraphVarName.VelocityBlendB) as number;
            this._debugDisplayRecords.velocityBlend.l.value = this.animationController.getValue(GraphVarName.VelocityBlendL) as number;
            this._debugDisplayRecords.velocityBlend.r.value = this.animationController.getValue(GraphVarName.VelocityBlendR) as number;
        }

        if (!this.characterInfo.isMoving && this._lastIsMoving) {
            const { x, z } = this.characterInfo.velocity;
            const speed = Math.sqrt(x * x + z * z);
            console.error(`Not moving Speed: ${speed}`);
        }

        this._lastIsMoving = this.characterInfo.isMoving;
    }

    private _lastIsMoving = false;

    private _lastMoveDirection: MoveDirection = MoveDirection.Forward;

    private _lastShouldMove = false;

    private _chart: RealTimeNumberChart | undefined;

    private _debugFB = true;

    private _debugDisplayRecords: {
        velocityBlend: {
            f: RangedFloatRecord;
            b: RangedFloatRecord;
            l: RangedFloatRecord;
            r: RangedFloatRecord;
        };
        shouldMove: BooleanRecord;
        walkRunBlend: RangedFloatRecord;
        strideBlend: RangedFloatRecord;
    } | undefined;
}
