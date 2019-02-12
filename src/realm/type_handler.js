export default class TypeHandler {
    constructor(manager, name, type) {
        this.name = name;
        this.type = type;
        this.manager = manager;
    }

    register(adoneConf, destPath) {
        throw new adone.error.NotImplementedException("Method register() is not implemented");
    }

    unregister(adoneConf) {
        throw new adone.error.NotImplementedException("Method register() is not implemented");
    }

    list() {
        throw new adone.error.NotImplementedException("Method list() is not implemented");
    }

    checkAndRemove(name) {
        throw new adone.error.NotImplementedException("Method checkAndRemove() is not implemented");
    }
}
