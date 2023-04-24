import assert from "assert";
import { clearObject, listAnimationGraphToUpgrade, visitObj } from "./UpgradeUtils.mjs";

for await (const { json } of await listAnimationGraphToUpgrade()) {
    for (const obj of visitObj(json)) {
        if (obj.__type__ === 'cc.animation.AnimationGraph') {
            const { _variables } = obj;
            for (const k of Object.keys(_variables)) {
                if (k.startsWith('#')) {
                    delete _variables[k];
                }
            }
        } else if (obj.__type__ === 'cc.animation.TCVariableBinding') {
            const { variableName  } = obj;
            if (variableName === '#StateWeight') {
                clearObject(obj);
                obj.__type__ = 'cc.animation.TCStateWeightBinding';
            } else if (variableName.startsWith('#')) {
                clearObject(obj);
                obj.__type__ = 'cc.animation.TCAuxiliaryCurveBinding';
                obj.curveName = variableName.slice(1);
            }
        }
    }
}