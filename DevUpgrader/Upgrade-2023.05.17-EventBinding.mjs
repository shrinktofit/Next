import assert from "assert";
import { listAnimationGraphToUpgrade, renameTypeName } from "./UpgradeUtils.mjs";

for await (const { json } of await listAnimationGraphToUpgrade()) {
    renameTypeName(json, new Map([
        ['cc.animation.AnimationGraphEvent', 'cc.animation.AnimationGraphEventBinding'],
    ]));
}