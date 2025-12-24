import { Container } from 'pixi.js';
import editable from 'thing-editor/src/editor/props-editor/editable';
import BasicContainer from 'thing-editor/src/engine/lib/assets/src/basic/container.c';
import getValueByPath from 'thing-editor/src/engine/utils/get-value-by-path';

const MODE_FIXED_COLS = 'fixed_cols';
const MODE_FIXED_ROWS = 'fixed_rows';

export default class Grid extends BasicContainer {

    @editable({ type: 'number', min: 1, default: 100, step: 1 })
    set itemWidth(v: number) {
        this._itemWidth = v;
        this.arrange();
    }
    get itemWidth() { return this._itemWidth; }
    private _itemWidth = 100;

    @editable({ type: 'number', min: 1, default: 100, step: 1 })
    set itemHeight(v: number) {
        this._itemHeight = v;
        this.arrange();
    }
    get itemHeight() { return this._itemHeight; }
    private _itemHeight = 100;

    @editable({ type: 'number', default: 0, step: 1 })
    set spacingX(v: number) {
        this._spacingX = v;
        this.arrange();
    }
    get spacingX() { return this._spacingX; }
    private _spacingX = 0;

    @editable({ type: 'number', default: 0, step: 1 })
    set spacingY(v: number) {
        this._spacingY = v;
        this.arrange();
    }
    get spacingY() { return this._spacingY; }
    private _spacingY = 0;

    /// #if EDITOR
    @editable({
        type: 'string',
        select: [
            { name: 'Fixed Columns Count', value: MODE_FIXED_COLS },
            { name: 'Fixed Rows Count', value: MODE_FIXED_ROWS }
        ],
        default: MODE_FIXED_COLS
    })
    /// #endif
    set layoutMode(v: string) {
        this._layoutMode = v;
        this.arrange();
    }
    get layoutMode() { return this._layoutMode; }
    private _layoutMode = MODE_FIXED_COLS;

    @editable({ type: 'number', min: 1, default: 3, step: 1, title: 'Count Limit' })
    set fixedCount(v: number) {
        this._fixedCount = Math.max(1, Math.floor(v));
        this.arrange();
    }
    get fixedCount() { return this._fixedCount; }
    private _fixedCount = 3;

    @editable({ type: 'boolean', default: false })
    set centerGrid(v: boolean) {
        this._centerGrid = v;
        this.arrange();
    }
    get centerGrid() { return this._centerGrid; }
    private _centerGrid = false;

    /// #if EDITOR
    @editable({
        type: 'data-path',
        title: 'Target Container',
        tip: 'Leave empty to use this container itself, or specify path to another container (e.g. "parent.itemsContainer").',
        isValueValid: (o: any) => (o instanceof Container)
    })
    /// #endif
    set targetContainerPath(v: string) {
        this._targetContainerPath = v;
        this._container = null;
        this.arrange();
    }
    get targetContainerPath() { return this._targetContainerPath; }
    private _targetContainerPath = '';

    private _container: Container | null = null;

    private _lastChildrenCount: number = -1;

    init() {
        super.init();
        this.arrange();
    }

    update() {
        super.update();

        const container = this.getContainer();
        if (container && container.children.length !== this._lastChildrenCount) {
            this.arrange();
        }
    }

    private getContainer(): Container | null {
        if (!this._targetContainerPath) {
            return this;
        }

        if (this._container) {
            return this._container;
        }

        const found = getValueByPath(this._targetContainerPath, this);
        if (found instanceof Container) {
            this._container = found;
        }
        return this._container;
    }

    public arrange() {
        const container = this.getContainer();
        if (!container) {
            return;
        }

        const children = container.children;
        this._lastChildrenCount = children.length;

        if (children.length === 0) {
            return;
        }

        const limit = this._fixedCount;
        const w = this._itemWidth + this._spacingX;
        const h = this._itemHeight + this._spacingY;

        let cols = 0;
        let rows = 0;
        if (this._layoutMode === MODE_FIXED_COLS) {
            cols = Math.min(children.length, limit);
            rows = Math.ceil(children.length / limit);
        } else {
            rows = Math.min(children.length, limit);
            cols = Math.ceil(children.length / limit);
        }

        let offsetX = 0;
        let offsetY = 0;
        if (this._centerGrid) {
            const totalWidth = cols * this._itemWidth + (cols - 1) * this._spacingX;
            const totalHeight = rows * this._itemHeight + (rows - 1) * this._spacingY;
            offsetX = -totalWidth / 2;
            offsetY = -totalHeight / 2;
        }

        for (let i = 0; i < children.length; i++) {
            const child = children[i];
            let col = 0;
            let row = 0;
            if (this._layoutMode === MODE_FIXED_COLS) {
                col = i % limit;
                row = Math.floor(i / limit);
            } else {
                row = i % limit;
                col = Math.floor(i / limit);
            }

            child.x = offsetX + col * w;
            child.y = offsetY + row * h;
        }
    }

    public addItem(item: Container) {
        const container = this.getContainer();
        if (container) {
            container.addChild(item);
            this.arrange();
        } else {
            console.warn('[Grid] Target container not found for addItem');
        }
    }

    onRemove() {
        this._container = null;
        super.onRemove();
    }

    /// #if EDITOR
    __afterDeserialization() {
        if (typeof (super['__afterDeserialization'] as any) === 'function') {
            (super['__afterDeserialization'] as any)();
        }
        this._container = null;
        setTimeout(() => {
            this.arrange();
        }, 0);
    }
    /// #endif
}

/// #if EDITOR
Grid.__EDITOR_icon = 'tree/tileGrid';
/// #endif