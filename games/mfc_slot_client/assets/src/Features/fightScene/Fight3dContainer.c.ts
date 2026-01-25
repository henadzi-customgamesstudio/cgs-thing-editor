import editable from "thing-editor/src/editor/props-editor/editable";
import Container from "thing-editor/src/engine/lib/assets/src/basic/container.c";
import Lib, { constructRecursive } from "thing-editor/src/engine/lib";
import ScriptBattleRooster3D from "./roosters/ScriptBattleRooster3D.c";
import getValueByPath from "thing-editor/src/engine/utils/get-value-by-path";
import AsyncHelpers from "../../core/async-helpers";
import ScoreboardContainer from "./uiComponents/ScoreboardContainer.c";
import { fightDataService } from "../../modules/fight/services/FightDataService";
import { configService } from "../../modules/configs/services/ConfigService";
import { FightScriptStep } from "../../modules/fight/types/FightData";
import FightUiContainer from "./uiComponents/FightUiContainer.c";
import game from "thing-editor/src/engine/game";
import Rooster3DPositionContainer from "./Rooster3DPositionContainer.c";

export default class Fight3dContainer extends Container {
    @editable({ arrayProperty: true, type: 'data-path', important: true, tip: 'Spawn points for 2-rooster fights (Player, Enemy)' })
    public spawnPointPaths2: string[] = [];
    @editable({ arrayProperty: true, type: 'data-path', important: true, tip: 'Spawn points for 3-rooster fights (Player, Enemy, Middle)' })
    public spawnPointPaths3: string[] = [];
    @editable({ arrayProperty: true, type: 'data-path', important: true, tip: 'Spawn points for 4-rooster fights' })
    public spawnPointPaths4: string[] = [];
    @editable({ type: 'data-path', important: true })
    private scoreboardContainerPath: string = '';
    @editable({ type: 'data-path', important: true })
    private fightUiContainerPath: string = '';

    private _spawnPoints: Rooster3DPositionContainer[] = [];
    private _roosters: Map<string, ScriptBattleRooster3D> = new Map();
    private _roosterToSpawnIndex: Map<string, number> = new Map();
    private _deadRoosters: Set<string> = new Set();
    @editable({ type: 'ref' })
    private _scoreboardContainer: ScoreboardContainer | null = null;
    @editable({ type: 'ref' })
    private _fightUiContainer: FightUiContainer | null = null;

    constructor() {
        super();
    }

    init() {
        super.init();
        fightDataService.setFightNone();
        fightDataService.setFightSceneStateNone();
        const paths = this.getSpawnPointPathsForFighterCount();
        this._spawnPoints = paths.map(path => getValueByPath(path, this) as Rooster3DPositionContainer).filter(Boolean);
        this._scoreboardContainer = getValueByPath(this.scoreboardContainerPath, this) as ScoreboardContainer;
        this._fightUiContainer = getValueByPath(this.fightUiContainerPath, this) as FightUiContainer;
        this.initializeBattleAsync();
    }

    private getSpawnPointPathsForFighterCount(): string[] {
        const fighterCount = fightDataService.fightData?.fighters.length ?? 3;
        switch (fighterCount) {
            case 2: return this.spawnPointPaths2;
            case 4: return this.spawnPointPaths4;
            case 3:
            default: return this.spawnPointPaths3;
        }
    }

    private async initializeBattleAsync() {
        await AsyncHelpers.waitFrames(3);
        this.spawnRoosters();
        this.initializeRoosterScoreboard();
        await this.startBattleAfterDelay();
    }

    private spawnRoosters() {
        const fighters = fightDataService.fightData?.fighters || [];
        const spawnPoints = this._spawnPoints;

        fighters.forEach((fighterData, index) => {
            if (index >= spawnPoints.length || !spawnPoints[index]) return;

            const spawnPoint = spawnPoints[index]!;
            const prefabPath = fighterData.rooster.content.prefabPath;
            const rooster = (Lib as any).loadPrefab(prefabPath, true) as ScriptBattleRooster3D;

            rooster.x = 0;
            rooster.y = 0;

            this.applySpawnSettings(rooster, spawnPoint);

            if (!game.__EDITOR_mode) {
                constructRecursive(rooster);
            }

            spawnPoint.addChild(rooster);
            this._roosters.set(fighterData.animationStringId, rooster);
            this._roosterToSpawnIndex.set(fighterData.animationStringId, spawnPoint.getIndex);

            rooster.on('hit-impact', this._onHitImpact, this);
        });
    }

    private _onHitImpact(data: { damage: number; isBoosted: boolean; isDeathBlow: boolean }): void {
        const isCritical = data.damage > 1000;
        const screenFlash = game.currentContainer?.findChildByName('ScreenFlashEffect') as any;

        if (screenFlash?.triggerFlash) {
            screenFlash.triggerFlash(isCritical || data.isDeathBlow);
        }

        if (data.isDeathBlow) {
            const cameraSettings = this.findChildByName('CameraSettings') as any;
            if (cameraSettings?.triggerFinishingBlow) {
                cameraSettings.triggerFinishingBlow(180, 0.3, 1500);
            }
        }
    }

    private applySpawnSettings(rooster: ScriptBattleRooster3D, spawnPoint: Rooster3DPositionContainer) {
        const rotation = spawnPoint.spawnRotation;
        const offset = spawnPoint.spawnOffset;

        rooster.modelRotationX = rotation.x;
        rooster.modelRotationY = rotation.y;
        rooster.modelRotationZ = rotation.z;

        rooster.modelOffsetX = offset.x;
        rooster.modelOffsetY = offset.y;
        rooster.modelOffsetZ = offset.z;
    }

    private initializeRoosterScoreboard() {
        const selectedData = fightDataService.selectedRoosterData;
        const enemyData = fightDataService.enemyRoostersData;

        if (selectedData && this._scoreboardContainer) {
            const enemiesCount = enemyData.length;
            this._scoreboardContainer.updateContent(enemiesCount);

            this._scoreboardContainer.updateCurrentRooster(
                selectedData.rooster.content.avatarImage,
                selectedData.multiplier
            );

            if (enemyData.length > 0) {
                this._scoreboardContainer.updateEnemyRoosters(
                    enemyData.map(e => ({ imagePath: e.rooster.content.avatarImage }))
                );
            }
        }
    }

    private async startBattleAfterDelay(): Promise<void> {
        const battleStartDelayMs = configService.getFightConfig().timings.battleStartDelayMs || 1000;
        await AsyncHelpers.wait(battleStartDelayMs);
        if (this._thing_initialized) {
            this.executeFightScript();
        }
    }

    private async executeFightScript() {
        if (!fightDataService.fightData || !fightDataService.fightData.script || fightDataService.fightData.script.length === 0) {
            console.warn('[Fight3dContainer] No fight script available, falling back to idle');
            const idleAnim = configService.getFightConfig().animations.defaultIdleAnimation || 'IDLE';
            this._roosters.forEach(r => r.playScriptedAnimation(idleAnim, true));
            return;
        }

        const turnDelayMs = configService.getFightConfig().timings.turnDelayMs || 500;
        const idleAnim = configService.getFightConfig().animations.defaultIdleAnimation || 'IDLE';
        const script = fightDataService.fightData.script;

        this._deadRoosters.clear();
        this._roosters.forEach(r => r.activateScriptedBattle());
        await AsyncHelpers.wait(500);

        fightDataService.setFightSceneStateFirstStep();

        let roosterPromises: Map<string, Promise<void>> = new Map();
        this._roosters.forEach((_, id) => roosterPromises.set(id, Promise.resolve()));

        for (let i = 0; i < script.length; i++) {
            if (i === 1) {
                fightDataService.setFightSceneStateFight();
            }
            if (!this._thing_initialized) return;

            const step = script[i];
            const isLastStep = i === script.length - 1;
            const isSecondToLastStep = i === script.length - 2;
            const stepPromises: Promise<void>[] = [];

            this._roosters.forEach((rooster, id) => {
                if (this._deadRoosters.has(id)) return;

                const animName = step.animations[id];
                const currentPromise = roosterPromises.get(id) || Promise.resolve();

                if (isLastStep) {
                    if (animName) {
                        const newPromise = currentPromise.then(() => {
                            this.setupDamageState(step);
                            this.rotateRoosterToFinalPosition(id, rooster);
                            rooster.playScriptedAnimation(animName, true);
                        });
                        roosterPromises.set(id, newPromise);
                    }
                } else {
                    stepPromises.push(currentPromise);
                }
            });

            if (!isLastStep) {
                await Promise.all(stepPromises);
                this.setupDamageState(step);

                const newStepPromises: Promise<void>[] = [];
                this._roosters.forEach((rooster, id) => {
                    if (this._deadRoosters.has(id)) return;

                    const animName = step.animations[id];
                    if (animName) {
                        const p = rooster.playScriptedAnimationAndWait(animName).then(() => {
                            if (!this._thing_initialized) return;
                            if (step.deadRooster === id) {
                                this._deadRoosters.add(id);
                                return;
                            }
                            if (!isSecondToLastStep && !this._deadRoosters.has(id)) {
                                rooster.playScriptedAnimation(idleAnim, true);
                            }
                        });
                        roosterPromises.set(id, p);
                        newStepPromises.push(p);
                    } else {
                        roosterPromises.set(id, Promise.resolve());
                    }
                });

                if (step.deadRooster) {
                    this._deadRoosters.add(step.deadRooster);
                }

                await Promise.all(newStepPromises);

                if (i < script.length - 1) {
                    await AsyncHelpers.wait(turnDelayMs);
                }
            }
        }

        await Promise.all(Array.from(roosterPromises.values()));
        await this.handleFightEnd();
    }

    private setupDamageState(step: FightScriptStep): void {
        this._roosters.forEach(r => {
            r.setPendingDamage(0);
            r.setIsAttackMiss(false);
        });

        if (step.damage?.target) {
            const targetId = step.damage.target;
            const damageValue = step.damage.value;
            const isMiss = damageValue === -1;
            const useBooster = step.damage.useBooster ?? false;

            this.applyDamageEffects(targetId, damageValue, isMiss, useBooster);

            const targetRooster = this._roosters.get(targetId);
            const isDeathBlow = step.deadRooster === targetId;
            if (targetRooster) {
                targetRooster.setPendingDamage(damageValue, useBooster, isDeathBlow);
            }

            let attackerId: string | null = null;
            let attackerRooster: ScriptBattleRooster3D | null = null;
            for (const [id, rooster] of this._roosters) {
                if (id !== targetId && step.animations[id]) {
                    attackerId = id;
                    attackerRooster = rooster;
                    break;
                }
            }

            this.rotateRoostersToFaceEachOther(attackerId, targetId, attackerRooster, targetRooster);

            if (isMiss && attackerRooster) {
                attackerRooster.setIsAttackMiss(true, () => {
                    if (targetRooster) {
                        targetRooster.applyDamage(-1);
                    }
                });
            }
        }
    }

    private applyDamageEffects(targetId: string, damageValue: number, isMiss: boolean, useBooster: boolean): void {
        const isCritical = damageValue > 1000;

        const targetRooster = this._roosters.get(targetId);
        if (!targetRooster) return;

        const effectsContainer = this.findChildByName('ImpactEffectsSystem') as any;
        const comboSystem = this.findChildByName('ComboSystem') as any;
        const cinematicEffects = this.findChildByName('CinematicBattleEffects') as any;

        const comboCount = comboSystem?.onHit ? comboSystem.onHit() : 0;

        if (comboCount >= 2 && effectsContainer && targetRooster) {
            const impactPos = { x: targetRooster.x, y: targetRooster.y + 100 };
            if (typeof effectsContainer.spawnComboHit === 'function') {
                effectsContainer.spawnComboHit(comboCount, impactPos);
            }
        }

        if (isMiss) {
            if (effectsContainer && typeof effectsContainer.spawnMiss === 'function') {
                effectsContainer.spawnMiss({ x: 0, y: 100 });
            }
            return;
        }

        if (effectsContainer) {
            if (isCritical && typeof effectsContainer.spawnCriticalAttack === 'function') {
                effectsContainer.spawnCriticalAttack({ x: 0, y: 100 });
            } else if (typeof effectsContainer.spawnLightAttack === 'function') {
                effectsContainer.spawnLightAttack({ x: 0, y: 100 });
            }
        }

        if (cinematicEffects && typeof cinematicEffects.onDamage === 'function') {
            cinematicEffects.onDamage(isCritical);
        }
    }

    private rotateRoostersToFaceEachOther(
        attackerId: string | null,
        targetId: string,
        attackerRooster: ScriptBattleRooster3D | null,
        targetRooster: ScriptBattleRooster3D | null | undefined
    ): void {
        const attackerSpawnIndex = attackerId ? this._roosterToSpawnIndex.get(attackerId) : undefined;
        const targetSpawnIndex = this._roosterToSpawnIndex.get(targetId);

        if (attackerSpawnIndex === undefined || targetSpawnIndex === undefined) {
            return;
        }

        const attackerSpawnPoint = this._spawnPoints.find(sp => sp.getIndex === attackerSpawnIndex);
        const targetSpawnPoint = this._spawnPoints.find(sp => sp.getIndex === targetSpawnIndex);

        if (attackerRooster && attackerSpawnPoint) {
            const rotationY = attackerSpawnPoint.getRotationYForTarget(targetSpawnIndex);
            if (rotationY !== null) {
                attackerRooster.lerpRotationY(rotationY, attackerSpawnPoint.rotationLerpDuration);
            }
        }

        if (targetRooster && targetSpawnPoint) {
            const rotationY = targetSpawnPoint.getRotationYForTarget(attackerSpawnIndex);
            if (rotationY !== null) {
                targetRooster.lerpRotationY(rotationY, targetSpawnPoint.rotationLerpDuration);
            }
        }
    }

    private rotateRoosterToFinalPosition(roosterId: string, rooster: ScriptBattleRooster3D): void {
        const spawnIndex = this._roosterToSpawnIndex.get(roosterId);
        if (spawnIndex === undefined) return;

        const spawnPoint = this._spawnPoints.find(sp => sp.getIndex === spawnIndex);
        if (spawnPoint) {
            rooster.lerpRotationY(spawnPoint.finalStepRotationY, spawnPoint.finalStepLerpDuration);
        }
    }

    private async handleFightEnd() {
        fightDataService.setFightSceneStateEnd();

        const isPlayerWin = fightDataService.fightData?.win ?? false;

        const effectsContainer = this.findChildByName('CinematicBattleEffects') as any;
        const comboSystem = this.findChildByName('ComboSystem') as any;

        if (isPlayerWin) {
            if (effectsContainer && typeof effectsContainer.onWin === 'function') {
                effectsContainer.onWin();
            }
            if (comboSystem && typeof comboSystem.reset === 'function') {
                comboSystem.reset();
            }
            fightDataService.setFightWin();
            const delayMs = configService.getFightConfig().timings.openWinPopupDelayMs || 0;
            if (delayMs > 0) {
                await AsyncHelpers.wait(delayMs);
            }
            if (this._thing_initialized && this._fightUiContainer) {
                this._fightUiContainer.openWinPopup();
            }
        } else {
            if (effectsContainer && typeof effectsContainer.onDeath === 'function') {
                effectsContainer.onDeath();
            }
            if (comboSystem && typeof comboSystem.reset === 'function') {
                comboSystem.reset();
            }
            fightDataService.setFightFail();
            const delayMs = configService.getFightConfig().timings.openLosePopupDelayMs || 0;
            if (delayMs > 0) {
                await AsyncHelpers.wait(delayMs);
            }
            if (this._thing_initialized && this._fightUiContainer) {
                this._fightUiContainer.openLosePopup();
            }
        }
    }

    update() {
        super.update();
    }

    onRemove() {
        fightDataService.setFightNone();
        fightDataService.setFightSceneStateNone();
        this._spawnPoints = [];
        this._roosters.forEach(r => {
            r.off('hit-impact', this._onHitImpact, this);
            r.remove();
        });
        this._roosters.clear();
        this._roosterToSpawnIndex.clear();
        this._deadRoosters.clear();
        this._scoreboardContainer = null;
        this._fightUiContainer = null;
        super.onRemove();
    }
}

/// #if EDITOR
Fight3dContainer.__EDITOR_icon = 'tree/folder-open';
/// #endif