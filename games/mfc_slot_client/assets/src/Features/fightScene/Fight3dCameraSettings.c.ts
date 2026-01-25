import Container from "thing-editor/src/engine/lib/assets/src/basic/container.c";
import editable from "thing-editor/src/editor/props-editor/editable";
import { threejsManagementService } from "../shared/services/ThreejsManagementService";
import game from "thing-editor/src/engine/game";

const DEG_TO_RAD = Math.PI / 180;

export default class Fight3dCameraSettings extends Container {

    private readonly BASE_CAMERA_Z = 1000;

    @editable({ type: 'number', min: 1, default: 1000, step: 10, tip: 'Camera distance from orbit center' })
    private _cameraZ: number = 1000;

    @editable({ type: 'number', min: 1, max: 179, default: 70, step: 1, tip: 'Camera field of view' })
    private _cameraFov: number = 70;

    @editable({ type: 'number', min: -360, max: 360, default: 0, step: 1, tip: 'Camera rotation X' })
    private _cameraRotationX: number = 0;

    @editable({ type: 'number', min: -360, max: 360, default: 0, step: 1, tip: 'Camera rotation Z' })
    private _cameraRotationZ: number = 0;

    @editable({ type: 'number', step: 0.1, min: -360, max: 360, default: -20, tip: 'Orbit angle around center on Y axis (degrees). 0 = default position, 180 = opposite side' })
    private _orbitAngle: number = -20;

    @editable({ type: 'number', default: 0, step: 1, tip: 'Orbit Center X' })
    private _orbitCenterX: number = 0;

    @editable({ type: 'number', default: 0, step: 1, tip: 'Orbit Center Y' })
    private _orbitCenterY: number = 0;

    @editable({ type: 'number', default: 0, step: 1, tip: 'Orbit Center Z' })
    private _orbitCenterZ: number = 0;

    // Dramatic effect state
    private _baseCameraZ: number = 1000;
    private _zoomOffset: number = 0;
    private _targetZoomOffset: number = 0;
    private _zoomSpeed: number = 0.08;
    private _isSlowMo: boolean = false;
    private _slowMoEndTime: number = 0;
    private _originalTickerSpeed: number = 1;

    init() {
        super.init();
        this._baseCameraZ = this._cameraZ;
        this._zoomOffset = 0;
        this._targetZoomOffset = 0;
        this._isSlowMo = false;
        this.applySettings();
    }

    update() {
        super.update();
        this._updateDramaticEffects();
        this.applySettings();
    }

    private _updateDramaticEffects(): void {
        // Smooth zoom lerp
        const diff = this._targetZoomOffset - this._zoomOffset;
        if (Math.abs(diff) > 1) {
            this._zoomOffset += diff * this._zoomSpeed;
        } else {
            this._zoomOffset = this._targetZoomOffset;
        }

        // Check slow mo end
        if (this._isSlowMo && performance.now() >= this._slowMoEndTime) {
            this._endSlowMo();
        }
    }

    public triggerDramaticZoom(zoomAmount: number = 150, durationMs: number = 1500): void {
        this._targetZoomOffset = zoomAmount;
        setTimeout(() => {
            this._targetZoomOffset = 0;
        }, durationMs);
    }

    public triggerSlowMo(speedFactor: number = 0.3, durationMs: number = 1000): void {
        if (this._isSlowMo) return;
        this._isSlowMo = true;
        this._originalTickerSpeed = game.pixiApp.ticker.speed;
        this._slowMoEndTime = performance.now() + durationMs;
        game.pixiApp.ticker.speed = speedFactor;
    }

    private _endSlowMo(): void {
        this._isSlowMo = false;
        game.pixiApp.ticker.speed = this._originalTickerSpeed;
    }

    public triggerFinishingBlow(zoomAmount: number = 200, slowMoSpeed: number = 0.25, durationMs: number = 1200): void {
        this.triggerDramaticZoom(zoomAmount, durationMs);
        this.triggerSlowMo(slowMoSpeed, durationMs);
    }

    onRemove() {
        if (this._isSlowMo) {
            this._endSlowMo();
        }
        super.onRemove();
    }

    public getPerspectiveScale(): number {
        return this.BASE_CAMERA_Z / this._cameraZ;
    }

    private applySettings() {
        const angleRad = this._orbitAngle * DEG_TO_RAD;
        const radius = this._cameraZ - this._zoomOffset;

        const cameraX = this._orbitCenterX + Math.sin(angleRad) * radius;
        const cameraZ = this._orbitCenterZ + Math.cos(angleRad) * radius;
        const cameraY = this._orbitCenterY;

        threejsManagementService.setCameraOrbit(
            this._cameraFov,
            cameraX,
            cameraY,
            cameraZ,
            this._orbitCenterX,
            this._orbitCenterY,
            this._orbitCenterZ,
            this._cameraRotationX,
            this._cameraRotationZ
        );
    }
}

