import { h } from 'preact';
import R from 'thing-editor/src/editor/preact-fabrics';
import type { NumberEditorProps } from 'thing-editor/src/editor/ui/props-editor/props-editors/number-editor';
import NumberEditor from 'thing-editor/src/editor/ui/props-editor/props-editors/number-editor';
import VectorEditorBase from 'thing-editor/src/editor/ui/props-editor/props-editors/vector-editor-base';
import game from 'thing-editor/src/engine/game';

const vector3EditorProps = { className: 'vector3-editor' };
const propGroupProps = { className: 'vector-editor-group' };

const propLabelProps = { className: 'vector-prop-label' };
const xLabel = R.div(propLabelProps, 'x ');
const yLabel = R.div(propLabelProps, 'y ');
const zLabel = R.div(propLabelProps, 'z ');


export default class Vector3Editor extends VectorEditorBase {

    private onXChange: (val: number, isDelta: boolean, delta: number) => void;
    private onYChange: (val: number, isDelta: boolean, delta: number) => void;
    private onZChange: (val: number, isDelta: boolean, delta: number) => void;

    constructor(props: any) {
        super(props);
        this.onXChange = this.createChangeHandler('x');
        this.onYChange = this.createChangeHandler('y');
        this.onZChange = this.createChangeHandler('z');
    }

    protected getComponents(): string[] {
        return ['x', 'y', 'z'];
    }

    protected createDefaultVector(): Vector3 {
        return { x: 0, y: 0, z: 0 };
    }

    protected cloneVector(v: Vector3): Vector3 {
        return { x: v.x, y: v.y, z: v.z };
    }

    render() {
        let f = this.props.field;

        let v = (game.editor.selection[0] as KeyedObject)[f.name] as Vector3;
        let body;
        if (v) {
            body = R.div(null,
                R.div(propGroupProps,
                    xLabel,
                    h(NumberEditor, {
                        field: { min: f.vector3_minX, max: f.vector3_maxX, step: f.vector3_stepX },
                        disabled: this.props.disabled,
                        onChange: this.onXChange,
                        value: v.x
                    } as NumberEditorProps)
                ),
                R.div(propGroupProps,
                    yLabel,
                    h(NumberEditor, {
                        field: { min: f.vector3_minY, max: f.vector3_maxY, step: f.vector3_stepY },
                        disabled: this.props.disabled,
                        onChange: this.onYChange,
                        value: v.y
                    } as NumberEditorProps),
                ),
                R.div(propGroupProps,
                    zLabel,
                    h(NumberEditor, {
                        field: { min: f.vector3_minZ, max: f.vector3_maxZ, step: f.vector3_stepZ },
                        disabled: this.props.disabled,
                        onChange: this.onZChange,
                        value: v.z
                    } as NumberEditorProps),
                )
            );
        }

        return R.div(vector3EditorProps, body);
    }
}
