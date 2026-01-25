import BaseRooster3D from './BaseRooster3D.c';
import editable from 'thing-editor/src/editor/props-editor/editable';
import { ScriptedBehaviorState } from './RoosterStates';
import QuarksParticle3D from '../../shared/customComponents/particles/quarksParticles/QuarksParticle3D.c';
import getValueByPath from 'thing-editor/src/engine/utils/get-value-by-path';
import { configService } from '../../../modules/configs/services/ConfigService';
import { fightSceneLoaderService } from '../services/FightSceneLoaderService';
import game from 'thing-editor/src/engine/game';

export default class ScriptBattleRooster3D extends BaseRooster3D {

    /** Model configuration ID - references model ID in objects-3d-config.json */
    @editable({ type: 'string', important: true, tip: 'Model ID from objects-3d-config.json (e.g., rooster_id_1)' })
    public modelConfigId: string = '';

    /** Effect type identifiers - full GLTF event names (e.g., Event_Attack_L, Event_Attack_M, Event_Attack_H) */
    @editable({ arrayProperty: true, type: 'string', tip: 'Full GLTF event names (Event_Attack_L, Event_Attack_M, Event_Attack_H)' })
    private effectIds: string[] = [];

    /** DataPaths to particle effects, must match effectIds by index */
    @editable({ arrayProperty: true, type: 'data-path', tip: 'Paths to QuarksParticle3D effects' })
    private effectPaths: string[] = [];

    /** Map of effect ID to DataPath for runtime lookup */
    private _effectMap: Map<string, string> = new Map();
    private _pendingDamage: number = 0;
    private _currentDamageIsBoosted: boolean = false;
    private _isDeathBlow: boolean = false;
    private _firedEvents: Set<string> = new Set();
    private _scriptedState: ScriptedBehaviorState | null = null;
    private _eventFrameMap: { [key: string]: number } = {};
    private _currentLogicalAnimationName: string = '';
    private _isAttackMiss: boolean = false;

    // Rotation lerp state
    private _rotationLerpActive: boolean = false;
    private _rotationLerpStartY: number = 0;
    private _rotationLerpTargetY: number = 0;
    private _rotationLerpElapsed: number = 0;
    private _rotationLerpDuration: number = 0;

    init() {
        super.init();
        this.syncRotationToChildren = true;
        // Auto-load model if modelConfigId is set (for prefab-based usage)
        if (this.modelConfigId) {
            this.initModelAsync();
        }
    }

    /**
     * Async model initialization - waits for assets to load before loading model.
     * Works in both editor and runtime mode.
     */
    private async initModelAsync(): Promise<void> {
        // In editor mode or when assets aren't preloaded, wait for them
        if (game.__EDITOR_mode || !fightSceneLoaderService.areAssetsPreloaded()) {
            await fightSceneLoaderService.preloadFightAssets(0);
        }

        if (this._thing_initialized && this.modelConfigId) {
            this.initModel(this.modelConfigId);
        }
    }

    private _onMissCallback: (() => void) | null = null;

    public setIsAttackMiss(isMiss: boolean, onMissCallback?: () => void) {
        this._isAttackMiss = isMiss;
        this._onMissCallback = onMissCallback || null;
    }

    public lerpRotationY(targetRotationY: number, durationSeconds: number): void {
        if (durationSeconds <= 0) {
            this.modelRotationY = targetRotationY;
            this._rotationLerpActive = false;
            return;
        }
        this._rotationLerpActive = true;
        this._rotationLerpStartY = this.modelRotationY;
        this._rotationLerpTargetY = targetRotationY;
        this._rotationLerpElapsed = 0;
        this._rotationLerpDuration = durationSeconds;
    }

    public applyDamage(amount: number, isBoosted: boolean = false): void {
        this.showDamage(amount, isBoosted);
    }

    public setPendingDamage(amount: number, isBoosted: boolean = false, isDeathBlow: boolean = false) {
        this._pendingDamage = amount;
        this._currentDamageIsBoosted = isBoosted;
        this._isDeathBlow = isDeathBlow;
    }

    public activateScriptedBattle(): ScriptedBehaviorState {
        this._scriptedState = new ScriptedBehaviorState(this);
        this._scriptedState.enter();
        return this._scriptedState;
    }

    public playScriptedAnimation(animationName: string, loop: boolean = false): void {
        this._currentLogicalAnimationName = animationName;
        this._firedEvents.clear();
        if (this._scriptedState) {
            this._scriptedState.playAnimation(animationName, loop);
        } else {
            this.playAnimation(animationName, loop);
        }
    }

    public playScriptedAnimationAndWait(animationName: string): Promise<void> {
        this._currentLogicalAnimationName = animationName;
        this._firedEvents.clear();
        if (this._scriptedState) {
            return this._scriptedState.playAnimation(animationName, false);
        } else {
            return this.playAnimationAndWait(animationName);
        }
    }

    public update() {
        super.update();
        this._updateRotationLerp();
        if (this.currentAction) {
            this._checkAnimationEvents();
        }
    }

    private _updateRotationLerp(): void {
        if (!this._rotationLerpActive) return;

        const deltaMs = game.pixiApp.ticker.deltaMS;
        this._rotationLerpElapsed += deltaMs / 1000;

        if (this._rotationLerpElapsed >= this._rotationLerpDuration) {
            this.modelRotationY = this._rotationLerpTargetY;
            this._rotationLerpActive = false;
        } else {
            const t = this._rotationLerpElapsed / this._rotationLerpDuration;
            // Smooth easing (easeInOutQuad)
            const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
            this.modelRotationY = this._rotationLerpStartY + (this._rotationLerpTargetY - this._rotationLerpStartY) * eased;
        }
    }

    protected onModelLoaded() {
        this._parseAnimationEvents();
        this._buildEffectMap();
        super.onModelLoaded();
    }

    /** Build a lookup map from effectIds to effectPaths */
    private _buildEffectMap() {
        this._effectMap.clear();
        const minLength = Math.min(this.effectIds.length, this.effectPaths.length);
        for (let i = 0; i < minLength; i++) {
            const id = this.effectIds[i];
            const path = this.effectPaths[i];
            if (id && path) {
                this._effectMap.set(id, path);
            }
        }
    }

    private _parseAnimationEvents() {
        this._eventFrameMap = {};
        if (this.model) {
            this.model.traverse((child) => {
                if (child.userData) {
                    for (const key in child.userData) {
                        if (key.startsWith('Event_') && typeof child.userData[key] === 'number') {
                            this._eventFrameMap[key] = child.userData[key];
                        }
                    }
                }
            });
        }
    }

    private _checkAnimationEvents() {
        const config = configService.getFightConfig().animations;

        let validEvents: string[] = [];
        if (this._currentLogicalAnimationName && config && config.animationToEvents[this._currentLogicalAnimationName]) {
            validEvents = config.animationToEvents[this._currentLogicalAnimationName];
        }

        for (const eventName of validEvents) {
            if (this._eventFrameMap.hasOwnProperty(eventName)) {
                if (!this._firedEvents.has(eventName)) {
                    const targetFrame = this._eventFrameMap[eventName];
                    if (this.getCurrentFrameIndex() >= targetFrame) {
                        this._firedEvents.add(eventName);
                        this.emit('animation-event', eventName);
                        this._handleEvent(eventName);
                    }
                }
            }
        }
    }

    private _handleEvent(eventName: string) {
        // Handle hit reaction events
        if (eventName.includes('Hit_Reaction')) {
            if (this._pendingDamage != 0) {
                this.applyDamage(this._pendingDamage, this._currentDamageIsBoosted);
                this.emit('hit-impact', {
                    damage: this._pendingDamage,
                    isBoosted: this._currentDamageIsBoosted,
                    isDeathBlow: this._isDeathBlow
                });
                this._pendingDamage = 0;
                this._currentDamageIsBoosted = false;
                this._isDeathBlow = false;
            }
            return;
        }

        // Handle any effect event registered in effectIds/effectPaths
        if (this._effectMap.has(eventName)) {
            this._playEffect(eventName);
        }
    }

    private _playEffect(eventName: string) {
        if (this._isAttackMiss) {
            if (this._onMissCallback) {
                this._onMissCallback();
                this._onMissCallback = null;
            }
            return;
        }

        const path = this._effectMap.get(eventName);
        if (!path) {
            return;
        }

        const particle = getValueByPath(path, this) as QuarksParticle3D;
        if (particle && typeof particle.restart === 'function') {
            particle.restart();
        } else {
            console.warn(`[ScriptBattleRooster3D] Effect not found for '${eventName}' at path: ${path}. Got:`, particle);
        }
    }

    onRemove() {
        if (this._scriptedState) {
            this._scriptedState.exit();
            this._scriptedState = null;
        }
        super.onRemove();
    }
}

/// #if EDITOR
ScriptBattleRooster3D.__EDITOR_icon = 'tree/model';
/// #endif
