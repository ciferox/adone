System.register([], function () {
	'use strict';
	return {
		execute: function () {

			var foo = function () { return 42; };

			assert.equal( 1 + 1, 2 );
			assert.equal( 2 + 2, 4 );

			console.log( ("the answer is " + (foo())) );

			assert.equal( 1 + 1, 2 );
			assert.equal( 2 + 2, 4 );

		}
	};
});
//# sourceMappingURL=bundle.system.js.map
