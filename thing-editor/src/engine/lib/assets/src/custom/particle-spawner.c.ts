import { Container } from 'pixi.js';
import type { FileDesc } from 'thing-editor/src/editor/fs';
import editable from 'thing-editor/src/editor/props-editor/editable';
import { getSerializedObjectClass } from 'thing-editor/src/editor/utils/generate-editor-typings';
import BaseSpawner from 'thing-editor/src/engine/lib/assets/src/basic/base-spawner.c';
import ParticleShort from 'thing-editor/src/engine/lib/assets/src/custom/particle-short.c';

/**
 * Filter function that only shows ParticleShort-based prefabs in the editor dropdown.
 */
const particlePrefabFilter = (file: FileDesc) => {
    const PrefabClass = getSerializedObjectClass(file.asset as SerializedObject);
    return PrefabClass.prototype instanceof ParticleShort || PrefabClass === (ParticleShort as any);
};

/**
 * Spawner component that only allows spawning ParticleShort-based prefabs.
 * The prefab dropdown will only show particle prefabs (based on ParticleShort class).
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

    @editable({ min: 0.01, step: 0.01, visible: (o: ParticleSpawner) => o.overrideScale })
    overrideScaleX = 1.0;

    @editable({ min: 0.01, step: 0.01, visible: (o: ParticleSpawner) => o.overrideScale })
    overrideScaleY = 1.0;

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
        if (spawnedObject instanceof ParticleShort) {
            const particle = spawnedObject as ParticleShort;

            if (this.overrideScale) {
                particle.enableRandomStartScale = false;
                particle.startScaleX = this.overrideScaleX;
                particle.startScaleY = this.overrideScaleY;
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
