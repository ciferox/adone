"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _dec, _dec2, _class, _class2;

function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) {
  var desc = {};
  Object['ke' + 'ys'](descriptor).forEach(function (key) {
    desc[key] = descriptor[key];
  });
  desc.enumerable = !!desc.enumerable;
  desc.configurable = !!desc.configurable;

  if ('value' in desc || desc.initializer) {
    desc.writable = true;
  }

  desc = decorators.slice().reverse().reduce(function (desc, decorator) {
    return decorator(target, property, desc) || desc;
  }, desc);

  if (context && desc.initializer !== void 0) {
    desc.value = desc.initializer ? desc.initializer.call(context) : void 0;
    desc.initializer = undefined;
  }

  if (desc.initializer === void 0) {
    Object['define' + 'Property'](target, property, desc);
    desc = null;
  }

  return desc;
}

let Test3 = (_dec = adone.netron.Context(), _dec2 = adone.netron.Public(), _dec(_class = (_class2 = class Test3 {
  constructor(subsystem) {
    this.subsystem = subsystem;
  }

  getInfo() {
    return this.subsystem.config;
  }

}, (_applyDecoratedDescriptor(_class2.prototype, "getInfo", [_dec2], Object.getOwnPropertyDescriptor(_class2.prototype, "getInfo"), _class2.prototype)), _class2)) || _class);
let Test3Service = class Test3Service extends adone.omnitron.Service {
  async initializeService() {
    this.context = new Test3(this);
    await this.peer.attachContextRemote(this.context, "test3");
  }

  async uninitializeService() {
    await this.peer.detachContextRemote("test3");
  }

};
exports.default = Test3Service;
//# sourceMappingURL=index.js.map
