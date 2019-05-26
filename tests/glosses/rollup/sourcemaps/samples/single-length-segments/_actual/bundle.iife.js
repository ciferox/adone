var x = (function (exports) {
	'use strict';

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

	return exports;

}({}));
//# sourceMappingURL=bundle.iife.js.map
