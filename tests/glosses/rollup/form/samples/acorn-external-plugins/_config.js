module.exports = {
	description: 'supports official acorn plugins that may rely on a shared acorn instance',
	options: {
		acornInjectPlugins: [adone.acorn.plugin.jsx()]
	}
};
