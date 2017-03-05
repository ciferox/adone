class Foo extends Bar {
  constructor(...args) {
    var _temp;

    return _temp = super(...args), this.bar = "foo", _temp;
  }

}
