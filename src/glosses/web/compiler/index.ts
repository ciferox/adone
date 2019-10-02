export { default as compile } from './compile/index';
export { default as parse } from './parse/index';
export { default as preprocess } from './preprocess/index';

const {
	acorn: { estreeWalker: { walk } },
} = adone;

export { walk };

export const VERSION = '__VERSION__';