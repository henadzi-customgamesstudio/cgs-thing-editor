const fs = require('fs');
const path = require('path');

/**
 * Vite plugin to use custom HTML build template if available
 * Looks for index.build.html in project assets folder
 * Replaces %SCRIPTS% placeholder with generated script tags
 */
module.exports = function htmlPlaceholdersPlugin(buildTemplatePath) {
	let buildTemplate = null;

	if (buildTemplatePath && fs.existsSync(buildTemplatePath)) {
		buildTemplate = fs.readFileSync(buildTemplatePath, 'utf-8');
		console.log('Using custom build template: ' + buildTemplatePath);
	}

	return {
		name: 'html-placeholders',
		transformIndexHtml(html) {
			if (!buildTemplate) {
				return html;
			}

			// Extract script tags from generated HTML
			const scriptMatches = html.match(/<script[^>]*type="module"[^>]*src="[^"]*"[^>]*><\/script>/gi) || [];
			const linkMatches = html.match(/<link[^>]*rel="stylesheet"[^>]*href="[^"]*"[^>]*>/gi) || [];

			let result = buildTemplate;

			// Replace %SCRIPTS% with generated script tags
			if (result.includes('%SCRIPTS%')) {
				const scripts = [...linkMatches, ...scriptMatches].join('\n');
				result = result.replace('%SCRIPTS%', scripts);
			} else {
				// If no %SCRIPTS% placeholder, inject before </head>
				const scripts = [...linkMatches, ...scriptMatches].join('\n');
				result = result.replace('</head>', scripts + '\n</head>');
			}

			return result;
		}
	};
};
