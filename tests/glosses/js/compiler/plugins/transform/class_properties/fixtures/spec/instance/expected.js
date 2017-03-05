class Foo {
  constructor() {
    Object.defineProperty(this, "bar", {
      enumerable: true,
      writable: true,
      value: "foo"
    });
  }

}
