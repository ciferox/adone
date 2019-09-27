const path = require('path');
const { loader } = require('../utils.js');
const { getLocator } = require('locate-character');

const {
	assert,
	rollup,
	sourcemap: { SourceMapConsumer }
} = adone;


describe('in-memory sourcemaps', () => {
	it('generates an in-memory sourcemap', () => {
		return rollup
			.rollup({
				input: 'main',
				plugins: [loader({ main: `console.log( 42 );` })]
			})
			.then(bundle => {
				return bundle.generate({
					format: 'cjs',
					sourcemap: true,
					sourcemapFile: path.resolve('bundle.js')
				});
			})
			.then(({ output: [generated] }) => {
				const smc = new SourceMapConsumer(generated.map);
				const locator = getLocator(generated.code, { offsetLine: 1 });

				const generatedLoc = locator('42');
				const loc = smc.originalPositionFor(generatedLoc); // 42
				assert.equal(loc.source, 'main');
				assert.equal(loc.line, 1);
				assert.equal(loc.column, 13);
			});
	});
});
