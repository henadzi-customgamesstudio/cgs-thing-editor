import { Graphics, Point } from 'pixi.js';
import editable from 'thing-editor/src/editor/props-editor/editable';
import ParticleSpawner from './particle-spawner.c';

/**
 * Spawner that spawns ParticleShort-based prefabs randomly inside a rectangle.
 */
export default class ParticleSpawnerRect extends ParticleSpawner {

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
ParticleSpawnerRect.__EDITOR_icon = 'tree/spawner';
ParticleSpawnerRect.__EDITOR_tip = '<b>ParticleSpawnerRect</b> - Spawns particle prefabs randomly inside a rectangle.<br><b>Speed</b> propels objects along the X-axis.';
/// #endif
