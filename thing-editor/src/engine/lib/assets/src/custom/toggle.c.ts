import editable from "thing-editor/src/editor/props-editor/editable";
import Button from "thing-editor/src/engine/lib/assets/src/basic/button.c";
import getValueByPath from "thing-editor/src/engine/utils/get-value-by-path";

export interface ToggleChangeEvent {
    isChecked: boolean;
    value: string;
    toggle: Toggle;
}

export default class Toggle extends Button {

    @editable({ type: 'string', important: true })
    value: string = '';

    @editable({ type: 'data-path', tip: 'Optional: Object visible when checked' })
    activeObjectPath: string = '';

    @editable({ type: 'data-path', tip: 'Optional: Object visible when unchecked' })
    notActiveObjectPath: string = '';

    @editable({ type: 'ref' })
    private _activeObject: any = null;

    @editable({ type: 'ref' })
    private _notActiveObject: any = null;

    private _isChecked = false;

    public get getIsChecked(): boolean {
        return this._isChecked;
    }

    init() {
        super.init();
        if (this.activeObjectPath) {
            this._activeObject = getValueByPath(this.activeObjectPath, this);
        }
        if (this.notActiveObjectPath) {
            this._notActiveObject = getValueByPath(this.notActiveObjectPath, this);
        }

        this.onClickCallback = () => {
            this.setChecked(!this._isChecked, false);
        };

        this.updateVisualState();
    }

    update() {
        super.update();
    }

    public setChecked(checked: boolean, silent: boolean) {
        if (this._isChecked === checked) {
            return;
        }
        this._isChecked = checked;
        this.updateVisualState();
        if (!silent) {
            const event: ToggleChangeEvent = {
                isChecked: this._isChecked,
                value: this.value,
                toggle: this
            };
            this.emit('change', event);
        }
    }

    private updateVisualState() {
        if (this._activeObject) {
            this._activeObject.visible = this._isChecked;
        }

        if (this._notActiveObject) {
            this._notActiveObject.visible = !this._isChecked;
        }
    }

    onRemove() {
        super.onRemove();
        this._activeObject = null;
        this._notActiveObject = null;
    }
}
