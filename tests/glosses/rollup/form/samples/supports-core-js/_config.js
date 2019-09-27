module.exports = {
	description: 'supports core-js',
	options: {
		// check against tree-shake: false when updating the polyfill
		treeshake: true,
		plugins: [adone.rollup.plugin.resolve(), adone.rollup.plugin.commonjs()]
	}
};
