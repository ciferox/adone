import * as fs from 'fs';

export default function validate_bundler(bundler?: 'rollup') {
	if (!bundler) {
		bundler = (
			fs.existsSync('rollup.config.js') ? 'rollup' : null
		);

		if (!bundler) {
			// TODO remove in a future version
			deprecate_dir('rollup');
			throw new Error(`Could not find rollup.config.js or webpack.config.js`);
		}
	}

	if (bundler !== 'rollup') {
		throw new Error(`'${bundler}' is not a valid option for --bundler — must be either 'rollup' or 'webpack'`);
	}

	return bundler;
}

function deprecate_dir(bundler: 'rollup') {
	try {
		const stats = fs.statSync(bundler);
		if (!stats.isDirectory()) return;
	} catch (err) {
		// do nothing
		return;
	}

	// TODO link to docs, once those docs exist
	throw new Error(`As of Sapper 0.21, build configuration should be placed in a single ${bundler}.config.js file`);
}