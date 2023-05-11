import { listAnimationGraphToUpgrade, visitObj } from "./UpgradeUtils.mjs";

for await (const { json } of await listAnimationGraphToUpgrade()) {
    for (const obj of visitObj(json)) {
        if (typeof obj.__type__ === 'string') {
            obj.__type__ = obj.__type__
                .replace(/^cc\.animation\.x_nodes\.XNode/, 'cc.animation.PVNode')
                ;
        }
    }
}