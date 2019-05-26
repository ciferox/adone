define(['exports'], function (exports) { 'use strict';

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

});
//# sourceMappingURL=bundle.amd.js.map
