import { Texture } from 'pixi.js';
import editable from 'thing-editor/src/editor/props-editor/editable';
import type { IGoToLabelConsumer } from 'thing-editor/src/editor/editor-env';
import assert from 'thing-editor/src/engine/debug/assert';
import Lib from 'thing-editor/src/engine/lib';
import DSprite from 'thing-editor/src/engine/lib/assets/src/basic/d-sprite.c';
import callByPath from 'thing-editor/src/engine/utils/call-by-path';



/**
 * VideoMovieClip - компонент для покадрового воспроизведения видео.
 *
 * Позволяет управлять видео как покадровой анимацией,
 * что идеально для использования с timeline редактора.
 *
 * Использование:
 * 1. Создайте объект VideoMovieClip
 * 2. Укажите путь к видео в свойстве videoSrc
 * 3. Управляйте свойством currentFrame через timeline или код
 */
export default class VideoMovieClip extends DSprite implements IGoToLabelConsumer {

    _videoElement: HTMLVideoElement | null = null;
    _videoTexture: Texture | null = null;

    _currentFrame = 0;
    _totalFrames = 0;
    _fps = 30;
    _duration = 0;
    _isVideoReady = false;
    _videoSrc = '';
    _pendingFrame: number | null = null;
    _sideBySideAlpha = false;

    // Sequences system
    __sequences?: VideoSequence[];
    _sequencesByNames!: Map<string, VideoSequence>;
    playingSequence?: VideoSequence;
    playingSequenceItem?: VideoSequenceItem;
    itemLocalFrame = 0;
    nextAction?: VideoSequenceItemAction;
    _goToLabelNextFrame: string | false = false;
    _sequenceTotalFrames = 0;

    /**
     * Зацикливать ли видео при достижении конца.
     */
    @editable({ default: false })
    loop = false;

    /**
     * Последовательность (label) для автоматического воспроизведения при инициализации.
     * Если пусто - ничего не воспроизводится автоматически.
     */
    @editable({ type: 'string', default: '' })
    defaultSequence = '';

    /**
     * Если true, видео содержит альфа-канал во второй (правой) половине кадра.
     */
    @editable({ default: false })
    get sideBySideAlpha(): boolean {
        return this._sideBySideAlpha;
    }

    set sideBySideAlpha(value: boolean) {
        this._sideBySideAlpha = value;
        if (this._videoTexture) {
            this._updateFilters();
        }
    }


    @editable({ type: 'number', min: 0, max: 16, step: 1, default: 0, title: 'Blend Mode' })
    get blend(): number {
        return this.blendMode;
    }

    set blend(val: number) {
        this.blendMode = val;
    }

    @editable({ type: 'string', important: true })
    get videoSrc(): string {
        return this._videoSrc;
    }

    set videoSrc(value: string) {
        if (this._videoSrc !== value) {
            this._videoSrc = value;
            if (value) {
                this._loadVideo();
            } else {
                this._disposeVideo();
            }
        }
    }

    @editable({ min: 1, max: 120, step: 1, default: 30 })
    get fps(): number {
        return this._fps;
    }

    set fps(value: number) {
        this._fps = value;
        this._recalculateTotalFrames();
    }

    /**
     * Текущий кадр видео. Анимируйте это свойство через timeline.
     */
    @editable({ min: 0, step: 1, default: 0 })
    get currentFrame(): number {
        return this._currentFrame;
    }

    set currentFrame(value: number) {
        value = Math.floor(value);

        if (this.playingSequence) {
            this._handleSequenceFrame(value);
        } else {
            this._handleSingleVideoFrame(value);
        }
    }

    /**
     * Общее количество кадров в видео (только чтение).
     */
    get totalFrames(): number {
        return this._totalFrames;
    }

    /**
     * Длительность видео в секундах (только чтение).
     */
    get duration(): number {
        return this._duration;
    }

    /**
     * Готово ли видео к воспроизведению.
     */
    get isVideoReady(): boolean {
        return this._isVideoReady;
    }

    init() {
        super.init();

        // Инициализация sequences
        this._initSequencesByName();

        // Priority: sequences > single video
        if (this.sequences && this.sequences.length > 0) {
            // Sequences mode - не загружаем одиночное видео
            // Если задан defaultSequence, переходим к нему
            if (this.defaultSequence && this.hasLabel(this.defaultSequence)) {
                this.gotoLabel(this.defaultSequence);
            }
            // Pre-load будет вызван при gotoLabel
        } else if (this._videoSrc) {
            // Single video mode
            this._loadVideo();
        }
    }

    @editable({ type: 'btn', title: 'Play', name: 'play', onClick: (o: any) => o.play() })
    play() {
        this.autoPlay = true;
    }

    @editable({ type: 'btn', title: 'Stop', name: 'stop', onClick: (o: any) => o.stop() })
    stop() {
        this.autoPlay = false;
    }

    _updateFilters() {
        // Для side-by-side alpha используем sprite mask подход
        // Это работает независимо от zoom
        if (this.sideBySideAlpha && this._isVideoReady && this._videoTexture) {
            this._setupSideBySideMask();
        } else {
            this._clearSideBySideMask();
        }

        this.filters = [];
    }

    _maskSprite: DSprite | null = null;

    _setupSideBySideMask() {
        if (!this._videoTexture) return;

        // Создаем спрайт-маску если ещё не создан
        if (!this._maskSprite) {
            this._maskSprite = new DSprite();

            // КРИТИЧНО: Помечаем объект всеми возможными флагами для thing-editor
            (this._maskSprite as any).___hidden = true;
            (this._maskSprite as any).__isHiddenForEditor = true;
            (this._maskSprite as any).__nodeExtendData = {
                hidden: true,
                isSerializable: false
            };
            (this._maskSprite as any).name = '___mask_internal';

            // Клонируем текстуру видео для маски
            const maskTexture = this._videoTexture.clone();
            this._maskSprite.texture = maskTexture;

            // Настраиваем UV координаты для маски (правая половина видео)
            const baseWidth = maskTexture.baseTexture.width;
            const baseHeight = maskTexture.baseTexture.height;

            // Маска берет правую половину
            maskTexture.frame.x = baseWidth / 2;
            maskTexture.frame.width = baseWidth / 2;
            maskTexture.frame.height = baseHeight;
            maskTexture.updateUvs();

            // Позиция 0,0 - маска следует за спрайтом автоматически как child
            this._maskSprite.x = 0;
            this._maskSprite.y = 0;

            // Добавляем как child - трансформация будет автоматической
            this.addChild(this._maskSprite);
        }

        // Настраиваем основную текстуру (левая половина для цвета)
        if (this.texture === this._videoTexture) {
            const baseWidth = this._videoTexture.baseTexture.width;
            const baseHeight = this._videoTexture.baseTexture.height;

            // Основной спрайт показывает левую половину
            this._videoTexture.frame.x = 0;
            this._videoTexture.frame.width = baseWidth / 2;
            this._videoTexture.frame.height = baseHeight;
            this._videoTexture.updateUvs();
        }

        // Применяем маску к основному спрайту
        this.mask = this._maskSprite;
    }

    // Переопределяем для thing-editor чтобы скрыть служебные объекты
    getChildrenForSerialization() {
        return this.children.filter(child => !(child as any).___hidden);
    }

    _clearSideBySideMask() {
        if (this._maskSprite) {
            this.removeChild(this._maskSprite);
            this._maskSprite.destroy();
            this._maskSprite = null;
        }

        this.mask = null;

        // Восстанавливаем полный frame для обычного видео
        if (this._videoTexture) {
            const baseWidth = this._videoTexture.baseTexture.width;
            const baseHeight = this._videoTexture.baseTexture.height;

            this._videoTexture.frame.x = 0;
            this._videoTexture.frame.width = baseWidth;
            this._videoTexture.frame.height = baseHeight;
            this._videoTexture.updateUvs();
        }
    }

    _loadVideo() {
        this._disposeVideo();

        if (!this._videoSrc) return;

        // Создаем video элемент
        const video = document.createElement('video');
        video.crossOrigin = 'anonymous';
        video.muted = true; // Мьютим для автовоспроизведения
        video.playsInline = true;
        video.preload = 'auto';
        video.autoplay = false; // Мы управляем воспроизведением сами

        // Формируем путь к видео
        let src = this._videoSrc;
        if (!src.startsWith('http') && !src.startsWith('/')) {
            // Lib.ASSETS_ROOT = "./assets/" для текущего проекта
            src = Lib.ASSETS_ROOT + src;
        }

        video.src = src;

        this._videoElement = video;

        // Ждем загрузки метаданных
        video.onloadedmetadata = () => {
            this._duration = video.duration;
            this._recalculateTotalFrames();
        };

        video.onerror = () => {
            console.error('VideoMovieClip: Ошибка загрузки видео:', src);
            console.warn('Убедитесь, что файл видео включен в сборку (например, находится в папке public или скопирован в dist/assets).');
        };

        // Ждем готовности первого кадра
        const onCanPlay = () => {
            if (!this._videoTexture && this._videoElement) {
                // Создаем текстуру из видео
                // Отключаем автовоспроизведение PIXI, так как мы управляем временем сами
                this._videoTexture = Texture.from(video, { resourceOptions: { autoPlay: false, updateFPS: 0 } });

                this.texture = this._videoTexture;

                this._isVideoReady = true;
                this._updateFilters();

                // Применяем настройки
                video.loop = this.loop;
                if (this._autoPlay) {
                    video.play().catch(e => console.warn('VideoMovieClip: Autoplay failed', e));
                } else {
                    video.pause();
                }

                // Если был запрошен кадр до загрузки видео
                if (this._pendingFrame !== null) {
                    this._seekToFrame(this._pendingFrame);
                    this._pendingFrame = null;
                } else {
                    if (!this._autoPlay) {
                        this._seekToFrame(this._currentFrame);
                    }
                }
            }
        };

        // Используем canplaythrough для более надежной загрузки, как в примере
        video.oncanplaythrough = onCanPlay;
        // На случай если canplaythrough уже сработал или не сработает (для надежности оставляем и oncanplay)
        video.oncanplay = onCanPlay;

        video.load();
    }

    _recalculateTotalFrames() {
        if (this._duration > 0) {
            this._totalFrames = Math.ceil(this._duration * this._fps);
        }
    }

    _seekToFrame(frame: number) {
        if (!this._videoElement || !this._isVideoReady) {
            this._pendingFrame = frame;
            return;
        }

        const time = frame / this._fps;

        // Клампим время к допустимому диапазону
        const clampedTime = Math.max(0, Math.min(time, this._duration - 0.001));

        if (Math.abs(this._videoElement.currentTime - clampedTime) > 0.001) {
            this._videoElement.currentTime = clampedTime;
        }
    }

    /**
     * Автоматически воспроизводить видео.
     */
    @editable({ default: false })
    get autoPlay(): boolean {
        return this._autoPlay;
    }

    set autoPlay(value: boolean) {
        this._autoPlay = value;
        if (this._videoElement) {
            if (value) {
                this._videoElement.play().catch(e => {
                    console.warn('VideoMovieClip: Autoplay failed', e);
                });
            } else {
                this._videoElement.pause();
            }
        }
    }

    _autoPlay = false;

    update() {
        // Обработка отложенного перехода к label
        if (this._goToLabelNextFrame && this._sequencesByNames) {
            const sequence = this._sequencesByNames.get(this._goToLabelNextFrame);
            if (sequence) {
                this._playSequence(sequence);
            }
            this._goToLabelNextFrame = false;
        }

        if (this._isVideoReady && this._videoElement) {
            if (this._autoPlay) {
                if (!this._videoElement.paused) {
                    this._currentFrame = this._videoElement.currentTime * this._fps;
                } else if (this._videoElement.ended && this.loop) {
                    this._videoElement.play();
                } else if (this._videoElement.paused && !this._videoElement.ended) {
                    // Автозапуск если видео готово, не паузится, и autoPlay включен
                    this._videoElement.play().catch(e => {
                        console.warn('VideoMovieClip: Auto-start playback failed', e);
                    });
                }
            }

            // Обновляем текстуру
            if (this._videoTexture) {
                this._videoTexture.update();

                // Если используется mask, обновляем и его текстуру
                if (this._maskSprite && this._maskSprite.texture) {
                    this._maskSprite.texture.update();
                }
            }
        }

        super.update();
    }

    private _disposeSequences() {
        if (this.sequences) {
            for (const sequence of this.sequences) {
                for (const item of sequence.s) {
                    if (item.___videoElement) {
                        item.___videoElement.pause();
                        item.___videoElement.removeAttribute('src');
                        item.___videoElement.load();
                        item.___videoElement = undefined;
                    }
                    if (item.___videoTexture) {
                        item.___videoTexture.destroy(true);
                        item.___videoTexture = undefined;
                    }
                }
            }
        }
        this.playingSequence = undefined;
        this.playingSequenceItem = undefined;
        this._sequencesByNames = undefined!;
    }

    onRemove() {
        this._clearSideBySideMask();
        this._disposeSequences();
        this._disposeVideo();
        super.onRemove();
    }

    _disposeVideo() {
        if (this._videoElement) {
            this._videoElement.pause();
            this._videoElement.removeAttribute('src');
            this._videoElement.load();
            this._videoElement.oncanplay = null;
            this._videoElement.oncanplaythrough = null;
            this._videoElement.onloadedmetadata = null;
            this._videoElement.onerror = null;
            this._videoElement = null;
        }

        if (this._videoTexture) {
            this.texture = Texture.EMPTY; // Избегаем рендера уничтоженной текстуры
            this._videoTexture.destroy(true);
            this._videoTexture = null;
        }

        this._isVideoReady = false;
        this._totalFrames = 0;
        this._duration = 0;
        this._updateFilters();
    }

    // Sequences system methods

    private _initSequencesByName() {
        if (this.sequences) {
            const names = new Map() as Map<string, VideoSequence>;
            for (const sequence of this.sequences) {
                names.set(sequence.n, sequence);
                // Связываем items через ___next
                for (let i = 0; i < sequence.s.length; i++) {
                    const item = sequence.s[i];
                    if (i < sequence.s.length - 1) {
                        item.___next = sequence.s[i + 1];
                    } else if (sequence.l !== undefined && sequence.l >= 0) {
                        item.___next = sequence.s[sequence.l];
                    }
                    // Связываем actions
                    if (item.actions) {
                        item.actions.sort((a, b) => a.t - b.t);
                        for (let j = 0; j < item.actions.length; j++) {
                            const action = item.actions[j];
                            action.___next = item.actions[j + 1];
                        }
                    }
                }
            }
            this._sequencesByNames = names;
        } else {
            this._sequencesByNames = new Map();
        }
    }

    private async _preloadSequence(sequence: VideoSequence) {
        for (const item of sequence.s) {
            await this._preloadVideoForItem(item);
        }
        // Вычисляем duration каждого item
        for (const item of sequence.s) {
            item.___duration = this._getItemDurationFrames(item);
        }
        // Вычисляем общую длину
        this._sequenceTotalFrames = sequence.s.reduce(
            (sum, item) => sum + (item.___duration || 0), 0
        );
    }

    private async _preloadVideoForItem(item: VideoSequenceItem): Promise<void> {
        if (item.___videoElement) return;

        return new Promise((resolve, reject) => {
            const video = document.createElement('video');
            video.crossOrigin = 'anonymous';
            video.muted = true;
            video.playsInline = true;
            video.preload = 'auto';
            video.autoplay = false;

            let src = item.videoSrc;
            if (!src.startsWith('http') && !src.startsWith('/')) {
                src = Lib.ASSETS_ROOT + src;
            }
            video.src = src;

            const onCanPlay = () => {
                const texture = Texture.from(video, {
                    resourceOptions: { autoPlay: false, updateFPS: 0 }
                });
                item.___videoElement = video;
                item.___videoTexture = texture;
                resolve();
            };

            video.addEventListener('canplaythrough', onCanPlay, { once: true });
            video.addEventListener('error', () => {
                console.error('VideoMovieClip: Failed to load video:', src);
                reject(new Error('Failed to load: ' + src));
            }, { once: true });
            video.load();
        });
    }

    private _getItemDurationFrames(item: VideoSequenceItem): number {
        if (!item.___videoElement) return 0;
        const duration = item.___videoElement.duration;
        const speed = item.speed || 1;
        return Math.ceil((duration * this._fps) / speed);
    }

    private _mapGlobalToLocal(globalFrame: number): { item?: VideoSequenceItem, localFrame: number } {
        if (!this.playingSequence) return { localFrame: 0 };

        let accumulatedFrames = 0;
        for (const item of this.playingSequence.s) {
            const itemDuration = item.___duration || 0;
            if (globalFrame < accumulatedFrames + itemDuration) {
                return { item, localFrame: globalFrame - accumulatedFrames };
            }
            accumulatedFrames += itemDuration;
        }

        // Fallback: последний item
        const lastItem = this.playingSequence.s[this.playingSequence.s.length - 1];
        return { item: lastItem, localFrame: (lastItem.___duration || 0) - 1 };
    }

    private _getFrameAtItemIndex(itemIndex: number): number {
        if (!this.playingSequence) return 0;
        let frame = 0;
        for (let i = 0; i < itemIndex && i < this.playingSequence.s.length; i++) {
            frame += this.playingSequence.s[i].___duration || 0;
        }
        return frame;
    }

    private _switchToItem(item: VideoSequenceItem) {
        if (item.___videoElement && item.___videoTexture) {
            this._videoElement = item.___videoElement;
            this._videoTexture = item.___videoTexture;
            this.texture = this._videoTexture;
            this._isVideoReady = true;

            // Очищаем маску чтобы она пересоздалась с новой текстурой
            this._clearSideBySideMask();
            this._updateFilters();
            this.playingSequenceItem = item;

            // Инициализация actions
            if (item.actions && item.actions.length > 0) {
                this.nextAction = item.actions[0];
            } else {
                this.nextAction = undefined;
            }
        }
    }

    private _seekItemToFrame(item: VideoSequenceItem, localFrame: number) {
        if (!item.___videoElement || !this._isVideoReady) return;

        const speed = item.speed || 1;
        const time = (localFrame / this._fps) * speed;
        const duration = item.___videoElement.duration;
        const clampedTime = Math.max(0, Math.min(time, duration - 0.001));

        if (Math.abs(item.___videoElement.currentTime - clampedTime) > 0.001) {
            item.___videoElement.currentTime = clampedTime;
        }
    }

    private _handleSequenceFrame(globalFrame: number) {
        // Обработка loop
        if (this._sequenceTotalFrames > 0 && globalFrame >= this._sequenceTotalFrames) {
            const loopIndex = this.playingSequence!.l;
            if (loopIndex !== undefined && loopIndex >= 0) {
                const loopStartFrame = this._getFrameAtItemIndex(loopIndex);
                const loopLength = this._sequenceTotalFrames - loopStartFrame;
                if (loopLength > 0) {
                    const relativeFrame = globalFrame - loopStartFrame;
                    globalFrame = loopStartFrame + (relativeFrame % loopLength);
                }
            } else {
                globalFrame = Math.max(0, this._sequenceTotalFrames - 1);
            }
        }

        this._currentFrame = globalFrame;

        // Находим item и localFrame
        const { item, localFrame } = this._mapGlobalToLocal(globalFrame);
        if (!item) return;

        // Переключаемся если нужно
        if (this.playingSequenceItem !== item) {
            this._switchToItem(item);
        }

        this.itemLocalFrame = localFrame;
        this._handleActions(localFrame);
        this._seekItemToFrame(item, localFrame);
    }

    private _handleSingleVideoFrame(value: number) {
        if (this._totalFrames > 0) {
            if (this.loop) {
                value = ((value % this._totalFrames) + this._totalFrames) % this._totalFrames;
            } else {
                value = Math.max(0, Math.min(value, this._totalFrames - 1));
            }
        }
        this._currentFrame = value;
        this._seekToFrame(value);
    }

    private _handleActions(localFrame: number) {
        if (!this.nextAction) return;

        // Выполняем все actions до текущего frame
        while (this.nextAction && this.nextAction.t <= localFrame) {
            callByPath(this.nextAction.a, this);
            if (!this.parent) return; // Удален во время callback
            this.nextAction = this.nextAction.___next;
        }
    }

    private _playSequence(sequence: VideoSequence) {
        this.playingSequence = sequence;

        // Pre-load если еще не загружен
        if (!sequence.s[0]?.___videoElement) {
            this._preloadSequence(sequence).then(() => {
                this.currentFrame = 0;
            }).catch(err => {
                console.error('VideoMovieClip: Failed to preload sequence:', err);
            });
        } else {
            this.currentFrame = 0;
        }
    }

    /**
     * Переход к определенному времени в секундах.
     */
    seekToTime(timeInSeconds: number) {
        const frame = Math.floor(timeInSeconds * this._fps);
        this.currentFrame = frame;
    }

    /**
     * Переход к определенному проценту видео (0-1).
     */
    seekToProgress(progress: number) {
        progress = Math.max(0, Math.min(1, progress));
        const frame = Math.floor(progress * (this._totalFrames - 1));
        this.currentFrame = frame;
    }

    // IGoToLabelConsumer methods

    gotoLabel(labelName: string) {
        assert(this.hasLabel(labelName), 'Label "' + labelName + '" not found in VideoMovieClip.', 99999);
        this._goToLabelNextFrame = labelName;
    }

    hasLabel(labelName: string): boolean {
        if (!this._sequencesByNames) {
            this._initSequencesByName();
        }
        return this._sequencesByNames.has(labelName);
    }

    gotoLabelRecursive(labelName: string): void {
        if (this.hasLabel(labelName)) {
            this.gotoLabel(labelName);
        }
        super.gotoLabelRecursive(labelName);
    }

    /// #if EDITOR
    __getLabels(): undefined | string[] {
        if (this.sequences) {
            return this.sequences.map(s => s.n);
        }
    }

    @editable({ type: 'video-sequence', name: 'sequences', default: [] })
    set sequences(val: VideoSequence[] | undefined) {
        if (val) {
            this.__sequences = JSON.parse(JSON.stringify(val));
        } else {
            this.__sequences = undefined;
        }
    }

    get sequences(): VideoSequence[] | undefined {
        return this.__sequences;
    }

    static __EDITOR_icon = 'tree/movie';
    /// #endif
}

/// #if EDITOR
import { decorateGotoLabelMethods } from 'thing-editor/src/editor/utils/goto-label-consumer';
decorateGotoLabelMethods(VideoMovieClip);
/// #endif

export interface VideoSequenceItemAction {
    /** callback path */
    a: CallBackPath;
    /** time (в frames относительно начала item) */
    t: number;
    /** runtime next action reference */
    ___next?: VideoSequenceItemAction;
}

export interface VideoSequenceItem {
    /** video source path */
    videoSrc: string;
    /** animation speed multiplier (default: 1) */
    speed?: number;
    /** actions (callbacks) at specific frames */
    actions?: VideoSequenceItemAction[];

    // Runtime cached data
    ___next?: VideoSequenceItem;
    ___duration?: number;
    ___videoElement?: HTMLVideoElement;
    ___videoTexture?: Texture;
}

export interface VideoSequence {
    /** sequence name (label) */
    n: string;
    /** sequence items */
    s: VideoSequenceItem[];
    /** loop sequence index (-1 или undefined = no loop) */
    l?: number;

    // Editor only
    ___activeItemName?: string;
    ___activeActionId?: number;
}
