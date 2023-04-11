import { approx, builtinResMgr, Color, Component, gfx, Material, Mesh, MeshRenderer, Node, utils, Vec2, Vec3, Vec4, _decorator } from "cc";

const cacheTo = new Vec3();

const lineRendererMaterial = new Material();
{
    lineRendererMaterial.reset({
        effectName: 'builtin-unlit',
        states: {
            primitive: gfx.PrimitiveMode.LINE_LIST,
        },
        defines: {
            USE_VERTEX_COLOR: true,
        },
    });
}

type ExcludeHead<T> = T extends [infer U, ...infer V] ? V : never;

export class LineRenderer {
    public constructor(node: Node) {
        this._lineBuffer = new LineBuffer(node);
        this._defaultStyle = new StyledLineRenderer(this._lineBuffer, {});
    }

    public clear() {
        this._lineBuffer.clear();
    }

    public lineFromTo(...args: Parameters<StyledLineRenderer['lineFromTo']>) {
        return this._defaultStyle.lineFromTo(...args);
    }

    public lineFromDir(...args: Parameters<StyledLineRenderer['lineFromDir']>) {
        return this._defaultStyle.lineFromDir(...args);
    }

    public lineFromDirScale(...args: Parameters<StyledLineRenderer['lineFromDirScale']>) {
        return this._defaultStyle.lineFromDirScale(...args);
    }

    public style(...args: ExcludeHead<ConstructorParameters<typeof StyledLineRenderer>>) {
        return new StyledLineRenderer(this._lineBuffer, ...args);
    }

    public commit() {
        this._lineBuffer.commit();
    }

    private _lineBuffer: LineBuffer;
    private _defaultStyle: StyledLineRenderer;
}

class LineBuffer {
    public constructor(node: Node) {
        const meshRenderer = node.addComponent(MeshRenderer);
        this._meshRenderer = meshRenderer;
        meshRenderer.material = lineRendererMaterial;
    }

    public clear() {
        this._vertexCount = 0;
        this._vertices.fill(0);
    }
    
    public addLine(): number {
        const p = this._vertexCount * LineBuffer._vertexStrideInFloat;
        this._vertexCount += 2;
        if (this._vertexCount > this._vertexCapacity) {
            const newCapacity = this._vertexCount * 2;
            const newVertices = new Float32Array(LineBuffer._vertexStrideInFloat * newCapacity);
            newVertices.set(this._vertices);
            this._vertices = newVertices;
            this._vertexCapacity = newCapacity;
            this._vertexCapacityDirty = true;
        }
        return p;
    }

    public commit() {
        if (this._vertexCapacityDirty) {
            this._vertexCapacityDirty = false;
            const { _vertexCapacity: vertexCapacity } = this;
            const mesh = utils.MeshUtils.createMesh({
                positions: new Array(3 * vertexCapacity).fill(0.0),
                colors: new Array(4 * vertexCapacity).fill(0.0),
                primitiveMode: gfx.PrimitiveMode.LINE_LIST,
            });
            this._mesh = mesh;
            this._meshRenderer.mesh = mesh;
        }
        this._mesh.renderingSubMeshes[0].vertexBuffers[0].update(this._vertices);
    }

    public static _vertexStrideInFloat = 7;
    public static _vertexColorStartInFloat = 3;

    public _vertices: Float32Array = new Float32Array();
    private _vertexCount: number = 0;
    private _vertexCapacity: number = 0;
    private _vertexCapacityDirty = true;
    private declare _mesh: Mesh;
    private declare _meshRenderer: MeshRenderer;
}

class StyledLineRenderer {
    constructor(lineBuffer: LineBuffer, {
        color = Color.WHITE,
        dash = false,
        dashLen = 0.1,
        dashRate = 0.618,
    }: {
        color?: Readonly<Color>;
        dash?: boolean;
        dashLen?: number;
        dashRate?: number;
    }) {
        this._lineBuffer = lineBuffer;
        Color.copy(this._color, color);
        this._dash = dash;
        this._dashLen = dashLen;
        this._dashRate = dashRate;
    }

    public lineFromTo(from: Readonly<Vec3>, to: Readonly<Vec3>, color: Readonly<Color>) {
        const { _lineBuffer: lineBuffer, _dash: dash } = this;
        if (!dash) {
            const p = lineBuffer.addLine();
            Vec3.toArray(lineBuffer._vertices, from, p);
            Vec4.toArray(lineBuffer._vertices, color, p + LineBuffer._vertexColorStartInFloat);
            Vec3.toArray(lineBuffer._vertices, to, p + LineBuffer._vertexStrideInFloat);
            Vec4.toArray(lineBuffer._vertices, color, p + LineBuffer._vertexColorStartInFloat + LineBuffer._vertexStrideInFloat);
        } else {
            const dir = Vec3.subtract(new Vec3(), to, from);
            const lenSum = Vec3.len(dir);
            if (approx(lenSum, 0.0, 1e-6)) {
                return;
            }

            const dashLen = this._dashLen;
            const dashRate = this._dashRate;

            const spaceLen = dashLen * dashRate;

            Vec3.multiplyScalar(dir, dir, 1.0 / lenSum);
            const div = lenSum / dashLen;

            const p1 = new Vec3();
            const p2 = new Vec3();
            const draw = (p1Len: number, p2Len: number) => {
                Vec3.scaleAndAdd(p1, from, dir, p1Len);
                Vec3.scaleAndAdd(p2, from, dir, p2Len);

                const p = lineBuffer.addLine();
                Vec3.toArray(lineBuffer._vertices, p1, p);
                Vec4.toArray(lineBuffer._vertices, color, p + LineBuffer._vertexColorStartInFloat);
                Vec3.toArray(lineBuffer._vertices, p2, p + LineBuffer._vertexStrideInFloat);
                Vec4.toArray(lineBuffer._vertices, color, p + LineBuffer._vertexColorStartInFloat + LineBuffer._vertexStrideInFloat);
            };

            const nEasyDash = Math.floor(div) - 1;
            for (let i = 0; i < nEasyDash; ++i) {
                const p1Len = dashLen * i;
                const p2Len = p1Len + spaceLen;
                draw(p1Len, p2Len);
            }
            draw(nEasyDash * dashLen, lenSum);
        }
    }

    public lineFromDir(from: Readonly<Vec3>, dir: Readonly<Vec3>, color: Readonly<Color>) {
        const to = Vec3.add(cacheTo, from, dir);
        this.lineFromTo(from, to, color);
    }

    public lineFromDirScale(from: Readonly<Vec3>, dir: Readonly<Vec3>, scale: number, color: Readonly<Color>) {
        const to = Vec3.scaleAndAdd(cacheTo, from, dir, scale);
        this.lineFromTo(from, to, color);
    }

    private _lineBuffer: LineBuffer;
    private _color = new Color();
    private _dash = false;
    private _dashLen = 0.1;
    private _dashRate = 0.618;
}

export type { StyledLineRenderer };