(function (factory) {
	typeof define === 'function' && define.amd ? define(factory) :
	factory();
}(function () { 'use strict';

	var bar = 42;

	var foo = /*#__PURE__*/Object.freeze({
		bar: bar
	});

	assert.deepEqual( foo, { bar: 42 });

}));
//# sourceMappingURL=bundle.umd.js.map
