import assert from "assert";
import { listAnimationGraphToUpgrade, visitObj } from "./UpgradeUtils.mjs";

const InputTransformSpace = Object.freeze({
    WORLD: 0,
    COMPONENT: 1,
    PARENT: 2,
    NODE_LOCAL: 3,
});

const TransformSpaceRequirement = Object.freeze({
    NONE: 0,
    LOCAL: 1,
    Component: 2,
});

for await (const { json } of await listAnimationGraphToUpgrade()) {
    for (const obj of visitObj(json)) {
        if (obj.__type__ === 'cc.animation.TwoBoneIKSolver') {
            const {
                endEffectorTargetBoneName,
                endEffectorTargetPosition,
                middleBoneTargetBoneName,
            } = obj;

            delete obj.endEffectorTargetBoneName;
            delete obj.endEffectorTargetPosition;
            delete obj.middleBoneTargetBoneName;
            
            obj.endEffectorTarget = {
                __type__: 'cc.animation.TwoBoneIKSolver.TargetSpecification',
                ...(endEffectorTargetBoneName ? {
                    type: 2,
                    targetBone: endEffectorTargetBoneName,
                } : {
                    type: 1,
                    targetPosition: endEffectorTargetPosition,
                    targetPositionSpace: 1, /* Component */
                }),
            };

            obj.poleTarget = {
                __type__: 'cc.animation.TwoBoneIKSolver.TargetSpecification',
                ...(middleBoneTargetBoneName ? {
                    type: 2,
                    targetBone: middleBoneTargetBoneName,
                }: {
                    type: 0,
                }),
            };
        } else if (obj.__type__ === 'cc.animation.ApplyTransform') {
            const {
                transformName,
                transformSpaceRequirement,
            } = obj;
            delete obj.transformName;
            delete obj.transformSpaceRequirement;

            obj.node = transformName;
            obj.transformSpace = transformSpaceRequirement === TransformSpaceRequirement.NONE || transformSpaceRequirement === TransformSpaceRequirement.LOCAL ? InputTransformSpace.PARENT : InputTransformSpace.COMPONENT;
        }
    }
}