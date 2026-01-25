import editable from 'thing-editor/src/editor/props-editor/editable';
import Container from "thing-editor/src/engine/lib/assets/src/basic/container.c";
import { Graphics } from 'pixi.js';
import game from "thing-editor/src/engine/game";

export default class ScreenFlashEffect extends Container {

    @editable({ type: 'number', min: 0, max: 1, default: 0.5, step: 0.05, tip: 'Normal hit flash alpha' })
    private _normalFlashAlpha: number = 0.5;

    @editable({ type: 'number', min: 0, max: 1, default: 0.85, step: 0.05, tip: 'Critical hit flash alpha' })
    private _criticalFlashAlpha: number = 0.85;

    @editable({ type: 'number', min: 10, max: 200, default: 60, step: 10, tip: 'Fade in duration (ms)' })
    private _fadeInDuration: number = 60;

    @editable({ type: 'number', min: 50, max: 500, default: 180, step: 10, tip: 'Fade out duration (ms)' })
    private _fadeOutDuration: number = 180;

    @editable({ type: 'number', default: 0xFFFFFF, tip: 'Normal hit flash color (white)' })
    private _normalFlashColor: number = 0xFFFFFF;

    @editable({ type: 'number', default: 0xFF4444, tip: 'Critical hit flash color (red)' })
    private _criticalFlashColor: number = 0xFF4444;

    @editable({ type: 'number', default: 2000, tip: 'Flash overlay width' })
    private _overlayWidth: number = 2000;

    @editable({ type: 'number', default: 2000, tip: 'Flash overlay height' })
    private _overlayHeight: number = 2000;

    private _flashGraphics: Graphics | null = null;
    private _isFlashing: boolean = false;
    private _flashPhase: 'fadeIn' | 'fadeOut' | 'idle' = 'idle';
    private _flashProgress: number = 0;
    private _targetAlpha: number = 0;
    private _currentColor: number = 0xFFFFFF;

    init() {
        super.init();
        this._resetState();
        this._createFlashGraphics();
    }

    private _resetState(): void {
        this._isFlashing = false;
        this._flashPhase = 'idle';
        this._flashProgress = 0;
        this._targetAlpha = 0;
        this._currentColor = 0xFFFFFF;
    }

    private _createFlashGraphics(): void {
        if (this._flashGraphics) {
            if (this._flashGraphics.parent) {
                this._flashGraphics.parent.removeChild(this._flashGraphics);
            }
            this._flashGraphics.destroy();
            this._flashGraphics = null;
        }

        this._flashGraphics = new Graphics();

        (this._flashGraphics as any)._thing_initialized = true;
        (this._flashGraphics as any).onRemove = () => {};
        (this._flashGraphics as any).__nodeExtendData = { constructorCalled: true };

        this._drawFlashRect(this._normalFlashColor);
        this._flashGraphics.alpha = 0;
        this._flashGraphics.visible = false;
        this.addChild(this._flashGraphics);
    }

    private _drawFlashRect(color: number): void {
        if (!this._flashGraphics) return;

        this._flashGraphics.clear();
        this._flashGraphics.beginFill(color);
        this._flashGraphics.drawRect(
            -this._overlayWidth / 2,
            -this._overlayHeight / 2,
            this._overlayWidth,
            this._overlayHeight
        );
        this._flashGraphics.endFill();
    }

    update() {
        super.update();

        if (!this._isFlashing || !this._flashGraphics) return;

        const dt = game.pixiApp.ticker.deltaMS;

        if (this._flashPhase === 'fadeIn') {
            this._flashProgress += dt / this._fadeInDuration;
            if (this._flashProgress >= 1) {
                this._flashProgress = 1;
                this._flashPhase = 'fadeOut';
            }
            this._flashGraphics.alpha = this._easeOutQuad(this._flashProgress) * this._targetAlpha;
        } else if (this._flashPhase === 'fadeOut') {
            this._flashProgress -= dt / this._fadeOutDuration;
            if (this._flashProgress <= 0) {
                this._flashProgress = 0;
                this._flashPhase = 'idle';
                this._isFlashing = false;
                this._flashGraphics.visible = false;
            }
            this._flashGraphics.alpha = this._easeInQuad(this._flashProgress) * this._targetAlpha;
        }
    }

    private _easeOutQuad(t: number): number {
        return 1 - (1 - t) * (1 - t);
    }

    private _easeInQuad(t: number): number {
        return t * t;
    }

    public triggerFlash(isCritical: boolean = false): void {
        if (!this._flashGraphics) return;

        this._isFlashing = true;
        this._flashPhase = 'fadeIn';
        this._flashProgress = 0;

        if (isCritical) {
            this._targetAlpha = this._criticalFlashAlpha;
            this._currentColor = this._criticalFlashColor;
        } else {
            this._targetAlpha = this._normalFlashAlpha;
            this._currentColor = this._normalFlashColor;
        }

        this._drawFlashRect(this._currentColor);
        this._flashGraphics.visible = true;
        this._flashGraphics.alpha = 0;
    }

    public triggerNormalFlash(): void {
        this.triggerFlash(false);
    }

    public triggerCriticalFlash(): void {
        this.triggerFlash(true);
    }

    public reset(): void {
        this._isFlashing = false;
        this._flashPhase = 'idle';
        this._flashProgress = 0;

        if (this._flashGraphics) {
            this._flashGraphics.alpha = 0;
            this._flashGraphics.visible = false;
        }
    }

    onRemove() {
        this.reset();
        if (this._flashGraphics) {
            if (this._flashGraphics.parent) {
                this._flashGraphics.parent.removeChild(this._flashGraphics);
            }
            this._flashGraphics.destroy();
            this._flashGraphics = null;
        }
        super.onRemove();
    }
}

/// #if EDITOR
ScreenFlashEffect.__EDITOR_icon = 'tree/effect';
/// #endif
