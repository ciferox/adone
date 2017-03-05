const { createStructure } = FS;

export default function (directory) {
    return createStructure(directory, [
        ["another-factory.js", "\nangular.module('another')\n  .factory('AnotherFactory', [function () {\n    return {\n\n    };\n  }]);\n"],
        ["another.js", "\nangular.module('another', ['module', 'yet-another']);\n"],
        ["circular.js", "angular.module('app', ['templates']);\n\nangular.module('templates', []);\n"],
        ["circular2.js", "angular.module('app', ['module']);\nangular.module('foo', []);\n"],
        ["circular3.js", "angular.module('module', ['foo']);\n"],
        ["dep-on-non-declared.js", "\nangular.module('dep-on-non-declared', ['non-declared']);\n"],
        ["empty.js", ""],
        ["module-controller.js", "\nangular.module('module')\n  .controller('ModuleCtrl', ['$scope', function ($scope) {\n    $scope.greeting = 'Hello world';\n  }]);\n"],
        ["module.js", "\nangular.module('module', []);\n"],
        ["no-deps.js", "\nangular.module('no-deps', []);\n"],
        ["yet-another.js", "\nangular.module('yet-another', ['module']);\n\nangular.module('another').service('AnotherService', [function () {\n\n}]);\n"]]);
}