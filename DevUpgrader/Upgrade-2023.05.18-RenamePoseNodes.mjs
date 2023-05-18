import assert from "assert";
import { listAnimationGraphToUpgrade, renameTypeName } from "./UpgradeUtils.mjs";

for await (const { json } of await listAnimationGraphToUpgrade()) {
    renameTypeName(json, new Map([
        ['cc.animation.ChoosePoseBase', 'cc.animation.PoseNodeChoosePoseBase'],
        ['cc.animation.ChoosePoseByBoolean', 'cc.animation.PoseNodeChoosePoseByBoolean'],
        ['cc.animation.ChoosePoseByIndex', 'cc.animation.PoseNodeChoosePoseByIndex'],
        ['cc.animation.TwoBoneIKSolver', 'cc.animation.PoseNodeTwoBoneIKSolver'],
        ['cc.animation.TwoBoneIKSolver.TargetSpecification', 'cc.animation.PoseNodeTwoBoneIKSolver.TargetSpecification'],
        ['cc.animation.AddPose', 'cc.animation.PoseNodeAddPose'],
        ['cc.animation.ApplyTransform', 'cc.animation.PoseNodeApplyTransform'],
        ['cc.animation.BlendInProportion', 'cc.animation.PoseNodeBlendInProportion'],
        ['cc.animation.BlendTwoPoseBase', 'cc.animation.PoseNodeBlendTwoPoseBase'],
        ['cc.animation.BlendTwoPose', 'cc.animation.PoseNodeBlendTwoPose'],
        ['cc.animation.CopyTransform', 'cc.animation.PoseNodeCopyTransform'],
        ['cc.animation.BlendWithTransformFilter', 'cc.animation.PoseNodeFilteringBlend'],
        ['cc.animation.GetAllPreviousLayersResult', 'cc.animation.PoseNodeGetAllPreviousLayersResult'],
        ['cc.animation.SinglePoseModifier', 'cc.animation.PoseNodeModifyPoseBase'],
        ['cc.animation.MotionNode', 'cc.animation.PoseNodePlayMotion'],
        ['cc.animation.SampleMotionNode', 'cc.animation.PoseNodeSampleMotion'],
        ['cc.animation.SetAuxiliaryCurve', 'cc.animation.PoseNodeSetAuxiliaryCurve'],
        ['cc.animation.StateMachineNode', 'cc.animation.PoseNodeStateMachine'],
        ['cc.animation.UseStashedPose', 'cc.animation.PoseNodeUseStashedPose'],
    ]));
}