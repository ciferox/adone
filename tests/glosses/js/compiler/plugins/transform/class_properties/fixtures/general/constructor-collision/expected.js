var foo = "bar";

class Foo {

  constructor() {
    _initialiseProps.call(this);

    var foo = "foo";
  }
}

var _initialiseProps = function () {
  this.bar = foo;
};
