export default class AbstractHandler {
    constructor(pkg, adoneConf) {
        this.package = pkg;
        this.adoneConf = adoneConf;
    }

    register() {
        throw new adone.x.NotImplemented("Method register() is not implemented");
    }

    unregister() {
        throw new adone.x.NotImplemented("Method register() is not implemented");
    }
}
