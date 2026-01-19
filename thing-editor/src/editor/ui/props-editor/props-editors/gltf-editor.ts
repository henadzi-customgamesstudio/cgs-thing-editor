import type { ComponentChild } from 'preact';
import fs, { AssetType } from 'thing-editor/src/editor/fs';
import R from 'thing-editor/src/editor/preact-fabrics';
import type { ContextMenuItem } from 'thing-editor/src/editor/ui/context-menu';
import type { EditablePropertyEditorProps } from 'thing-editor/src/editor/ui/props-editor/props-field-wrapper';
import copyTextByClick from 'thing-editor/src/editor/utils/copy-text-by-click';
import { CTRL_READABLE } from 'thing-editor/src/engine/utils/utils';
import game from 'thing-editor/src/engine/game';

const gltfEditorProps = { className: 'asset-editor' };

let assetNameProps = {
    className: 'selectable-text',
    title: CTRL_READABLE + '+click to copy resource`s name',
    onMouseDown: copyTextByClick
};

/**
 * Property editor for selecting GLTF/GLB 3D model files.
 * Supports both .glb and .gltf formats.
 * Asset names are stored WITHOUT file extensions.
 */
const GltfEditor = (props: EditablePropertyEditorProps): ComponentChild => {
    // Try both GLB and GLTF asset lookups
    const file = fs.getFileByAssetName(props.value, AssetType.GLB)
        || fs.getFileByAssetName(props.value, AssetType.GLTF);

    return R.div(gltfEditorProps,
        R.btn(props.value ? R.span(assetNameProps, props.value) : '. . .', () => {
            // Use chooseGltf to show both GLB and GLTF files
            game.editor.chooseGltf('Select 3D Model "' + props.field.name + '"', props.value, props.field.filterAssets).then((selectedModel) => {
                if (selectedModel) {
                    props.onChange(selectedModel);
                }
            });
        }, props.value, (!props.value || file) ? 'choose-asset-button' : 'choose-asset-button danger'),
        props.value ? R.btn(R.icon('clean'), () => {
            props.onChange(null);
        }, 'Clear') : undefined
    );
};

GltfEditor.parser = (val: string) => {
    if (val) {
        return val;
    }
    return null;
};

GltfEditor.contextMenuInjection = (contextMenu: ContextMenuItem[], _field: EditablePropertyDesc, _clickedValue: any, _value: any) => {
    if (_clickedValue) {
        contextMenu.push({
            name: R.fragment(R.icon('asset-resource'), 'Reveal 3D Model...'),
            onClick: () => {
                const file = fs.getFileByAssetName(_clickedValue, AssetType.GLB)
                    || fs.getFileByAssetName(_clickedValue, AssetType.GLTF);
                if (file) {
                    fs.showFile(file.fileName);
                }
            }
        });
    }
};

export default GltfEditor;
