import type { Container } from 'pixi.js';
import type { ClassAttributes } from 'preact';
import { Component, h } from 'preact';
import R from 'thing-editor/src/editor/preact-fabrics';
import game from 'thing-editor/src/engine/game';
import type VideoMovieClip from 'thing-editor/src/engine/lib/assets/src/extended/video-movie-clip.c';
import type { VideoSequence } from 'thing-editor/src/engine/lib/assets/src/extended/video-movie-clip.c';
import Window from '../../../editor-window';
import { hideAdditionalWindow, showAdditionalWindow } from '../../../ui';
import VideoSequences from './video-sequences';

interface VideoSequencesEditorState {
	toggled: boolean;
}

function bringTimelineForward() {
	Window.bringWindowForward('#propsEditor');
	Window.bringWindowForward('#video-sequence', true);
}

export default class VideoSequencesEditor extends Component<ClassAttributes<VideoSequencesEditor>, VideoSequencesEditorState> {

	constructor(props: ClassAttributes<VideoSequencesEditor>) {
		super(props);
		this.state = { toggled: game.editor.settings.getItem('video-timeline-showed', true) };
		this.onToggleClick = this.onToggleClick.bind(this);
	}

	static search(textToSearch:string, sequences: VideoSequence[], property: EditablePropertyDesc, o:Container, addSearchEntry: (o: Container, propertyName: string) => void): boolean {
		let ret = false;
		let sequenceNum = 0;
		for (let sequence of sequences) {
			if (sequence.n.toLocaleLowerCase().includes(textToSearch)) {
				addSearchEntry(o, property.name + ',' + sequenceNum);
				ret = true;
			}
			let itemNum = 0;
			for (let item of sequence.s) {
				if (item.videoSrc && (item.videoSrc.toLowerCase().includes(textToSearch))) {
					addSearchEntry(o, property.name + ',' + sequenceNum + ',' + itemNum);
					ret = true;
				}
				if (item.actions) {
					let actionNum = 0;
					for (let action of item.actions) {
						if (action.a && (action.a.toLowerCase().includes(textToSearch))) {
							addSearchEntry(o, property.name + ',' + sequenceNum + ',' + itemNum + ',' + actionNum);
							ret = true;
						}
						actionNum++;
					}
				}
				itemNum++;
			}
			sequenceNum++;
		}
		return ret;
	}

	componentDidMount() {
		bringTimelineForward();
		this._renderWindow();
	}

	componentWillUnmount() {
		this._hideWindow();
	}

	render() {
		return R.btn(this.state.toggled ? 'Close Sequences' : 'Open Sequences', this.onToggleClick, undefined, undefined, { key: 'l', ctrlKey: true });
	}

	onToggleClick() { //show/hide timeline window
		let t = !this.state.toggled;
		this.setState({ toggled: t });
		game.editor.settings.setItem('video-timeline-showed', t);
		if (t) {
			bringTimelineForward();
		}
	}

	onAutoSelect(selectPath: string[]) {
		if (!this.state.toggled) {
			this.onToggleClick();
			window.setTimeout(() => {
				VideoSequences.onAutoSelect(selectPath);
			}, 1);
		} else {
			VideoSequences.onAutoSelect(selectPath);
		}
	}

	componentDidUpdate() {
		this._renderWindow();
	}

	_renderWindow() {
		if (this.state.toggled) {
			showAdditionalWindow('video-sequence', 'Video sequences', 'Video sequences',
				R.div({ title: '' },
					h(VideoSequences, { videoClip: game.editor.selection[0] as VideoMovieClip, onCloseClick: this.onToggleClick }),
				), 20, 65, 90, 95, 1120, 220);
		} else {
			this._hideWindow();
		}
	}

	_hideWindow() {
		hideAdditionalWindow('video-sequence');
	}
}
