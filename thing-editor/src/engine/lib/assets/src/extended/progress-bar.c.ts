import type { DisplayObject, Sprite } from 'pixi.js';
import { Container, NineSlicePlane, Point } from 'pixi.js';
import editable from 'thing-editor/src/editor/props-editor/editable';
import game from 'thing-editor/src/engine/game';
import Shape from 'thing-editor/src/engine/lib/assets/src/extended/shape.c';

import callByPath from 'thing-editor/src/engine/utils/call-by-path';
import getValueByPath, { setValueByPath } from 'thing-editor/src/engine/utils/get-value-by-path';
import { stepTo } from 'thing-editor/src/engine/utils/utils';

const tmpPoint = new Point();

const VERTICAL = 'vertical';
const HORIZONTAL = 'horizontal';

function setObjectDimension(node: DisplayObject, size: number, isHorizontal: boolean) {
	if (node instanceof Shape || node instanceof NineSlicePlane) {
		if (isHorizontal) {
			node.width = size;
		} else {
			node.height = size;
		}
	} else if ((node as Sprite).texture) {
		if (isHorizontal) {
			node.scale.x = size / (node as Sprite).texture.width;
			if (game.classes.Fill && (node instanceof game.classes.Fill)) {
				(node as any).xRepeat = node.scale.x;
			}
		} else {
			node.scale.y = size / (node as Sprite).texture.height;
			if (game.classes.Fill && (node instanceof game.classes.Fill)) {
				(node as any).yRepeat = node.scale.y;
			}
		}
	}
}

const TIP = `Contains string path to javascript variable to get value from.
As example path can be: <b>game.stage.height</b> or <b>this.parent.name</b>.
Supports <b>game</b>, <b>this</b> or Component's class name as root object.
Use '#' to access to child scene nodes by name: <b>game.currentScene.#myChildElementsName.x</b>.`;

export default class ProgressBar extends Container {

	@editable({ type: 'string', select: [{ name: 'Vertical', value: VERTICAL }, { name: 'Horizontal', value: HORIZONTAL }], default: VERTICAL, })
	orientation = VERTICAL;

	@editable({ name: 'width', type: 'number', min: 0, default: 200, visible: (o: ProgressBar) => o.orientation === HORIZONTAL })
	get width() { return this._progress_bar_width; }
	set width(v) {
		this._progress_bar_width = v;
		if (this.orientation === HORIZONTAL) {
			this.applyValue(this.showedVal || 0);
			this._applyBgDimension();
		}
	}

	@editable({ name: 'height', type: 'number', min: 0, default: 200, visible: (o: ProgressBar) => o.orientation === VERTICAL })
	get height() { return this._progress_bar_height; }
	set height(v) {
		this._progress_bar_height = v;
		if (this.orientation === VERTICAL) {
			this.applyValue(this.showedVal || 0);
			this._applyBgDimension();
		}
	}

	@editable({ type: 'data-path', important: true, tip: TIP })
	dataPath = null;

	@editable({ min: 0 })
	capMargin = 5;

	@editable({ min: 0 })
	refreshInterval = 10;

	@editable()
	reverse = false;

	@editable({ type: 'callback' })
	onFinish = null;

	@editable({ type: 'callback' })
	onChanged = null;

	@editable({ type: 'callback' })
	afterSlide = null;

	@editable({ step: 0.00001 })
	min = 0;

	@editable({ step: 0.00001 })
	max = 100;

	@editable({ step: 0.00001, min: 0 })
	step = 1;

	@editable()
	smooth = false;

	@editable({ min: 0.000000001, step: 0.001, visible: o => o.smooth })
	smoothStep = 0.01;

	@editable({ min: 0, tip: 'progress bar launches animations "progress-item-1", "progress-item-2", ... during the progress' })
	itemsCount = 6;

	calledItem = 0;

	@editable({ type: 'ref' })
	bar?: Container;

	@editable({ type: 'ref' })
	cap?: Container;

	scrolling = false;

	currentInterval = 0;

	@editable({ disabled: () => true, visible: () => !game.__EDITOR_mode, type: 'ref' })
	showedVal: any = undefined;

	isProgressFinished = true;

	private currentQ = 0;
	private targetQ = 0;

	private _progress_bar_width = 200;
	private _progress_bar_height = 200;

	init() {
		super.init();
		this.scrolling = false;
		this.currentInterval = 0;
		this.showedVal = undefined;
		this._initChildren();

		this.calledItem = 0;

		this.cursor = this.interactive ? 'pointer' : '';
		this.on('pointerdown', this.onDown);
		this._applyBgDimension();
		this.isProgressFinished = false;
	}

	_initChildren() {
		this.bar = this.findChildByName('bar');
		this.cap = this.findChildByName('cap');
	}

	private get currentLength(): number {
		return this.orientation === HORIZONTAL ? this._progress_bar_width : this._progress_bar_height;
	}

	_applyBgDimension() {
		const isHorizontal = this.orientation === HORIZONTAL;
		const length = this.currentLength;

		let h = this.getChildByName('bg');
		if (h) {
			setObjectDimension(h, length, isHorizontal);
		}

		const hitArea = this.findChildByName('hit-area');
		if (hitArea) {
			const offset = isHorizontal ? hitArea.x : hitArea.y;
			setObjectDimension(hitArea, length + offset * -2, isHorizontal);
		}
	}

	onRemove() {
		super.onRemove();
		this.currentQ = 0;
		this.showedVal = undefined;
		this.bar = undefined;
		this.cap = undefined;
		this.removeListener('pointerdown', this.onDown);
		this.isProgressFinished = true;
	}

	onDown() {
		if (this.isCanBePressed) {
			this.scrolling = true;
		}
	}

	isMin() {
		return this.showedVal === this.min;
	}

	isMax() {
		return this.showedVal === this.max;
	}

	update() {
		if (this.scrolling) {
			if (game.mouse.click) {
				let p = this.toLocal(game.mouse, game.stage, tmpPoint, true);

				let q = 0;
				if (this.orientation === HORIZONTAL) {
					q = p.x / this._progress_bar_width;
				} else {
					q = p.y / this._progress_bar_height;
				}

				if (q < 0) {
					q = 0;
				} else if (q > 1) {
					q = 1;
				}

				let val = this.min + q * (this.max - this.min);
				if (this.step > 0) {
					val = Math.round(val / this.step) * this.step;
				}
				this.applyValue(val);
				if (this.dataPath) {
					setValueByPath(this.dataPath, val, this);
				}
			} else {
				this.scrolling = false;
				if (this.afterSlide) {
					callByPath(this.afterSlide, this);
				}
			}
		} else if (this.currentInterval <= 0 && this.dataPath) {
			let val = getValueByPath(this.dataPath, this);
			if (val || val === 0) {
				if (val > this.max) {
					val = this.max;
				}
				if (val < this.min) {
					val = this.min;
				}
				if (val !== this.showedVal) {
					this.applyValue(val);
				}
			} else {
				this.showedVal = undefined;
			}
			this.currentInterval = this.refreshInterval;
		} else {
			this.currentInterval--;
		}
		if (this.smooth) {
			this.currentQ = stepTo(this.currentQ, this.targetQ, this.smoothStep);
			this.applyQ();
		}
		super.update();
	}

	applyValue(val: number) {
		if (val !== this.showedVal) {
			if (this.onChanged
				/// #if EDITOR
				&& !game.__EDITOR_mode
				/// #endif
			) {
				callByPath(this.onChanged, this);
			}
		}
		let q = (val - this.min) / (this.max - this.min);
		this.targetQ = q;
		if (typeof this.showedVal === 'undefined') {
			this.currentQ = q;
		}
		this.showedVal = val;

		if (!this.smooth) {
			this.currentQ = q;
			this.applyQ();
		}
	}

	applyQ() {
		if (this.onFinish && !this.isProgressFinished && this.currentQ === 1) {
			this.isProgressFinished = true;
			callByPath(this.onFinish, this);
		}
		const reachedItem = Math.floor(this.currentQ * this.itemsCount);
		while (reachedItem > this.calledItem) {
			this.calledItem++;
			this.gotoLabelRecursive('progress-item-' + this.calledItem);
		}

		/// #if EDITOR
		if (game.__EDITOR_mode) {
			this._initChildren();
		}
		/// #endif

		const q = this.reverse ? (1 - this.currentQ) : this.currentQ;
		const isHorizontal = this.orientation === HORIZONTAL;
		const length = this.currentLength;

		if (this.bar) {
			setObjectDimension(this.bar, length * q, isHorizontal);
		}

		if (this.cap) {
			const pos = this.capMargin + (length - this.capMargin * 2) * q;
			if (isHorizontal) {
				this.cap.x = pos;
			} else {
				this.cap.y = pos;
			}
		}

		/// #if EDITOR
		if (game.__EDITOR_mode) {
			this.bar = undefined;
			this.cap = undefined;
		}
		/// #endif
	}

	refreshNow() {
		this.currentInterval = 0;
	}

	/// #if EDITOR
	__beforeDeserialization() {
		this._progress_bar_height = 0;
		this._progress_bar_width = 0;
	}

	__afterDeserialization() {
		this._applyBgDimension();
	}
	/// #endif
}