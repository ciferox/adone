export default class TypeHandler {
    constructor(pkg, name, type) {
        this.name = name;
        this.type = type;
        this.package = pkg;
    }

    register(adoneConf, destPath) {
        throw new adone.exception.NotImplemented("Method register() is not implemented");
    }

    unregister(adoneConf) {
        throw new adone.exception.NotImplemented("Method register() is not implemented");
    }

    list() {
        throw new adone.exception.NotImplemented("Method list() is not implemented");
    }
}
