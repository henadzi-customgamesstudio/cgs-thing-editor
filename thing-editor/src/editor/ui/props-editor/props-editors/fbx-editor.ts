import fs, { AssetType } from 'thing-editor/src/editor/fs';
import R from 'thing-editor/src/editor/preact-fabrics';
import { editorUtils } from 'thing-editor/src/editor/utils/editor-utils';
import { CTRL_READABLE } from 'thing-editor/src/engine/utils/utils';
import game from 'thing-editor/src/engine/game';

const fbxEditorProps = { className: 'asset-editor' };

let assetNameProps = {
    className: 'selectable-text',
    title: CTRL_READABLE + '+click to copy resource`s name',
    onMouseDown: editorUtils.onAssetsClick
};

const FbxEditor = (props: EditablePropertyEditorProps): ComponentChild => {
    const file = fs.getFileByAssetName(props.value, AssetType.FBX);
    return R.div(fbxEditorProps,
        R.btn(props.value ? R.span(assetNameProps, props.value) : '. . .', () => {
            game.editor.chooseAsset(AssetType.FBX, 'Select "' + props.field.name, props.value, undefined, props.field.filterAssets).then((selectedFbx) => {
                if (selectedFbx) {
                    props.onChange(selectedFbx);
                }
            });
        }, props.value, (!props.value || file) ? 'choose-asset-button' : 'choose-asset-button danger'),
        props.value ? R.btn(R.icon('clean'), () => {
            props.onChange(null);
        }, 'Clear') : undefined
    );
};

FbxEditor.parser = (val: string) => {
    if (val) {
        return val;
    }
    return null;
};

FbxEditor.contextMenuInjection = (contextMenu: ContextMenuItem[], _field:EditablePropertyDesc, _clickedValue:any, _value:any) => {
    if (_clickedValue) {
        contextMenu.push({
            name: R.fragment(R.icon('asset-resource'), 'Edit FBX...'),
            onClick: () => {
                const file = fs.getFileByAssetName(_clickedValue, AssetType.FBX);
                if (file) {
                    fs.showFile(file.fileName);
                }
            }
        });
    }
};

export default FbxEditor;
