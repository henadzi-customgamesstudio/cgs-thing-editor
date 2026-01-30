const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

const {walkSync} = require('./editor-server-utils');

const imgExt = /\.(png|jpe?g)$/i;

module.exports = {
	build: (projectDir, debug, assetsToCopy, projectDesc) => {
		const editorRoot = path.resolve(__dirname, '../..');
		const tmpDir = editorRoot + '/.tmp';
		const projectRoot = path.join('..', projectDir);
		const outDir = projectRoot + (debug ? '/debug' : '/release');
		const publicDir = tmpDir + '/public';
		const publicAssetsDir = publicDir + '/assets/';

		if (fs.existsSync(publicDir)) {
			let files = walkSync(publicDir);
			for (let fileEntry of files) {
				fs.unlinkSync(fileEntry.fileName);
			}
		}
		if (fs.existsSync(outDir)) {
			let files = walkSync(outDir);
			for (let fileEntry of files) {
				fs.unlinkSync(fileEntry.fileName);
			}
		}

		if (!fs.existsSync(publicDir)) {
			fs.mkdirSync(publicDir);
		}
		if (!fs.existsSync(publicAssetsDir)) {
			fs.mkdirSync(publicAssetsDir);
		}
		return Promise.all(assetsToCopy.map((asset) => {
			return new Promise((resolve, reject) => {
				const to = publicAssetsDir + asset.to;
				const dirName = path.dirname(to);
				if (!fs.existsSync(dirName)) {
					fs.mkdirSync(dirName, {recursive: true});
				}
				fs.copyFile(editorRoot + asset.from, to, (er) => {
					if (er) {
						debugger;
						reject(er);
					} else {
						if (!asset.to.startsWith('3d/') && imgExt.test(asset.to)) {
							sharp(editorRoot + asset.from)
								.webp({quality: 82, alphaQuality: 90})
								.toFile(to.replace(imgExt, '.webp'))
								.then(resolve)
								.catch(resolve);
						} else {
							resolve();
						}
					}
				});
			});
		})).then(() => {
			return require('vite').build(require(path.resolve(editorRoot, debug ? projectDesc.__buildConfigDebug : projectDesc.__buildConfigRelease))(projectRoot, publicDir, outDir, debug, projectDesc)).then((res) => {
				require('./static-server.js');
				console.log('BUILD COMPLETE: ' + 'http://localhost:5174/' + projectDir);
				return res;
			}).catch((er) => {
				console.error(er.stack);
				return er;
			});
		});
	}
};
