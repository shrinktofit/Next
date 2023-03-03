import { _decorator, Component, Node, toDegree, find, Vec3, v3, Quat, NodeSpace, input, Input, KeyCode, toRadian, tween, approx } from 'cc';
import { getForward } from '../../../Scripts/Utils/NodeUtils';
import { clampMap } from '../Utility/ClampMap';
const { ccclass, property } = _decorator;

@ccclass('Aim_test')
export class Aim_test extends Component {
    @property(Node)
    lookAt: Node | null = null;

    start() {
        this.horizontalDir = this.#horizontalDir;

        input.on(Input.EventType.KEY_UP, (event) => {
            switch(event.keyCode) {
                case KeyCode.KEY_N:
                    Reflect.apply(bug_2023_01_28.reset, this, []);
                    break;
                case KeyCode.KEY_M:
                    Reflect.apply(bug_2023_01_28.start, this, []);
                    break;

                
            }
        });
    }

    #horizontalDir = 0.0;
    get horizontalDir() {
        return this.#horizontalDir;
    }
    set horizontalDir(value) {
        this.#horizontalDir = value;
        const dirRad = toRadian(value);
        this.#setDir(dirRad);
    }

    update(deltaTime: number) {
        
    }

    #setDir(dir: number) {
        if (!this.lookAt) {
            return;
        }

        const viewNode = this.node;
        const lookAtPosition = this.lookAt.worldPosition;

        const viewDir = Vec3.subtract(new Vec3(), viewNode.worldPosition, lookAtPosition);
        const viewDirHorizontal = Vec3.clone(viewDir);
        viewDirHorizontal.y = 0;
        viewDirHorizontal.normalize();

        const q = Quat.fromAxisAngle(new Quat(), Vec3.UP, dir);
        const expectedViewDirHorizontal = Vec3.transformQuat(new Quat(), Vec3.UNIT_Z, q);
        const angle = Vec3.angle(viewDirHorizontal, expectedViewDirHorizontal);
        const axis = Vec3.cross(new Vec3(), viewDirHorizontal, expectedViewDirHorizontal);
        axis.normalize();
        const rot = Quat.fromAxisAngle(new Quat(), axis, angle);

        Vec3.transformQuat(viewDir, viewDir, rot);
        Vec3.add(viewDir, lookAtPosition, viewDir);
        viewNode.setWorldPosition(viewDir);
        viewNode.lookAt(lookAtPosition, Vec3.UP);
    }
}

declare global {
    var stats: Record<string, Record<string, number>> | undefined;
}

/**
 * 从 Forward 切换到 RightBack 的途中再引发 LeftBack 时，会有异常表现。
 */
namespace bug_2023_01_28 {
    export function reset(this: Aim_test) {
        this.horizontalDir = 100.0;
    }

    export function start(this: Aim_test) {
        const stats = globalThis.stats = {} as NonNullable<typeof globalThis['stats']>;
        tween<Aim_test>(this)
            .to(0.3, { horizontalDir: -20.0 }, { easing: 'linear' })
            .delay(2)
            .call(() => {
                let lastYaw = NaN;
                let lastResult = 0.0;
                const results = Object.entries(stats).map(([frame, {
                    yaw,
                    Forward: f = 0.0,
                    Left: l = 0.0,
                    Right: r = 0.0,
                    Pose: p = 0.0,
                    ForwardYawTime,
                    LeftYawTime,
                    RightYawTime,
                    headAngle,
                }]) => {
                    const yawX = yaw ?? lastYaw;
                    if (Number.isNaN(yawX)) {
                        return [
                            frame,
                        ];
                    }
                    if (typeof yaw !== 'undefined') {
                        lastYaw = yaw;
                    }
    
                    const fullWeight = f + l + r + p;
                    if (!approx(fullWeight, 1.0, 1e-5)) {
                        debugger;
                    }
    
                    let result = 0.0;
                    for (const [time, weight] of ([
                        [ForwardYawTime, f],
                        [LeftYawTime, l],
                        [RightYawTime, r],
                        [0.5, p],
                    ] as const)) {
                        const stateAngle = clampMap(time, 0.0, 1.0, -180, 180);
                        result += (stateAngle * weight);
                    }
    
                    const deltaResult = result - lastResult;
                    lastResult = result;
    
                    return {
                        frame,
                        yaw: yawX,
                        result,
                        deltaResult,
                        stats: { f, l, r, p, ForwardYawTime, LeftYawTime, RightYawTime  },
                    };
                });
    
                console.log(results);
    
                delete globalThis.stats;
            })
            .start()
            ;
    }

    /**
     * // 这段代码放到引擎 _computeAbsoluteWeights 之后
     *  const toPercent = (v: number) => `${(v * 100).toFixed(2)}%`;
        if (globalThis.stats) {
            const ss = {};
            ss[this._currentNode.name] = this._currentStateWeight;
            for (const transition of this._currentTransitionPath) {
                ss[transition.to.name] = transition.destinationWeight;
            }
            Object.assign(
                (globalThis.stats[legacyCC.director.getTotalFrames()] ??= {}),
                ss,
            );
        }

        if (this._currentTransitionPath.length > 0) {
            console.log(legacyCC.director.getTotalFrames(), {
                name: this._currentNode.name,
                weight: toPercent(this._currentStateWeight),
            }, this._currentTransitionPath.map((transition) => ({
                to: transition.to.name,
                time: transition.normalizedElapsedTime,
                weight: toPercent(transition.destinationWeight),
            })));
        }
     */
}


