import { Graphics, Point } from 'pixi.js';
import editable from 'thing-editor/src/editor/props-editor/editable';
import ParticleSpawner from './particle-spawner.c';

/**
 * Spawner that spawns ParticleShort-based prefabs randomly along a line (Y-axis).
 */
export default class ParticleSpawnerLine extends ParticleSpawner {

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
ParticleSpawnerLine.__EDITOR_icon = 'tree/spawner';
ParticleSpawnerLine.__EDITOR_tip = '<b>ParticleSpawnerLine</b> - Spawns particle prefabs randomly along a line (Y-axis). The <b>Speed</b> property propels objects along the X-axis (forward).';
/// #endif
