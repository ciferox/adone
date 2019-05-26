(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
	typeof define === 'function' && define.amd ? define(['exports'], factory) :
	(global = global || self, factory(global.x = {}));
}(this, function (exports) { 'use strict';

	var Foo = function () {
		function Foo() {
			babelHelpers.classCallCheck(this, Foo);
		}

		babelHelpers.createClass(Foo, [{
			key: "bar",
			value: function bar() {
				console.log(42);
			}
		}]);
		return Foo;
	}();

	exports.Foo = Foo;

	Object.defineProperty(exports, '__esModule', { value: true });

}));
//# sourceMappingURL=bundle.umd.js.map
