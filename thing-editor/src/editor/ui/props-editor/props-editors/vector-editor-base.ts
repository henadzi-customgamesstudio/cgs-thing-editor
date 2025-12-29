import type { Container } from 'pixi.js';
import { Component } from 'preact';
import type { EditablePropertyEditorProps } from 'thing-editor/src/editor/ui/props-editor/props-field-wrapper';
import game from 'thing-editor/src/engine/game';
import Lib from 'thing-editor/src/engine/lib';

interface VectorEditorState {
    focus: boolean;
}

/**
 * Base class for Vector2Editor and Vector3Editor.
 * Provides common functionality for editing vector properties.
 */
export default abstract class VectorEditorBase extends Component<EditablePropertyEditorProps, VectorEditorState> {

    timeout = 0;

    /**
     * Returns the list of component names (e.g., ['x', 'y'] or ['x', 'y', 'z']).
     */
    protected abstract getComponents(): string[];

    /**
     * Creates a clone of the vector with default values.
     */
    protected abstract createDefaultVector(): object;

    /**
     * Creates a clone of the given vector.
     */
    protected abstract cloneVector(v: object): object;

    componentWillMount() {
        this.checkNullability();
    }

    UNSAFE_componentWillReceiveProps() {
        if (!this.timeout) {
            this.timeout = window.setTimeout(() => {
                this.checkNullability();
                clearTimeout(this.timeout);
                this.timeout = 0;
            }, 6);
        }
    }

    componentWillUnmount() {
        if (this.timeout) {
            clearTimeout(this.timeout);
            this.timeout = 0;
        }
    }

    checkNullability() {
        if (!(game.editor.selection[0] as KeyedObject)[this.props.field.name] && !this.props.field.canBeEmpty) {
            this.initializeDefaultValue();
        }
    }

    initializeDefaultValue() {
        let fieldName = this.props.field.name;
        let fieldDefault = this.props.field.default;
        for (let o of game.editor.selection) {
            if (!(o as KeyedObject)[fieldName]) {
                // Use field.default if specified, otherwise use createDefaultVector()
                const defaultValue = fieldDefault
                    ? this.cloneVector(fieldDefault)
                    : this.createDefaultVector();
                (o as KeyedObject)[fieldName] = defaultValue;
                Lib.__invalidateSerializationCache(o);
            }
        }
        this.forceUpdate();
        game.editor.sceneModified();
    }

    /**
     * Ensures the object has its own vector instance (not shared with defaults or other instances).
     * Clones the vector if needed to prevent modifying shared references.
     */
    ensureOwnVector(o: KeyedObject, fieldName: string) {
        const currentVector = o[fieldName];
        const defaultValues = (o.constructor as any).__defaultValues;
        // If vector is the same object as default, clone it
        if (defaultValues && currentVector === defaultValues[fieldName]) {
            o[fieldName] = this.cloneVector(currentVector);
            Lib.__invalidateSerializationCache(o as Container);
        }
    }

    /**
     * Creates a change handler for a specific component.
     */
    createChangeHandler(componentName: string) {
        return (val: number, isDelta: boolean, delta: number) => {
            this.changeVectorProperty(val, isDelta, delta, componentName);
        };
    }

    changeVectorProperty(val: number, isDelta: boolean, delta: number, name: string) {
        let fieldName = this.props.field.name;
        let updated = false;

        for (let o of game.editor.selection as KeyedObject[]) {
            // Ensure we have our own copy before modifying
            this.ensureOwnVector(o, fieldName);

            if (isDelta && delta !== 0) {
                o[fieldName][name] += delta;
                Lib.__invalidateSerializationCache(o as Container);
                updated = true;
            } else if (o[fieldName][name] !== val) {
                o[fieldName][name] = val;
                Lib.__invalidateSerializationCache(o as Container);
                updated = true;
            }
            if (this.props.field.hasOwnProperty('parser')) {
                o[fieldName] = this.props.field.parser!(o[fieldName]);
            }
        }
        if (updated) {
            this.forceUpdate();
            game.editor.sceneModified();
        }
    }
}
