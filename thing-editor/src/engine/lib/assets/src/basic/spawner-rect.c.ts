import { Graphics, Point } from 'pixi.js';
import editable from 'thing-editor/src/editor/props-editor/editable';
import Spawner from './spawner.c';

export default class SpawnerRect extends Spawner {

    @editable({ min: 0, default: 100 })
    rectWidth = 100;

    @editable({ min: 0, default: 100 })
    rectHeight = 100;

    protected getLocalSpawnPosition(resultPoint: Point) {
        resultPoint.x = (Math.random() - 0.5) * this.rectWidth;
        resultPoint.y = (Math.random() - 0.5) * this.rectHeight;
    }

    /// #if EDITOR
    __editorGuide!: Graphics;

    update() {
        super.update();
    }

    /// #endif
}
/// #if EDITOR
SpawnerRect.__EDITOR_icon = 'tree/spawner';
SpawnerRect.__EDITOR_tip = '<b>SpawnerRect</b> - Spawns objects randomly inside a rectangle.<br><b>Speed</b> propels objects along the X-axis.';
/// #endif
