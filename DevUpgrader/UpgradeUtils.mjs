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

export function followPossibleAlias(obj, root) {
    if (obj.__id__) {
        return root[obj.__id__];
    } else {
        return obj;
    }
}

export function makeRef(index) {
    return { __id__: index };
}

export function renameTypeName(root, typeRenameMap) {
    const renamedType = new Set();

    for (const obj of visitObj(root, root, new Set())) {
        if (typeRenameMap.has(obj.__type__)) {
            renamedType.add(obj.__type__);
            obj.__type__ = typeRenameMap.get(obj.__type__);
        }
    }

    for (let type of typeRenameMap.keys()) {
        if (!renamedType.has(type)) {
            console.error(`${type} is not renamed`);
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

/**
 * 
 * @param {Record<string, Record<string, string>[]>} entries 
 */
export function renameProperties(root, entries) {
    const counter = {};

    for (const obj of visitObj(root)) {
        if (!(obj.__type__ in entries)) {
            continue;
        }
        const entry = entries[obj.__type__];
        for (const [k, newKey] of Object.entries(entry)) {
            if (!(k in obj)) {
                console.warn(`Key ${k} is missing in ${obj}!`);
                continue;
            }
            renamePropertyName(obj, k, newKey);
            const typeCounter = (counter[obj.__type__] ??= {});
            if (!typeCounter[k]) {
                typeCounter[k] = 0;
            }
            ++typeCounter[k];
        }
    }

    for (const [typeName, entry] of Object.entries(entries)) {
        for (const [k, newKey] of Object.entries(entry)) {
            if (!(typeName in counter) || !(k in counter[typeName])) {
                console.warn(`The property name replacement ${typeName}: ${k} -> ${newKey} does not happen.`);
            }
        }
    }
}

function renamePropertyName(obj, originalPropertyKey, newPropertyKey) {
    const originalEntries = Object.entries(obj);
    for (const k of Object.keys(obj)) {
        delete obj[k];
    }
    originalEntries.forEach(([k, v]) => {
        obj[k === originalPropertyKey ? newPropertyKey : k] = v;
    });
}

/**
 * 
 * @param {Record<string, Record<string, [newInputName: string, isAlsoProperty: boolean]>[]>} entries 
 */
export function renameInputs(root, entries) {
    const counter = {};

    for (const obj of visitObj(root)) {
        if (!(obj.__type__ in entries)) {
            continue;
        }
        const entry = entries[obj.__type__];
        for (const [k, [newKey, isAlsoProperty]] of Object.entries(entry)) {
            if (isAlsoProperty) {
                (() => {
                    if (!(k in obj)) {
                        console.warn(`Key ${k} is missing in ${obj}!`);
                        return;
                    }
                    renamePropertyName(obj, k, newKey);
                })();
            }

            const renamedAny = renameInputTo(root, obj, k, newKey);
            if (renamedAny) {
                const typeCounter = (counter[obj.__type__] ??= {});
                if (!typeCounter[k]) {
                    typeCounter[k] = 0;
                }
                ++typeCounter[k];
            }
        }
    }

    for (const [typeName, entry] of Object.entries(entries)) {
        for (const [k, [newKey, isAlsoProperty]] of Object.entries(entry)) {
            if (!(typeName in counter) || !(k in counter[typeName])) {
                console.warn(`The input name replacement ${typeName}: ${k} -> ${newKey} does not happen.`);
            }
        }
    }
}

function renameInputTo(root, consumerNode, inputKey, newInputKey) {
    for (const obj of root) {
        if (obj.__type__ !== 'cc.animation.PoseGraph') {
            continue;
        }
        const nodeIndex = obj._nodes.findIndex((nodeX) => {
            const node = followPossibleAlias(nodeX, root);
            return node === consumerNode;
        });
        if (nodeIndex < 0) {
            continue;
        }
        let foundAny = false;
        const shell = followPossibleAlias(obj._shells[nodeIndex], root);
        for (const bindingX of shell._bindings) {
            const binding = followPossibleAlias(bindingX, root);
            const { _inputPath } = binding;
            if (_inputPath[0] === inputKey) {
                _inputPath[0] = newInputKey;
                foundAny = true;
            }
        }
        return foundAny;
    }
    throw new Error(`Node ${consumerNode} is not within animation graph!`);
}

export function clearObject(obj) {
    for (const k of Object.getOwnPropertyNames(obj)) {
        delete obj[k];
    }
}