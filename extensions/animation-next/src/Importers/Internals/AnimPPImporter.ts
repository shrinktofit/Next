/// <reference path="./engine-internals.d.ts"/>

import fs from 'fs-extra';

const { Path } = Editor.Utils;

module.paths.push(Path.join(Editor.App.path, 'node_modules'));
import { Asset, Importer, VirtualAsset } from '@editor/asset-db';
import { animation, AnimationClip, approx, Asset as CCAsset, assetManager, js, Node, Quat, toDegree, Vec3 } from 'cc';
import assert from 'assert';
import { exoticAnimationTag, removeNodeTransformAnimation, TransformFlag } from 'cc/editor/exotic-animation';
import { PPAnim, PPCalculateRotationAmount } from './AnimPPFile';
import { CCON, encodeCCONBinary } from 'cc/editor/serialization';

export default class AnimPPImporter extends Importer {
    public get version() {
        return '1.0.0';
    }

    public get name() {
        return 'animpp';
    }

    public get assetType() {
        return js.getClassName(AnimationClip);
    }

    public async validate(asset: VirtualAsset | Asset) {
        if (await asset.isDirectory()) {
            return false;
        }
        return true;
    }

    public async import(asset: VirtualAsset | Asset): Promise<boolean> {
        let ppAnim: PPAnim;
        try {
            ppAnim = await fs.readJson(asset.source);
        } catch (err) {
            this._logErrorWithCause(`Failed to load .animpp`, err);
            return false;
        }

        if (!ppAnim.source) {
            return true;
        }

        let sourceAnimationClip: AnimationClip;
        try {
            await asset.depend(ppAnim.source);
            sourceAnimationClip = await this._loadAnimationClip(ppAnim.source);
        } catch (err) {
            this._logErrorWithCause(`Failed to load source animation clip ${ppAnim.source}`, err);
            return false;
        }

        for (const process of ppAnim.processes) {
            if (process.type === 'calculate-rotation-amount') {
                this._calculateRotationAmount(sourceAnimationClip, process);
            }
        }

        const ccon = EditorExtends.serialize(sourceAnimationClip, {
            _exporting: false,
            dontStripDefault: false,
            useCCON: true,
        }) as unknown as CCON;

        const cconb = encodeCCONBinary(ccon);
        await asset.saveToLibrary('.cconb', cconb);

        return true;
    }

    private _logErrorWithCause(message: string, cause: unknown) {
        console.error(new Error(`Message: ${cause}`));
    }

    private async _loadAnimationClip(uuid: string): Promise<AnimationClip> {
        return new Promise((resolve, reject) => {
            assetManager.loadAny<AnimationClip>(uuid, (err, asset) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(asset);
                }
            });
        });
    }

    private _calculateRotationAmount(animationClip: AnimationClip, process: PPCalculateRotationAmount) {
        const bones = collectAllBones(animationClip);
        if (bones.length === 0) {
            return;
        }

        let rootBonePath = '';
        if (process.root) {
            rootBonePath = process.root;
        } else {
            const wildBones = new Set<string>();
            for (const bone of bones) {
                let wild = true;
                let findPosition = bones.length - 1;
                do {
                    const iSlash = bone.lastIndexOf('/', findPosition);
                    let end = 0;
                    if (iSlash >= 0) {
                        end = iSlash;
                        findPosition = iSlash - 1;
                    } else {
                        end = 0;
                        findPosition = -1;
                    }
                    const parent = bone.slice(0, end);
                    if (bones.includes(parent)) {
                        wild = false;
                        break;
                    }
                } while (findPosition > 0);
                if (wild) {
                    wildBones.add(bone);
                }
            }
            if (wildBones.size !== 1) {
                console.error(
                    `I found more than one "wild bones": ${[...wildBones].join(', ')}, ` +
                    `so I can not decide a root bone. ` +
                    `Please manually specify the root bone.`);
                return;
            }
            rootBonePath = wildBones.values().next().value; // asserts(wildBones.size !== 0)
            console.log(`Bone ${rootBonePath} is set as root to calculate rotation amount`);
        }

        // Set up scene nodes.
        const topContainer = new Node();
        let rootBoneNode: Node | null = null;
        for (const bone of bones) {
            const path = bone.split('/');
            let current = topContainer;
            for (const p of path) {
                const child = current.children.find((child) => child.name === p);
                if (child) {
                    current = child;
                } else {
                    const child = new Node(p);
                    current.addChild(child);
                    current = child;
                }
            }
            if (bone === rootBonePath) {
                rootBoneNode = current;
            }
        }
        assert(rootBoneNode);

        const evaluator = animationClip.createEvaluator({
            target: topContainer,
        });

        const fps = animationClip.sample || 30;
        const frameTime = 1.0 / fps;
        const nFrames = fps * animationClip.duration;
        const amounts = new Float64Array(nFrames);
        for (let time = 0.0, iFrame = 0; iFrame < nFrames; time += frameTime, ++iFrame) {
            evaluator.evaluate(time);
            const rotation = rootBoneNode.rotation;
            // const forward = Vec3.UNIT_Z;
            // const rotatedForward = Vec3.transformQuat(new Vec3(), forward, rotation);
            // rotatedForward.y = 0;
            // const amount = toDegree(signedAngleVec3(forward, rotatedForward, Vec3.UNIT_Y));
            const amount = Quat.toEuler(new Vec3(), rotation).y;
            amounts[iFrame] = amount;
        }

        console.log(amounts);

        for (let i = amounts.length - 1; i > 0; --i) {
            amounts[i] -= amounts[0];
        }
        amounts[0] = 0;

        console.log(amounts);

        const times = Array.from(amounts, (_, i) => i * frameTime);

        const reducedKeyIndices = reduceLinearKey(
            times,
            amounts,
            1e-1,
        );

        const reducedAmounts = reducedKeyIndices.map((i) => amounts[i]);

        console.log(reducedAmounts);

        const curveName = process.curveName || 'curveName';

        const track = new animation.RealTrack();
        track.path.toAdjointCurve(curveName);
        track.channel.curve.assignSorted(
            times,
            [...amounts],
        );

        animationClip.addTrack(track);

        removeNodeTransformAnimation(animationClip, rootBonePath, TransformFlag.ROTATION);
    }
}

function collectAllBones(clip: AnimationClip): string[] {
    const exoticAnimation = clip[exoticAnimationTag];
    if (!exoticAnimation) {
        console.warn(
            `The animation clip ${clip.name} does not contain exotic animation. ` +
            `Please ensure the animation clip is imported from a model file.`,
        );
        return [];
    }

    return exoticAnimation.collectAnimatedJoints();
}

function signedAngleVec3(a: Readonly<Vec3>, b: Readonly<Vec3>, normal: Readonly<Vec3>) {
    const angle = Vec3.angle(a, b);
    const cross = Vec3.cross(new Vec3(), a, b);
    cross.normalize();
    return Vec3.dot(cross, normal) < 0 ? -angle : angle;
}

function reduceLinearKey(times: number[], values: Float64Array, tolerance: number) {
    if (values.length < 2) {
        return Array.from(values, (_, i) => i);
    }
    const result = Array.from(values, () => 0);
    let prev = 0;
    let nResult = 0;
    result[nResult++] = 0;
    for (let iKey = 1; iKey < values.length - 1; ++iKey) {
        const middle = iKey;
        const next = iKey + 1;
        const slope1 = (values[middle] - values[prev]) / (times[middle] - times[prev]);
        const slope2 = (values[next] - values[middle]) / (times[next] - values[next]);
        if (approx(slope1, slope2, tolerance)) {
            //
        } else {
            result[nResult++] = middle;
            prev = middle;
        }
    }
    result[nResult++] = values.length - 1;
    return result.slice(0, nResult);
}