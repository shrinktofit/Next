import { InitialEditorData } from './private';

declare module "cc/editor/new-gen-anim" {
    import { editorExtrasTag } from 'cc';

    interface PoseExpr {
        [editorExtrasTag]: {
            centerX?: number;
            centerY?: number;
        };
    }

    interface PoseExprGraph {
        [editorExtrasTag]: {
            outputNode: {
                centerX?: number;
                centerY?: number;
            };
        };
    }
}