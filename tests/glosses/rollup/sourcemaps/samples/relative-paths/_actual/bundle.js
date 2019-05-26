(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global = global || self, global.myModule = factory());
}(this, function () { 'use strict';

	var main = 42;

	return main;

}));
//# sourceMappingURL=bundle.js.map
