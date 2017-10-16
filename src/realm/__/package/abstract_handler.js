export default class AbstractHandler {
    constructor(pkg, name, type) {
        this.name = name;
        this.type = type;
        this.package = pkg;
    }

    register(adoneConf, destPath) {
        throw new adone.x.NotImplemented("Method register() is not implemented");
    }

    unregister(adoneConf) {
        throw new adone.x.NotImplemented("Method register() is not implemented");
    }

    list() {
        throw new adone.x.NotImplemented("Method list() is not implemented");
    }
}
