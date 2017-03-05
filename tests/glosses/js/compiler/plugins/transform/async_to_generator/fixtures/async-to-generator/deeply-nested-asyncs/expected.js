let s = (() => {
  var _ref = babelHelpers.asyncToGenerator(function* (x, ...args) {
    var _this = this,
        _arguments = arguments;

    let t = (() => {
      var _ref2 = babelHelpers.asyncToGenerator(function* (y, a) {
        let r = (() => {
          var _ref3 = babelHelpers.asyncToGenerator(function* (z, b, ...innerArgs) {
            yield z;
            console.log(_this, innerArgs, _arguments);
            return _this.x;
          });

          return function r(_x4, _x5) {
            return _ref3.apply(this, arguments);
          };
        })();
        yield r();

        console.log(_this, args, _arguments);
        return _this.g(r);
      });

      return function t(_x2, _x3) {
        return _ref2.apply(this, arguments);
      };
    })();

    yield t();
    return this.h(t);
  });

  return function s(_x) {
    return _ref.apply(this, arguments);
  };
})();
