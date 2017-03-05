class Foo extends Bar {
  constructor(...args) {
    var _temp;

    return _temp = super(...args), Object.defineProperty(this, "bar", {
      enumerable: true,
      writable: true,
      value: "foo"
    }), _temp;
  }

}
