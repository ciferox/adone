const {
	rollup: { plugin: { json } }
} = adone;

module.exports = {
	description: 'removes unusued json keys',
	options: { plugins: [json()] }
};
