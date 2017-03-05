var foo = "bar";

class Foo {

  constructor() {
    _initialiseProps.call(this);

    var foo = "foo";
  }
}

var _initialiseProps = function () {
  Object.defineProperty(this, "bar", {
    enumerable: true,
    writable: true,
    value: foo
  });
};
