adone.lazify({
	compile: "./compile",
	parse: "./parse",
	preprocess: "./preprocess",
	walk: () => adone.acorn.estreeWalker.walk
}, exports, require);
