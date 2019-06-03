System.register('x', [], function (exports) {
	'use strict';
	return {
		execute: function () {

			var Foo = exports('Foo', function () {
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
			}());

		}
	};
});
//# sourceMappingURL=bundle.system.js.map
