import editable from 'thing-editor/src/editor/props-editor/editable';
import BaseSpawner from 'thing-editor/src/engine/lib/assets/src/basic/base-spawner.c';

/**
 * Spawner component that spawns any prefab at regular intervals.
 */
export default class Spawner extends BaseSpawner {

	@editable({ type: 'prefab', important: true })
	prefabToSpawn: string | null = null;
}

/// #if EDITOR
Spawner.__EDITOR_icon = 'tree/spawner';
/// #endif
