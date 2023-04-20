import assert from "assert";
import { listAnimationGraphToUpgrade, visitObj } from "./UpgradeUtils.mjs";

for await (const { json } of await listAnimationGraphToUpgrade()) {
    for (const obj of visitObj(json)) {
        if (obj.__type__ === 'cc.animation.PoseGraphNodePropertyBinding') {
            const { _consumerPropertyKey, _consumerElementIndex } = obj;
            assert(typeof _consumerPropertyKey === 'string' && typeof _consumerElementIndex === 'number');
            delete obj._consumerPropertyKey;
            delete obj._consumerElementIndex;
            obj._inputPath = _consumerElementIndex >= 0
                ? [_consumerPropertyKey, _consumerElementIndex]
                : [_consumerPropertyKey];
        }
    }
}