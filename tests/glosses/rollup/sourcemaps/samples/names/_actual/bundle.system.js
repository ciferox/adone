System.register('myModule', [], function (exports) {
	'use strict';
	return {
		execute: function () {

			exports('Foo', Foo$1);

			function Foo () {}

			function Foo$1 () {}

			Foo$1.prototype = Object.create( Foo.prototype );

		}
	};
});
//# sourceMappingURL=bundle.system.js.map
