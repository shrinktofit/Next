import { _decorator, Component, Node, Vec3, toDegree, approx, director, animation } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('PrintHeadDir')
export class PrintHeadDir extends Component {
    @property(Node)
    head: Node | null = null;

    start() {

    }

    lateUpdate(deltaTime: number) {
        const child = this.head;
        const parent = this.head?.parent;
        if (!child || !parent) {
            return;
        }

        const dir = Vec3.subtract(new Vec3(), child.worldPosition, parent.worldPosition);
        dir.y = 0.0;
        dir.normalize();

        const angle = toDegree(signedAngleVec3(Vec3.UNIT_Z, dir, Vec3.UP));
        if (!approx(angle, this.#lastDir, 1e-3)) {
            this.#lastDir = angle;
            ((globalThis.stats ??= {})[director.getTotalFrames()] ??= {}).headAngle = angle;
        }
    }

    #lastDir = NaN;
}


function signedAngleVec3(a: Readonly<Vec3>, b: Readonly<Vec3>, normal: Readonly<Vec3>) {
    const angle = Vec3.angle(a, b);
    const cross = Vec3.cross(new Vec3(), a, b);
    cross.normalize();
    return Vec3.dot(cross, normal) < 0 ? -angle : angle;
}

