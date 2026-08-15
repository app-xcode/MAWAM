module.exports = {
	globDirectory: 'dist',
	globPatterns: [
		'**/*.{json,html,ico,css,png,js}'
	],
	swDest: 'dist/sw.js',
	ignoreURLParametersMatching: [
		/^utm_/,
		/^fbclid$/
	],
	 maximumFileSizeToCacheInBytes: 6 * 1024 * 1024 // 6MB
};