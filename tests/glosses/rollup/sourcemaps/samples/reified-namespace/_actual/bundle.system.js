System.register([], function (exports, module) {
	'use strict';
	return {
		execute: function () {

			var bar = 42;

			var foo = /*#__PURE__*/Object.freeze({
				bar: bar
			});

			assert.deepEqual( foo, { bar: 42 });

		}
	};
});
//# sourceMappingURL=bundle.system.js.map
