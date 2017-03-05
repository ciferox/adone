class Foo extends Bar {

  constructor() {
    var _temp;

    foo((_temp = super(), Object.defineProperty(this, "bar", {
      enumerable: true,
      writable: true,
      value: "foo"
    }), _temp));
  }
}
