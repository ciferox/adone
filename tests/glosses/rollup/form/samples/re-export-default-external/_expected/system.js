System.register('reexportsDefaultExternal', ['external'], function (exports) {
	'use strict';
	return {
		setters: [function (module) {
			exports('default', module.objAlias);
		}],
		execute: function () {



		}
	};
});
