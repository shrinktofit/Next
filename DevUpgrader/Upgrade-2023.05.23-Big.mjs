import assert from "assert";
import { listAnimationGraphToUpgrade, renameInputs, renameProperties, renameTypeName, visitObj } from "./UpgradeUtils.mjs";

const TransformSpaceRequirement = Object.freeze({
    NONE: 0,
    LOCAL: 1,
    Component: 2,
});

const CopySpace = Object.freeze({
    LOCAL: 0,
    Component: 1,
});

for await (const { json } of await listAnimationGraphToUpgrade()) {
    renameTypeName(json, new Map([
        ['cc.animation.MotionCoordination', 'cc.animation.MotionSyncInfo'],
        ['cc.animation.PoseNodeAddPose', 'cc.animation.PoseNodeAdditivelyBlend'],
    ]));

    const propertyRenameEntry_BlendTwoPoseBase = { };
    const inputRenameEntry_BlendTwoPoseBase = { };
    const propertyRenameEntry_PoseNodeModifyPoseBase = {};
    const inputRenameEntry_PoseNodeModifyPoseBase = {
        'input': ['pose', true],
    };
    const durationalTransition_propertyRenameEntry = {
        'startEvent': 'startEventBinding',
        'endEvent': 'endEventBinding',
    };
    const state_propertyRenameEntry = {
        'transitionInEvent': 'transitionInEventBinding',
        'transitionOutEvent': 'transitionOutEventBinding',
    };

    renameProperties(json, {
        'cc.animation.PoseTransition': {
            ...durationalTransition_propertyRenameEntry,
        },
        'cc.animation.AnimationTransition': {
            ...durationalTransition_propertyRenameEntry,
        },
        'cc.animation.EmptyStateTransition': {
            ...durationalTransition_propertyRenameEntry,
        },

        'cc.animation.Motion': {
            ...state_propertyRenameEntry,
        },
        'cc.animation.PoseState': {
            ...state_propertyRenameEntry,
        },


        'cc.animation.PoseNodeChoosePoseByBoolean':  {
            '_alteringDurations': '_fadeInDuration',
        },
        'cc.animation.PoseNodeChoosePoseByIndex': {
            '_alteringDurations': '_fadeInDuration',
        },
        'cc.animation.PoseNodeTwoBoneIKSolver': { ...propertyRenameEntry_PoseNodeModifyPoseBase },
        'cc.animation.PoseNodeTwoBoneIKSolver.TargetSpecification': {},
        'cc.animation.PoseNodeAdditivelyBlend': {},
        'cc.animation.PoseNodeApplyTransform': {
            ...propertyRenameEntry_PoseNodeModifyPoseBase,
            'positionApplyFlag': 'positionOperation',
            'rotationApplyFlag': 'rotationOperation',
        },
        'cc.animation.PoseNodeCopyTransform': {
            ...propertyRenameEntry_PoseNodeModifyPoseBase,
            'sourceTransformName': 'sourceNodeName',
            'targetTransformName': 'targetNodeName',
            'transformSpaceRequirement': 'space', // TODO
        },
        'cc.animation.PoseNodeBlendInProportion': {},
        'cc.animation.PoseNodeBlendTwoPose': { ...propertyRenameEntry_BlendTwoPoseBase },
        'cc.animation.PoseNodeFilteringBlend': { ...propertyRenameEntry_BlendTwoPoseBase },
        'cc.animation.PoseNodeUseStashedPose': {},
        'cc.animation.PoseNodeStateMachine': {},
        'cc.animation.PoseNodeSetAuxiliaryCurve': {},
        'cc.animation.PoseNodeSampleMotion': {},
        'cc.animation.PoseNodePlayMotion': {
            'coordination': 'syncInfo',
        },
    });

    renameInputs(json, {
        'cc.animation.PoseNodeChoosePoseByBoolean': { 'chosen': ['choice', true] },
        'cc.animation.PoseNodeChoosePoseByIndex': { 'chosen': ['choice', true] },
        'cc.animation.PoseNodeTwoBoneIKSolver': { ...inputRenameEntry_PoseNodeModifyPoseBase },
        'cc.animation.PoseNodeTwoBoneIKSolver.TargetSpecification': {},
        'cc.animation.PoseNodeAdditivelyBlend': {
            'base': ['basePose', true],
            'addition': ['additivePose', true],
        },
        'cc.animation.PoseNodeApplyTransform': { ...inputRenameEntry_PoseNodeModifyPoseBase },
        'cc.animation.PoseNodeCopyTransform': { ...inputRenameEntry_PoseNodeModifyPoseBase },
        'cc.animation.PoseNodeBlendInProportion': {},
        'cc.animation.PoseNodeBlendTwoPose': { ...inputRenameEntry_BlendTwoPoseBase },
        'cc.animation.PoseNodeFilteringBlend': { ...inputRenameEntry_BlendTwoPoseBase },
        'cc.animation.PoseNodeUseStashedPose': {},
        'cc.animation.PoseNodeStateMachine': {},
        'cc.animation.PoseNodeSetAuxiliaryCurve': { ...inputRenameEntry_PoseNodeModifyPoseBase },
        'cc.animation.PoseNodeSampleMotion': {},
        'cc.animation.PoseNodePlayMotion': {},
    });

    for (const obj of visitObj(json)) {
        if (obj.__type__ === 'cc.animation.PoseNodeCopyTransform') {
            if (obj.space === TransformSpaceRequirement.NONE || obj.space === TransformSpaceRequirement.Component) {
                obj.space = CopySpace.Component;
            } else {
                assert(obj.space === TransformSpaceRequirement.LOCAL);
                obj.space = CopySpace.LOCAL;
            }
        }
    }
}