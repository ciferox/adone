(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
	typeof define === 'function' && define.amd ? define(['exports'], factory) :
	(global = global || self, factory(global.myModule = {}));
}(this, function (exports) { 'use strict';

	function Foo () {}

	function Foo$1 () {}

	Foo$1.prototype = Object.create( Foo.prototype );

	exports.Foo = Foo$1;

	Object.defineProperty(exports, '__esModule', { value: true });

}));
//# sourceMappingURL=bundle.umd.js.map
