import { Container } from 'pixi.js';
import type { FileDesc } from 'thing-editor/src/editor/fs';
import editable from 'thing-editor/src/editor/props-editor/editable';
import { getSerializedObjectClass } from 'thing-editor/src/editor/utils/generate-editor-typings';
import BaseSpawner from 'thing-editor/src/engine/lib/assets/src/basic/base-spawner.c';
import ParticleSprite from 'thing-editor/src/engine/lib/assets/src/custom/particle-sprite.c';

/**
 * Filter function that only shows ParticleSprite-based prefabs in the editor dropdown.
 */
const particlePrefabFilter = (file: FileDesc) => {
    const PrefabClass = getSerializedObjectClass(file.asset as SerializedObject);
    return PrefabClass.prototype instanceof ParticleSprite || PrefabClass === (ParticleSprite as any);
};

/**
 * Spawner component that only allows spawning ParticleSprite-based prefabs.
 * The prefab dropdown will only show particle prefabs.
 * Supports overriding particle properties via hook method.
 */
export default class ParticleSpawner extends BaseSpawner {

    @editable({ type: 'prefab', important: true, filterAssets: particlePrefabFilter })
    prefabToSpawn: string | null = null;

    // --- Scale Override ---
    @editable({ type: 'splitter', title: 'Scale Override' })
    _scaleOverrideSplitter = null;

    @editable({ tip: 'Override particle start scale (ignores random scale settings in prefab)' })
    overrideScale = false;

    @editable({ type: 'vector2', vector2_minX: 0.01, vector2_minY: 0.01, vector2_stepX: 0.01, vector2_stepY: 0.01, visible: (o: ParticleSpawner) => o.overrideScale })
    overrideScaleValue: Vector2 = { x: 1.0, y: 1.0 };

    // --- Image Override ---
    @editable({ type: 'splitter', title: 'Image Override' })
    _imageOverrideSplitter = null;

    @editable({ tip: 'Override particle image (ignores image in prefab)' })
    overrideImage = false;

    @editable({ type: 'image', visible: (o: ParticleSpawner) => o.overrideImage })
    overrideImageName: string | null = null;

    // --- Duration Override ---
    @editable({ type: 'splitter', title: 'Duration Override' })
    _durationOverrideSplitter = null;

    @editable({ tip: 'Override particle duration (ignores random duration settings in prefab)' })
    overrideDuration = false;

    @editable({ min: 3, visible: (o: ParticleSpawner) => o.overrideDuration })
    overrideDurationValue = 10;

    // --- Tint Override ---
    @editable({ type: 'splitter', title: 'Tint Override' })
    _tintOverrideSplitter = null;

    @editable({ tip: 'Override particle tint color' })
    overrideTint = false;

    @editable({ type: 'color', default: 0xFFFFFF, visible: (o: ParticleSpawner) => o.overrideTint })
    overrideTintColor = 0xFFFFFF;

    /**
     * Apply particle-specific overrides to spawned object.
     */
    protected applySpawnOverrides(spawnedObject: Container): void {
        if (spawnedObject instanceof ParticleSprite) {
            const particle = spawnedObject;

            if (this.overrideScale) {
                particle.enableRandomStartScale = false;
                particle.startScale.x = this.overrideScaleValue.x;
                particle.startScale.y = this.overrideScaleValue.y;
            }

            if (this.overrideImage && this.overrideImageName) {
                particle.image = this.overrideImageName;
            }

            if (this.overrideDuration) {
                particle.enableRandomDuration = false;
                particle.duration = this.overrideDurationValue;
            }

            if (this.overrideTint) {
                particle.tint = this.overrideTintColor;
            }
        }
    }
}

/// #if EDITOR
ParticleSpawner.__EDITOR_icon = 'tree/particle-container';
/// #endif
