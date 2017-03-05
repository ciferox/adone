export default (param => {
  var _class, _temp;

  return _temp = _class = class App {

    getParam() {
      return param;
    }
  }, Object.defineProperty(_class, 'props', {
    enumerable: true,
    writable: true,
    value: {
      prop1: 'prop1',
      prop2: 'prop2'
    }
  }), _temp;
});
