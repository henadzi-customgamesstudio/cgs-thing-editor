import { Graphics, Point } from 'pixi.js';
import editable from 'thing-editor/src/editor/props-editor/editable';
import Spawner from './spawner.c';

export default class SpawnerLine extends Spawner {

    @editable({ min: 0, default: 100 })
    length = 100;

    protected getLocalSpawnPosition(resultPoint: Point) {
        resultPoint.x = 0;
        resultPoint.y = (Math.random() - 0.5) * this.length;
    }

    /// #if EDITOR
    __editorGuide!: Graphics;

    update() {
        super.update();
    }
    /// #endif
}
/// #if EDITOR
SpawnerLine.__EDITOR_icon = 'tree/spawner';
SpawnerLine.__EDITOR_tip = '<b>SpawnerLine</b> - Spawns prefabs randomly along a line (Y-axis). The <b>Speed</b> property propels objects along the X-axis (forward).';
/// #endif
