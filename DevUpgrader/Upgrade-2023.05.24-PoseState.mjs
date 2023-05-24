import assert from "assert";
import { listAnimationGraphToUpgrade, renameTypeName } from "./UpgradeUtils.mjs";

for await (const { json } of await listAnimationGraphToUpgrade()) {
    renameTypeName(json, new Map([
        ['cc.animation.PoseState', 'cc.animation.ProceduralPoseState'],
        ['cc.animation.PoseTransition', 'cc.animation.ProceduralPoseTransition'],
    ]));
}