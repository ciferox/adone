const {
	rollup: { plugin: { commonjs } }
} = adone;

module.exports = {
	description: 'Handles output from rollup-plugin-commonjs',
	options: {
		input: 'main.js',
		preserveModules: true,
		external: ['external'],
		plugins: [commonjs()]
	}
};
