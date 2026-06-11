const ifDefPlugin = require('./vite-plugin-ifdef/if-def-loader.js');
const htmlPlaceholdersPlugin = require('./vite-plugin-html-placeholders.js');
const path = require('path');
const {ViteImageOptimizer} = require('vite-plugin-image-optimizer');

module.exports = (_root, publicDir, outDir, debug, _projectDesc) => {
	return {
		json: {
			namedExports: false
		},
		root: '.tmp',
		publicDir,
		base: './',
		esbuild: {
			target: 'ES2015'
		},
		plugins: [
			ifDefPlugin(debug),
			htmlPlaceholdersPlugin(_projectDesc.__buildTemplate),
			ViteImageOptimizer({
				logStats: false,
				test: /^((?!no-optimize).)*\.(jpe?g|png|gif|tiff|webp|svg|avif)$/i,
				jpeg: {
					quality: _projectDesc.jpgQuality,
				},
				jpg: {
					quality: _projectDesc.jpgQuality,
				}
			})
		],
		build: {
			target: 'ES2015',
			emptyOutDir: true,
			minify: !debug,
			outDir,
			rollupOptions: {
				input: ''
			},
		},
		define: {
			__WEBP_FILES_AVAILABLE__: true,
			SPINE_SRC_PATH: JSON.stringify('https://cdn.jsdelivr.net/npm/pixi-spine@4.0.4/dist/pixi-spine.js')
		},
		resolve: {
			alias: {
				'games': path.resolve(__dirname, '../../games'),
				'.tmp': path.resolve(__dirname, '../../.tmp'),
				'libs': path.resolve(__dirname, '../../libs'),
				'thing-editor': path.resolve(__dirname, '../../thing-editor'),
				// Engine runtime libs. Per-project switch via `"offlineBuild": true` in
				// thing-project.json: bundles the exact same versions from
				// ./offline-vendor (larger bundle, works with no internet — e.g. the
				// MFC event-box LAN deployment). Default: CDN imports (smaller bundle,
				// requires internet at runtime).
				...(_projectDesc.offlineBuild ? {
					'howler.js': path.resolve(__dirname, 'offline-vendor/howler.min.js'),
					'pixi.js': path.resolve(__dirname, 'offline-vendor/pixi.min.mjs'),
					'three': path.resolve(__dirname, 'offline-vendor/three.module.min.js')
				} : {
					'howler.js': 'https://cdn.jsdelivr.net/npm/howler@2.2.3/dist/howler.min.js',
					'pixi.js': 'https://cdn.jsdelivr.net/npm/pixi.js@7.2.4/dist/pixi.min.mjs',
					'three': 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.min.js'
				})
			}
		}
	};
};
