import type { AssetInfo } from "../../@types/packages/asset-db/@types/public";
import fs from 'fs-extra';

export function onCreateMenu(assetInfo: AssetInfo) {
    return [{
        label: '动画剪辑导入后处理',
        click() {
            console.log(JSON.stringify(assetInfo, undefined, 2));
            fs.writeJsonSync(assetInfo.file, {});            
        },
    }];
}