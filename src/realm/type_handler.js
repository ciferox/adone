export default class TypeHandler {
    constructor(pkg, name, type) {
        this.name = name;
        this.type = type;
        this.package = pkg;
    }

    register(adoneConf, destPath) {
        throw new adone.error.NotImplemented("Method register() is not implemented");
    }

    unregister(adoneConf) {
        throw new adone.error.NotImplemented("Method register() is not implemented");
    }

    list() {
        throw new adone.error.NotImplemented("Method list() is not implemented");
    }

    checkAndRemove(name) {
        throw new adone.error.NotImplemented("Method checkAndRemove() is not implemented");
    }
}
