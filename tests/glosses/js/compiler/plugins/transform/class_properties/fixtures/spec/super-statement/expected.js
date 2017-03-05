class Foo extends Bar {

  constructor() {
    super();
    Object.defineProperty(this, "bar", {
      enumerable: true,
      writable: true,
      value: "foo"
    });
  }
}
