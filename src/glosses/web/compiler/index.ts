adone.lazify({
	compile: "./compile",
	parse: "./parse",
	preprocess: "./preprocess",
	walk: () => adone.js.acorn.estreeWalker.walk
}, exports, require);
