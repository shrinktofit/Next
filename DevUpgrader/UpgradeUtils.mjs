import assert from 'assert';
import fs from 'fs-extra';
import ps from 'path';
import { fileURLToPath } from 'url';

export async function* listAnimationGraphToUpgrade() {
    for (const file of listFile(fileURLToPath(new URL('..', import.meta.url)))) {
        if (!file.endsWith('.animgraph')) {
            continue;
        }
        console.log(`Processing ${file}`);
        const json = await fs.readJson(file);
        yield { json };
        await fs.writeJson(file, json, { spaces: 2 });
    }
}

export function* visitObj(obj, root = obj, visited = new Set()) {
    if (visited.has(obj)) {
        return;
    }
    visited.add(obj);

    if (obj.__id__) {
        const realObj = root[obj.__id__];
        yield* visitObj(realObj, root, visited);
    } else {
        yield obj;
        for (const [k, v] of Object.entries(obj)) {
            if (typeof v === 'object' && v) {
                yield* visitObj(v, root, visited);
            }
        }
    }
}

export function renameTypeName(root, typeRenameMap) {
    const renamedType = new Set();

    for (const obj of visitObj(root, root, new Set())) {
        if (typeRenameMap.has(obj.__type__)) {
            obj.__type__ = typeRenameMap.get(obj.__type__);
            renamedType.add(obj.__type__);
        }
    }
}

function* listFile(directory) {
    const dirItems = fs.readdirSync(directory);
    for (const dirItem of dirItems) {
        const fullPath = ps.join(directory, dirItem);
        const stats = fs.statSync(fullPath);
        if (stats.isFile()) {
            yield fullPath;
        } else if (stats.isDirectory()) {
            yield* listFile(fullPath);
        }
    }
}

export function clearObject(obj) {
    for (const k of Object.getOwnPropertyNames(obj)) {
        delete obj[k];
    }
}