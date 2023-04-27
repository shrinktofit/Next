import assert from "assert";
import { followPossibleAlias, listAnimationGraphToUpgrade, makeRef, visitObj } from "./UpgradeUtils.mjs";

for await (const { json } of await listAnimationGraphToUpgrade()) {
    for (const obj of visitObj(json)) {
        if (obj.__type__ === "cc.animation.PoseGraph") {
            const { _main, _shells } = obj;

            let rootOutputNodeEditorData;
            if (obj.__editorExtras__) {
                rootOutputNodeEditorData = obj.__editorExtras__.rootOutputNodeEditorData;
                delete obj.__editorExtras__.rootOutputNodeEditorData;
            }

            const nodes = obj._nodes = [];

            const shellToNewNodeMap = new Map();
            
            // Add output node to assembly.
            json.push({
                __type__: 'cc.animation.PoseGraphOutputNode',
                __editorExtras__: rootOutputNodeEditorData,
            });
            const outputNodeIndex = json.length - 1;
            // Add output node shell to assembly.
            const newMainShellObj = {
                __type__: 'cc.animation.PoseGraphNodeShell',
                _bindings: [],
            };
            json.push(newMainShellObj);
            const outputNodeShellIndex = json.length - 1;

            for (const shell of _shells) {
                const shellObj = followPossibleAlias(shell, json);
                const {
                    __editorExtras__,
                    _node,
                } = shellObj;

                const nodeObj = followPossibleAlias(_node, json);
                nodeObj.__editorExtras__ = __editorExtras__;

                json.push(nodeObj);
                shellToNewNodeMap.set(shellObj, json.length - 1);
                nodes.push(makeRef(json.length - 1));

                delete shellObj._node;
                delete shellObj.__editorExtras__;
            }

            for (const shell of _shells) {
                const shellObj = followPossibleAlias(shell, json);

                const {
                    _bindings,
                } = shellObj;
                
                for (const binding of _bindings) {
                    const bindingObj = followPossibleAlias(binding, json);

                    const {
                        __type__,
                        _target,
                    } = bindingObj;

                    assert(__type__ === 'cc.animation.PoseGraphNodePropertyBinding');
                    bindingObj.__type__ = 'cc.animation.PoseGraphNodeInputBinding';
                    const targetShell = followPossibleAlias(_target, json);
                    assert(shellToNewNodeMap.has(targetShell));
                    bindingObj._producer = makeRef(shellToNewNodeMap.get(targetShell));
                }
            }

            delete obj._main;

             // Add output node and shell into graph.
             {
                obj._outputNode = makeRef(outputNodeIndex);
                nodes.unshift(makeRef(outputNodeIndex));
                _shells.unshift(makeRef(outputNodeShellIndex));
            }

            if (_main) {
                const mainObj = followPossibleAlias(_main, json);

                assert(shellToNewNodeMap.has(mainObj));
                newMainShellObj._bindings.push({
                    __type__: 'cc.animation.PoseGraphNodeInputBinding',
                    _inputPath: ['pose'],
                    _producer: makeRef(shellToNewNodeMap.get(mainObj)),
                    _outputIndex: 0,
                });
            }
        }
    }
}