System.register([], function (exports, module) {
	'use strict';
	return {
		execute: function () {

			/*misalign*/var foo = function () { return 20; };

			/*the*/var bar = function () { return 22; };

			/*columns*/console.log( ("the answer is " + (foo() + bar())) );

		}
	};
});
//# sourceMappingURL=bundle.system.js.map
