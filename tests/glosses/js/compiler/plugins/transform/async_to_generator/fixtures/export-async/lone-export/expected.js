export let foo = (() => {
  var _ref = babelHelpers.asyncToGenerator(function* () {});

  return function foo() {
    return _ref.apply(this, arguments);
  };
})();
