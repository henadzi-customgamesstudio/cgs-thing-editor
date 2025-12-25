import editable from "thing-editor/src/editor/props-editor/editable";
import Container from "thing-editor/src/engine/lib/assets/src/basic/container.c";
import Toggle, { type ToggleChangeEvent } from "thing-editor/src/engine/lib/assets/src/custom/toggle.c";
import getValueByPath from "thing-editor/src/engine/utils/get-value-by-path";

export const RADIO_GROUP_EMPTY_VALUE = 'NONE';

export interface RadioGroupChangeEvent {
    value: string;
    toggle: Toggle | null;
}

export default class RadioGroup extends Container {

    @editable({ default: false, tip: 'Allow deselecting by clicking on selected item' })
    allowDeselect: boolean = false;

    @editable({ default: false, tip: 'If true, use custom list of toggles instead of children' })
    useCustomToggles: boolean = false;

    @editable({ type: 'data-path', visible: (o: RadioGroup) => o.useCustomToggles })
    customTogglesPaths: string[] = [];

    private _toggles: Toggle[] = [];
    private _selectedToggle: Toggle | null = null;

    init() {
        super.init();

        if (this.useCustomToggles) {
            this._toggles = this.customTogglesPaths
                .map(path => getValueByPath(path, this))
                .filter(t => t instanceof Toggle) as Toggle[];
        } else {
            this._toggles = this.findChildrenByType(Toggle);
        }

        this._toggles.forEach(toggle => {
            toggle.on('change', this.onToggleChange, this);
            if (toggle.getIsChecked) {
                this._selectedToggle = toggle;
            }
        });
    }

    private onToggleChange(event: ToggleChangeEvent) {
        const { toggle, isChecked } = event;

        if (isChecked) {
            this._toggles.forEach(t => {
                if (t !== toggle && t.getIsChecked) {
                    t.setChecked(false, true);
                }
            });
            this._selectedToggle = toggle;
            this.emitChangeEvent();
        } else {
            if (this.allowDeselect) {
                this._selectedToggle = null;
                this.emitChangeEvent();
            } else {
                const hasAnyChecked = this._toggles.some(t => t.getIsChecked);
                if (!hasAnyChecked) {
                    toggle.setChecked(true, true);
                }
            }
        }
    }

    private emitChangeEvent() {
        const event: RadioGroupChangeEvent = {
            value: this._selectedToggle?.value ?? RADIO_GROUP_EMPTY_VALUE,
            toggle: this._selectedToggle
        };
        this.emit('change', event);
    }

    public setSelectedByValue(value: string) {
        const toggle = this._toggles.find(t => t.value === value);
        if (toggle) {
            toggle.setChecked(true, false);
        }
    }

    public setSelectedByIndex(index: number) {
        if (index >= 0 && index < this._toggles.length) {
            this._toggles[index].setChecked(true, false);
        }
    }

    public clearSelection() {
        this._toggles.forEach(t => {
            if (t.getIsChecked) {
                t.setChecked(false, true);
            }
        });
        this._selectedToggle = null;
        this.emitChangeEvent();
    }

    onRemove() {
        this._toggles.forEach(toggle => {
            toggle.off('change', this.onToggleChange, this);
        });
        this._toggles = [];
        this._selectedToggle = null;
        super.onRemove();
    }
}
