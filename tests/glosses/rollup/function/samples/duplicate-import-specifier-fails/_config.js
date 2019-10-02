const path = require('path');

module.exports = {
	description: 'disallows duplicate import specifiers',
	error: {
		code: 'PARSE_ERROR',
		message: `Identifier 'a' has already been declared`,
		pos: 12,
		watchFiles: [path.resolve(__dirname, 'main.js')],
		loc: {
			file: path.resolve(__dirname, 'main.js'),
			line: 1,
			column: 12
		},
		frame: `
			1: import { a, a } from './foo';
			               ^
			2: assert.equal(a, 1);
		`
	}
};

// test copied from https://github.com/esnext/es6-module-transpiler/tree/master/test/examples/duplicate-import-specifier-fails