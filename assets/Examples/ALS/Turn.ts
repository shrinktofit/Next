import { _decorator, Component, Vec3, toDegree, Quat, toRadian, NodeSpace } from 'cc';
import { getForward } from '../../Scripts/Utils/NodeUtils';
import { ALSCharacterInfo } from './ALSCharacterInfo';
const { ccclass, property } = _decorator;

@ccclass('Turn')
export class Turn extends Component {
    @property({ unit: '°/s' })
    public turnSpeed = 180;

    start() {

    }

    update(deltaTime: number) {
        const characterInfo = this.getComponent(ALSCharacterInfo);
        if (!characterInfo) {
            return;
        }

        if (Vec3.equals(characterInfo.velocity, Vec3.ZERO)) {
            return;
        }

        const viewDir = Vec3.clone(characterInfo.viewDirection);
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
}

function signedAngleVec3(a: Readonly<Vec3>, b: Readonly<Vec3>, normal: Readonly<Vec3>) {
    const angle = Vec3.angle(a, b);
    const cross = Vec3.cross(new Vec3(), a, b);
    cross.normalize();
    return Vec3.dot(cross, normal) < 0 ? -angle : angle;
}
