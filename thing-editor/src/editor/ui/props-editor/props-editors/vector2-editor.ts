import { h } from 'preact';
import R from 'thing-editor/src/editor/preact-fabrics';
import type { NumberEditorProps } from 'thing-editor/src/editor/ui/props-editor/props-editors/number-editor';
import NumberEditor from 'thing-editor/src/editor/ui/props-editor/props-editors/number-editor';
import VectorEditorBase from 'thing-editor/src/editor/ui/props-editor/props-editors/vector-editor-base';
import game from 'thing-editor/src/engine/game';

const vector2EditorProps = { className: 'vector2-editor' };
const propGroupProps = { className: 'vector-editor-group' };

const propLabelProps = { className: 'vector-prop-label' };
const xLabel = R.div(propLabelProps, 'x ');
const yLabel = R.div(propLabelProps, 'y ');


export default class Vector2Editor extends VectorEditorBase {

    private onXChange: (val: number, isDelta: boolean, delta: number) => void;
    private onYChange: (val: number, isDelta: boolean, delta: number) => void;

    constructor(props: any) {
        super(props);
        this.onXChange = this.createChangeHandler('x');
        this.onYChange = this.createChangeHandler('y');
    }

    protected getComponents(): string[] {
        return ['x', 'y'];
    }

    protected createDefaultVector(): Vector2 {
        return { x: 0, y: 0 };
    }

    protected cloneVector(v: Vector2): Vector2 {
        return { x: v.x, y: v.y };
    }

    render() {
        let f = this.props.field;

        let v = (game.editor.selection[0] as KeyedObject)[f.name] as Vector2;
        let body;
        if (v) {
            body = R.div(null,
                R.div(propGroupProps,
                    xLabel,
                    h(NumberEditor, {
                        field: { min: f.vector2_minX, max: f.vector2_maxX, step: f.vector2_stepX },
                        disabled: this.props.disabled,
                        onChange: this.onXChange,
                        value: v.x
                    } as NumberEditorProps)
                ),
                R.div(propGroupProps,
                    yLabel,
                    h(NumberEditor, {
                        field: { min: f.vector2_minY, max: f.vector2_maxY, step: f.vector2_stepY },
                        disabled: this.props.disabled,
                        onChange: this.onYChange,
                        value: v.y
                    } as NumberEditorProps),
                )
            );
        }

        return R.div(vector2EditorProps, body);
    }
}
