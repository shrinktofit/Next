import assert from "assert";
import { listAnimationGraphToUpgrade } from "./UpgradeUtils.mjs";
import { renameProperties } from "./UpgradeUtils.mjs";

for await (const { json } of await listAnimationGraphToUpgrade()) {
    renameProperties(json, {
        'cc.animation.AnimationGraphEventBinding': {
            'eventName': 'methodName',
        },
    });
}
