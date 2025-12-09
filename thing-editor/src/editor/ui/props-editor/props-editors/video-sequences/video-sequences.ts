import { h, type ClassAttributes } from 'preact';
import R from 'thing-editor/src/editor/preact-fabrics';
import fs, { AssetType } from 'thing-editor/src/editor/fs';
import copyTextByClick from 'thing-editor/src/editor/utils/copy-text-by-click';
import { scrollInToView } from 'thing-editor/src/editor/utils/scroll-in-view';
import shakeDomElement from 'thing-editor/src/editor/utils/shake-element';
import sp from 'thing-editor/src/editor/utils/stop-propagation';
import assert from 'thing-editor/src/engine/debug/assert';
import game from 'thing-editor/src/engine/game';
import Lib from 'thing-editor/src/engine/lib';
import type { VideoSequenceItemAction, VideoSequence, VideoSequenceItem } from 'thing-editor/src/engine/lib/assets/src/extended/video-movie-clip.c';
import VideoMovieClip from 'thing-editor/src/engine/lib/assets/src/extended/video-movie-clip.c';
import callByPath, { getCallbackIcon } from 'thing-editor/src/engine/utils/get-value-by-path';
import { CTRL_READABLE } from 'thing-editor/src/engine/utils/utils';
import ComponentDebounced from '../../../component-debounced';
import showContextMenu from '../../../context-menu';
import LabelsLogger from '../../../labels-logger';
import CallbackEditor from '../call-back-editor';
import NumberEditor from '../number-editor';
import { getWindowElement } from '../timeline/timeline';

const labelItemNameProps = {
	className: 'selectable-text class-name',
	title: CTRL_READABLE + '+click to copy name',
	onMouseDown: copyTextByClick
};

const BODY_MARGIN = 10;
const FRAME_WIDTH = 3;

const sequenceWrapperProps = {
	className: 'video-sequence-wrapper'
};

const sequencesListBlockProps = {
	className: 'video-sequence-headers'
};

const sequencePropsEditorProps = {
	className: 'video-sequence-item-props-editor',
};

const loopPointProps = {
	className: 'video-sequence-item-loop',
};

const actionsContainerProps = {
	className: 'video-sequences-actions-body'
};

const propsFieldsProps = { className: 'props-field' };

const sortActionsByTime = (a: VideoSequenceItemAction, b: VideoSequenceItemAction) => {
	return a.t - b.t;
};

interface VideoSequencesProps extends ClassAttributes<VideoSequences> {
	onCloseClick: () => void;
	videoClip: VideoMovieClip;
}

interface VideoSequencesState {

}

const actionTimePointer = R.div({
	className: 'video-sequence-action-time-pointer'
});

let instance: VideoSequences | undefined;

let actionY = 0;
let lastActionTime = -10;

export default class VideoSequences extends ComponentDebounced<VideoSequencesProps, VideoSequencesState> {

	previewVideoElement?: HTMLVideoElement;
	previewVideoRef?: HTMLVideoElement;
	isPreviewPlaying = false;
	isPreviewLoop = false;

	constructor(props: VideoSequencesProps) {
		super(props);
		this.onAddClick = this.onAddClick.bind(this);
		this.renderSequenceLabel = this.renderSequenceLabel.bind(this);
		this.renderSequenceItem = this.renderSequenceItem.bind(this);
		this.onMouseDown = this.onMouseDown.bind(this);
		this.onMouseMove = this.onMouseMove.bind(this);
		this.addItemClick = this.addItemClick.bind(this);
		this.setPreviewVideoRef = this.setPreviewVideoRef.bind(this);
		this.sequenceBodyProps = {
			onMouseDown: this.onMouseDown,
			className: 'video-sequence-body'
		};
		this.setActiveSequence(this.activeSequenceName);
	}

	componentDidMount(): void {
		instance = this;
	}

	setPreviewVideoRef(el: HTMLVideoElement | null) {
		if (el) {
			this.previewVideoRef = el;
		}
	}

	async loadPreviewVideo(item: VideoSequenceItem) {
		if (!this.previewVideoRef) return;

		// Dispose previous video
		if (this.previewVideoElement && this.previewVideoElement !== this.previewVideoRef) {
			this.previewVideoElement.pause();
			this.previewVideoElement.src = '';
		}

		this.previewVideoElement = this.previewVideoRef;

		// Determine source path
		let src = item.videoSrc;

		// If absolute path (starts with /), use directly
		if (src.startsWith('/')) {
			// Already absolute, use as-is
		} else {
			// Get file info for relative paths
			const videoFile = fs.getFileByAssetName(src, AssetType.VIDEO);
			if (!videoFile) {
				console.warn('Video file not found:', src);
				return;
			}
			src = videoFile.fileName;
			if (!src.startsWith('/')) {
				src = '/' + src;
			}
		}

		this.previewVideoElement.muted = true;
		this.previewVideoElement.src = src;

		return new Promise<void>((resolve, reject) => {
			const onCanPlay = async () => {
				try {
					if (this.previewVideoElement) {
						await this.previewVideoElement.play();
						this.previewVideoElement.pause();
						this.updatePreviewFrame(item, this.currentTime);
					}
					resolve();
				} catch (e) {
					console.warn('Failed to play preview video:', e);
					reject(e);
				}
			};

			const onError = (e: Event) => {
				console.warn('Failed to load preview video:', src);
				reject(e);
			};

			this.previewVideoElement!.addEventListener('canplaythrough', onCanPlay, { once: true });
			this.previewVideoElement!.addEventListener('error', onError, { once: true });
			this.previewVideoElement!.load();
		});
	}

	updatePreviewFrame(item: VideoSequenceItem, frameTime: number) {
		if (!this.previewVideoElement || !this.previewVideoElement.duration) return;

		const speed = item.speed || 1;
		const seekTime = (frameTime / (this.videoClip._fps || 30)) * speed;
		const clampedTime = Math.max(0, Math.min(seekTime, this.previewVideoElement.duration - 0.001));

		this.previewVideoElement.currentTime = clampedTime;
	}

	togglePreviewPlay = () => {
		if (!this.previewVideoElement) return;

		if (this.isPreviewPlaying) {
			this.previewVideoElement.pause();
			this.previewVideoElement.removeEventListener('timeupdate', this.onPreviewTimeUpdate);
			this.isPreviewPlaying = false;
		} else {
			// Set currentTime based on timeline position (red line)
			if (this.activeSequenceItem && this._currentItemAtTimeline === this.activeSequenceItem) {
				this.updatePreviewFrame(this.activeSequenceItem, this._currentLocalFrame);
			}
			// Apply playback speed
			const speed = this.activeSequenceItem?.speed || 1;
			this.previewVideoElement.playbackRate = speed;
			this.previewVideoElement.loop = this.isPreviewLoop;
			this.previewVideoElement.addEventListener('timeupdate', this.onPreviewTimeUpdate);
			this.previewVideoElement.play().catch(e => {
				console.warn('Failed to play preview:', e);
			});
			this.isPreviewPlaying = true;
		}
		this.refresh();
	};

	onPreviewTimeUpdate = () => {
		if (!this.previewVideoElement || !this.activeSequenceItem || !this.isPreviewPlaying) return;

		// Convert video currentTime back to frame number
		const speed = this.activeSequenceItem.speed || 1;
		const fps = this.videoClip._fps || 30;
		const frameTime = Math.round((this.previewVideoElement.currentTime / speed) * fps);

		// Calculate timeline position (need to add offset for items before this one)
		let timelineOffset = 0;
		for (const item of this.activeSequence.s) {
			if (item === this.activeSequenceItem) {
				break;
			}
			timelineOffset += this.getItemDurationFrames(item);
		}

		this.currentTime = timelineOffset + frameTime;
		this._currentLocalFrame = frameTime;
		this.refresh();
	};

	togglePreviewLoop = () => {
		this.isPreviewLoop = !this.isPreviewLoop;
		if (this.previewVideoElement) {
			this.previewVideoElement.loop = this.isPreviewLoop;
		}
		this.refresh();
	};

	onPreviewEnded = () => {
		if (!this.isPreviewLoop) {
			this.isPreviewPlaying = false;
			this.previewVideoElement?.removeEventListener('timeupdate', this.onPreviewTimeUpdate);
			this.refresh();
		}
	};

	testCallback = () => {
		if (!this.activeSequenceAction?.a) {
			game.editor.ui.modal.showInfo('No callback selected. Select an action first.', 'No Callback');
			return;
		}
		const callback = this.activeSequenceAction.a;
		try {
			callByPath(callback, this.videoClip);
			console.log('Callback executed:', callback);
		} catch (e) {
			console.error('Failed to execute callback:', callback, e);
			game.editor.ui.modal.showInfo('Failed to execute callback: ' + callback + '\n\n' + e, 'Callback Error');
		}
	};

	onMouseDown(ev: MouseEvent) {
		const e = ev.target as HTMLDivElement;
		this.sequenceBody = e.classList.contains('video-sequence-body') ? e : e.closest('.video-sequence-body') as HTMLDivElement;
		window.addEventListener('mousemove', this.onMouseMove);
		this.onMouseMove(ev);
		this.setActiveItem(undefined);
		this.setActiveAction(undefined);
	}

	onMouseMove(ev: MouseEvent) {
		if (!ev.buttons) {
			window.removeEventListener('mousemove', this.onMouseMove);
			return;
		}
		const b = this.sequenceBody.getBoundingClientRect();

		let fullTimelineLength = 0;

		for (const item of this.activeSequence.s) {
			fullTimelineLength += this.getItemDurationFrames(item);
		}

		const scrollLimit = fullTimelineLength * FRAME_WIDTH + 60 - this.sequenceBody.offsetWidth;

		const mouseX = ev.x - b.x - BODY_MARGIN;

		if (mouseX < 40 && this.sequenceBody.scrollLeft > 0) {
			this.sequenceBody.scrollLeft = Math.max(this.sequenceBody.scrollLeft - 20, 0);
		} else if (mouseX > (this.sequenceBody.offsetWidth - 40) && this.sequenceBody.scrollLeft < scrollLimit) {
			this.sequenceBody.scrollLeft = Math.min(this.sequenceBody.scrollLeft + 20, scrollLimit);
		}

		let time = Math.max(0, Math.round((mouseX + this.sequenceBody.scrollLeft) / FRAME_WIDTH));
		this.setCurrentTime(time);
	}

	sequenceBody!: HTMLDivElement;

	sequenceBodyProps: any;

	setVideoViewFrame(item: VideoSequenceItem, time: number) {
		if (item.___videoElement && item.___videoTexture) {
			const speed = item.speed || 1;
			const seekTime = (time / (this.videoClip._fps || 30)) * speed;
			item.___videoElement.currentTime = Math.max(
				0,
				Math.min(seekTime, item.___videoElement.duration - 0.001)
			);
		}
	}

	setCurrentTime(time: number) {
		this.currentTime = time;
		let localTime = time;
		for (const item of this.activeSequence.s) {
			const itemTime = this.getItemDurationFrames(item);
			if (localTime <= itemTime) {
				this.setVideoViewFrame(item, localTime);
				// Also update preview video if it's for the same item
				if (item === this.activeSequenceItem) {
					this.updatePreviewFrame(item, localTime);
				}
				// Store current item and local frame for playback
				this._currentItemAtTimeline = item;
				this._currentLocalFrame = localTime;
				break;
			} else {
				localTime -= itemTime;
			}
		}
		this.refresh();
	}

	// Track current position for playback from timeline
	private _currentItemAtTimeline?: VideoSequenceItem;
	private _currentLocalFrame = 0;

	currentTime = 0;

	componentWillUnmount(): void {
		instance = undefined;
		window.removeEventListener('mousemove', this.onMouseMove);
		if (this.previewVideoElement) {
			this.previewVideoElement.pause();
			this.previewVideoElement.src = '';
			this.previewVideoElement = undefined;
		}
		this.isPreviewPlaying = false;
	}

	askForSequenceName(defaultText = '') {
		return game.editor.ui.modal.showPrompt('Enter sequence label', defaultText, undefined, (val: string) => {
			return this.sequences.find(s => s.n === val) ? 'Sequence with label "' + val + '" already exists' : '';
		}, false, false, Array.from(LabelsLogger.allLabels));
	}

	onAutoSelect(selectPath: string[]) {
		if (this.videoClip.sequences) {
			this.setActiveSequence(this.videoClip.sequences[parseInt(selectPath[1])].n);
			if (selectPath[2]) {
				this.setActiveItem(this.activeSequence.s[parseInt(selectPath[2])]);
			}
			if (selectPath[3]) {
				this.setActiveAction(this.activeSequenceItem?.actions![parseInt(selectPath[3])]);
			}

			getWindowElement('#sequence-item-' + selectPath[1] + '-' + selectPath[2], '#video-sequence').then(() => {
				getWindowElement('.video-sequence-item-wrapper', '#video-sequence').then((itemView: HTMLDivElement) => {
					shakeDomElement(itemView);
				});
			});
		}
	}

	static onAutoSelect(selectPath: string[]) {
		for (let o of game.editor.selection as any as VideoMovieClip[]) {
			if (o.sequences) {
				instance?.onAutoSelect(selectPath);
			}
		}
	}

	async onAddClick() {
		const name = await this.askForSequenceName();
		if (!name) {
			return;
		}
		if (!this.videoClip.sequences) {
			this.videoClip.sequences = [];
		}
		this.sequences.push({
			n: name,
			s: []
		});
		this.setActiveSequence(name);
		this.invalidate();
	}

	async addItemClick() {
		const videoPath = await game.editor.chooseAsset(AssetType.VIDEO, 'Select video for sequence item');

		if (videoPath) {
			const item: VideoSequenceItem = {
				videoSrc: videoPath
			};
			this.activeSequence.s.push(item);
			this.setActiveItem(item);
			this.invalidate();
		}
	}

	invalidate(saveImmediately = false) {
		if (this.activeSequenceItem?.actions) {
			this.activeSequenceItem?.actions.sort(sortActionsByTime);
		}
		Lib.__invalidateSerializationCache(this.videoClip);
		game.editor.sceneModified(saveImmediately);
		this.refresh();
	}

	getItemDurationFrames(item: VideoSequenceItem): number {
		return item.___duration || 0;
	}

	renderSequenceLabel(sequence: VideoSequence) {
		const isActive = sequence.n === this.activeSequence.n;
		const isPlaying = !game.__EDITOR_mode && (sequence.s.includes(this.videoClip.playingSequenceItem!));
		let className = isActive ? 'video-sequence-header video-sequence-header-active' : 'video-sequence-header clickable';
		if (isPlaying) {
			className += ' video-sequence-header-playing';
		}

		return R.div({
			className,
			title: CTRL_READABLE + '+click to copy label`s name',
			onMouseDown: () => {
				this.setActiveSequence(sequence.n);
				this.refresh();
			},
			onContextMenu: (ev: PointerEvent) => {
				sp(ev);
				showContextMenu([
					{
						name: 'Rename...',
						onClick: async () => {
							const name = await this.askForSequenceName(sequence.n);
							if (name) {
								sequence.n = name;
								this.invalidate();
							}
						}
					}, {
						name: R.fragment(R.icon('delete'), 'Delete sequence "' + sequence.n + '"'),
						onClick: () => {
							this.sequences.splice(this.sequences.indexOf(sequence), 1);
							this.setActiveSequence(this.sequences[0]?.n);
							this.invalidate();
						}
					}
				], ev);
			},
		}, R.span(labelItemNameProps, sequence.n)
		);
	}

	get activeSequenceName(): string {
		return (this.videoClip as any).__activeEditorSequence!;
	}

	_activeSequence!: VideoSequence;

	set activeSequence(s: VideoSequence) {
		this._activeSequence = s;
	}

	get activeSequence(): VideoSequence {
		return this.videoClip.playingSequence || this._activeSequence;
	}

	setActiveSequence(name?: string) {
		const isChanged = this.activeSequence?.n !== name;
		if (isChanged) {
			this.currentTime = 0;
		}
		this.activeSequence = this.sequences.find(s => s.n === name)!;
		if (!this.activeSequence) {
			this.activeSequence = this.sequences[0];
			name = this.activeSequence?.n;
		}
		if (this.activeSequence) {
			if (this.activeSequenceName !== name) {
				(this.videoClip as any).__activeEditorSequence = name;
			}
			if (isChanged) {
				this.activeSequenceItem = this.activeSequence.s.find(i => i.videoSrc === this.activeSequence.___activeItemName);
				this.activeSequenceAction = this.activeSequenceItem?.actions?.find((_a, i) => i === this.activeSequence.___activeActionId);
			}
		}
		this.refresh();
	}

	get activeSequenceItemName(): string {
		return this.activeSequence.___activeItemName!;
	}

	activeSequenceItem?: VideoSequenceItem;
	activeSequenceAction?: VideoSequenceItemAction;

	setActiveItem(item?: VideoSequenceItem) {
		// Stop current preview if playing
		if (this.isPreviewPlaying && this.previewVideoElement) {
			this.previewVideoElement.pause();
			this.isPreviewPlaying = false;
		}
		this.activeSequenceItem = item;
		this.activeSequence.___activeItemName = item ? item.videoSrc : '';
		this.setActiveAction();
		if (item && item.videoSrc) {
			this.loadPreviewVideo(item);
		}
		this.refresh();
	}

	setActiveAction(action?: VideoSequenceItemAction) {
		this.activeSequenceAction = action;
		if (action) {
			this.activeSequence.___activeActionId = this.activeSequenceItem!.actions!.indexOf(action);
			this.setVideoViewFrame(this.activeSequenceItem!, action.t);
			this.updatePreviewFrame(this.activeSequenceItem!, action.t);
		} else {
			this.activeSequence.___activeActionId = -1;
		}
		this.refresh(() => {
			const e = document.querySelector('.video-sequence-item-props-editor .props-editor-callback') as HTMLInputElement;
			if (e) {
				shakeDomElement(e);
			}
		});
	}

	renderSequenceItem(item: VideoSequenceItem, itemId: number) {

		actionY = 0;
		lastActionTime = -10;

		const duration = this.getItemDurationFrames(item);

		let className = 'video-sequence-item';
		// Check if video file exists in project
		const videoFile = fs.getFileByAssetName(item.videoSrc, AssetType.VIDEO);
		if (!item.videoSrc || !videoFile) {
			className += ' video-sequence-item-invalid';
		}
		const isActive = this.activeSequenceItem === item;
		if (isActive && !this.activeSequenceAction) {
			className += ' video-sequence-item-active';
		} else {
			className += ' clickable';
		}

		const isLoop = (this.activeSequence.l === itemId) ?
			R.div(loopPointProps, 'loop') :
			undefined;

		let playMarker;
		if (item === this.videoClip.playingSequenceItem && this.videoClip.itemLocalFrame >= 0) {
			playMarker = R.div({
				className: 'timeline-play-indicator',
				style: { left: this.videoClip.itemLocalFrame * FRAME_WIDTH }
			});
		}

		const width = duration * FRAME_WIDTH;
		const id = 'sequence-item-' + this.videoClip.sequences!.indexOf(this.activeSequence) + '-' + itemId;

		if (isActive) {
			setTimeout(() => {
				const e = window.document.querySelector('#' + id) as HTMLDivElement;
				if (e) {
					scrollInToView(e);
				}
			}, 20);
		}

		const actions = item.actions ?
			R.div(actionsContainerProps, item.actions.map((action: VideoSequenceItemAction) => {

				let className = 'video-sequence-action';
				if (action === this.activeSequenceAction) {
					className += ' video-sequence-action-active';
				}
				if (!action.a) {
					className += ' video-sequence-action-empty';
				}

				if (lastActionTime >= (action.t - 3)) {
					actionY += 20;
				} else {
					actionY = 0;
					lastActionTime = action.t;
				}

				return R.div({
					className,
					style: {
						left: action.t * FRAME_WIDTH,
						top: actionY
					},
					onContextMenu: () => {
						const actions = this.activeSequenceItem?.actions!;
						actions.splice(actions.indexOf(action), 1);
						if (!actions.length) {
							delete this.activeSequenceItem?.actions;
						}
						this.setActiveAction();
						this.invalidate();
					},
					onMouseDown: (ev: PointerEvent) => {
						sp(ev);
						if (ev.altKey) {
							action = JSON.parse(JSON.stringify(action));
							item.actions?.push(action);
						}
						this.setActiveItem(item);
						this.setActiveAction(action);

						const startTime = action.t;
						const startX = game.editor.mouseX;
						const dragTimeout = () => {
							if (!game.mouse.click) {
								return;
							}

							const dragToTime = startTime + (game.editor.mouseX - startX) / FRAME_WIDTH;
							const time = Math.round(Math.max(0, Math.min(this.maxActiveActionTime(), dragToTime)));
							if (this.activeSequenceAction?.t !== time) {
								this.activeSequenceAction!.t = time;
								this.setVideoViewFrame(this.activeSequenceItem!, time);
								this.updatePreviewFrame(this.activeSequenceItem!, time);
								this.invalidate();
							}
							setTimeout(dragTimeout, 30);
						};
						setTimeout(dragTimeout, 30);
					}
				}, getCallbackIcon(action.a, this.videoClip), actionTimePointer);
			})) : undefined;

		const videoFileName = item.videoSrc.split('/').pop() || item.videoSrc;

		return R.div(
			{
				className: 'video-sequence-item-wrapper',
				style: {
					width
				}
			},
			R.div({
				id,
				onMouseDown: (ev: MouseEvent) => {
					sp(ev);
					this.setActiveItem(item);

					let startX = game.editor.mouseX;
					const dragTimeout = () => {
						if (!game.mouse.click) {
							return;
						}
						const d = game.editor.mouseX - startX;
						if (d < (Math.min(width / -2, -60))) {
							if (this.moveItemLeft()) {
								startX = game.editor.mouseX;
							}
						} else if (d > (Math.max(width / 2, 60))) {
							if (this.moveItemRight()) {
								startX = game.editor.mouseX;
							}
						}
						setTimeout(dragTimeout, 100);
					};
					setTimeout(dragTimeout, 100);
				},
				onContextMenu: (ev: PointerEvent) => this.onItemContextMenu(ev, item),
				title: 'Drag left right to change item priority. Video: ' + item.videoSrc,
				className,

			},
				isLoop,
				playMarker,
				R.span({
					className: 'video-sequence-item-name',
					style: { left: 0 },
				}, videoFileName, ' (', duration, 'f)')
			),
			actions);
	}

	onItemContextMenu(ev: PointerEvent, item: VideoSequenceItem) {
		const clickedTime = Math.round(ev.offsetX / FRAME_WIDTH);
		this.setVideoViewFrame(item, clickedTime);
		sp(ev);
		showContextMenu([{
			name: 'Add event callback',
			onClick: () => {
				if (!item.actions) {
					item.actions = [];
				}
				const action = {
					t: clickedTime,
					a: '' as CallBackPath
				};
				item.actions?.push(action);
				this.setActiveAction(action);
				this.invalidate();
			}
		}, {
			name: R.fragment(R.icon('delete'), 'Delete item "' + item.videoSrc + '"'),
			onClick: () => {
				this.activeSequence.s.splice(this.activeSequence.s.indexOf(item), 1);
				if (item === this.activeSequenceItem) {
					this.setActiveItem();
				}
				this.invalidate();
			}
		}], ev);
	}


	moveItemLeft() {
		assert(this.activeSequenceItem, 'No sequence item selected.');
		const items = this.activeSequence.s;
		const i = items.indexOf(this.activeSequenceItem!);
		if (i > 0) {
			const tmp = items[i - 1];
			items[i - 1] = items[i];
			items[i] = tmp;
			this.invalidate();
			return true;
		}
	}

	moveItemRight() {
		assert(this.activeSequenceItem, 'No sequence item selected.');
		const items = this.activeSequence.s;
		const i = items.indexOf(this.activeSequenceItem!);
		if (i >= 0 && i < items.length - 1) {
			const tmp = items[i + 1];
			items[i + 1] = items[i];
			items[i] = tmp;
			this.invalidate();
			return true;
		}
	}

	maxActiveActionTime() {
		return this.getItemDurationFrames(this.activeSequenceItem!);
	}

	renderSequenceItemPropsEditor() {
		if (!this.activeSequence) {
			return undefined;
		}

		let additionalProps;

		if (this.activeSequenceAction) {
			const timeValue = this.activeSequenceAction.t;
			additionalProps = R.fragment(
				'Action time: ',
				h(NumberEditor, {
					value: timeValue,
					min: 0,
					max: this.maxActiveActionTime(),
					onChange: (time) => {
						this.activeSequenceAction!.t = time;
						this.setVideoViewFrame(this.activeSequenceItem!, time);
						this.updatePreviewFrame(this.activeSequenceItem!, time);
						this.invalidate();
					}
				}),
				'Action callback: ',
				h(CallbackEditor, {
					value: this.activeSequenceAction.a || null,
					onChange: (val: string | InputEvent) => {
						if (val && (val as InputEvent).target) {
							val = ((val as InputEvent).target as HTMLInputElement).value;
						}
						this.activeSequenceAction!.a = val as CallBackPath;
						this.invalidate();
					},
					title: ' ' + this.activeSequenceAction.a
				}),
				R.btn('▶ Test Callback', this.testCallback, 'Execute this callback on the video clip', 'tool-button')
			);

		} else {

			const speedValue = this.activeSequenceItem?.hasOwnProperty('speed') ? this.activeSequenceItem?.speed : 1;

			additionalProps = R.fragment(
				this.activeSequenceItem ? R.fragment(
					R.div(propsFieldsProps,
						R.div({ className: 'props-label' }, 'Video Source:'),
						R.div({ className: 'props-wrapper' },
							R.btn(this.activeSequenceItemName || '. . .', () => {
								game.editor.chooseAsset(AssetType.VIDEO, 'Select video', this.activeSequenceItemName).then((selectedVideo) => {
									if (selectedVideo) {
										this.activeSequenceItem!.videoSrc = selectedVideo;
										this.activeSequence.___activeItemName = selectedVideo;
										// Clear cached data to force reload
										delete this.activeSequenceItem!.___videoElement;
										delete this.activeSequenceItem!.___videoTexture;
										delete this.activeSequenceItem!.___duration;
										this.invalidate();
									}
								});
							}, undefined, 'choose-asset-button'),
							this.activeSequenceItemName ? R.btn(R.icon('reject'), () => {
								this.activeSequenceItem!.videoSrc = '';
								this.activeSequence.___activeItemName = '';
								// Clear cached data
								delete this.activeSequenceItem!.___videoElement;
								delete this.activeSequenceItem!.___videoTexture;
								delete this.activeSequenceItem!.___duration;
								this.invalidate();
							}, 'Clear', 'tool-button') : undefined
						)),
					R.div({ className: 'props-field' },
						R.div({ className: 'props-label' }, 'Speed:'),
						R.div({ className: 'props-wrapper' },
							h(NumberEditor, {
								value: speedValue,
								min: 0,
								step: 0.01,
								onChange: (val) => {
									if (val !== 1) {
										this.activeSequenceItem!.speed = val;
									} else {
										delete this.activeSequenceItem!.speed;
									}
									// Clear duration to force recalculation
									delete this.activeSequenceItem!.___duration;
									this.invalidate();
								}
							}))),
				) : undefined
			);
		}

		const loopValue = this.activeSequence.hasOwnProperty('l') ? this.activeSequence.l : -1;

		const videoPreview = this.activeSequenceItem ? R.div(
			{ style: { marginBottom: '10px', textAlign: 'center' } },
			R.div({ style: { marginBottom: '5px', fontSize: '12px', color: '#999' } }, 'Video Preview:'),
			h('video', {
				ref: this.setPreviewVideoRef,
				style: {
					width: '100%',
					maxWidth: '300px',
					border: '1px solid #444',
					borderRadius: '4px',
					backgroundColor: '#000'
				},
				controls: false,
				playsInline: true,
				muted: true,
				loop: this.isPreviewLoop,
				onEnded: this.onPreviewEnded
			}),
			// Preview controls
			R.div({ style: { marginTop: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' } },
				R.btn(
					this.isPreviewPlaying ? '⏸ Pause' : '▶ Play',
					this.togglePreviewPlay,
					'Play/Pause preview',
					'tool-button'
				),
				R.label({ style: { display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' } },
					h('input', {
						type: 'checkbox',
						checked: this.isPreviewLoop,
						onChange: this.togglePreviewLoop,
						style: { cursor: 'pointer' }
					}),
					'Loop'
				)
			)
		) : undefined;

		return R.div(sequencePropsEditorProps,
			'Loop item (-1 to disable): ',
			h(NumberEditor, {
				value: loopValue,
				min: -1,
				max: this.activeSequence.s.length - 1,
				onChange: (val) => {
					if (val >= 0) {
						this.activeSequence.l = val;
					} else {
						delete this.activeSequence.l;
					}
					this.invalidate();
				}
			}),
			R.hr(),
			additionalProps,
			videoPreview ? R.hr() : undefined,
			videoPreview
		);
	}

	get sequences(): VideoSequence[] {
		return (game.editor.selection[0] as VideoMovieClip)?.sequences || [];
	}

	get videoClip(): VideoMovieClip {
		return this.props.videoClip;
	}

	render() {
		const selected = game.editor.selection[0];
		if (!selected || selected.constructor.name !== 'VideoMovieClip') {
			return 'No VideoMovieClip element selected.';
		}

		this.setActiveSequence(this.activeSequenceName);

		let sequenceView;
		if (this.activeSequence) {

			const timeMarker = R.div(
				{
					className: 'time-marker',
					style: { left: this.currentTime * FRAME_WIDTH + BODY_MARGIN }
				},
				R.div({ className: 'time-marker-v-line' }),
				R.div({ className: 'time-marker-label' },
					R.b(null, this.currentTime),
					R.span({ className: 'time-marker-label' }, ' frames (' + (this.currentTime / 60).toFixed(2) + ' seconds)')
				)
			);

			sequenceView = R.div(this.sequenceBodyProps,
				this.activeSequence?.s.length ?
					this.activeSequence?.s.map(this.renderSequenceItem) :
					R.div({ className: 'video-sequence-item semi-transparent', style: { width: 340 } }, R.div({ className: 'video-sequence-item-name' }, 'Empty sequence.')),
				R.btn('+', this.addItemClick, 'Add video item to sequence'),
				timeMarker
			);
		}

		return R.fragment(
			R.btn('×', this.props.onCloseClick, 'Hide timeline', 'close-window-btn', { key: 'Escape' }),
			R.div(sequenceWrapperProps,
				R.div(sequencesListBlockProps,
					this.sequences.map(this.renderSequenceLabel),
					R.btn('+', this.onAddClick, 'Add sequence')
				),
				sequenceView,
				this.renderSequenceItemPropsEditor()
			)
		);
	}
}
