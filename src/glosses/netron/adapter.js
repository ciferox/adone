const { is, x } = adone;

export default class Adapter {
    constructor(options) {
        this.option = new adone.configuration.Configuration();
        this.option.assign(options);
        this.server = null;
    }

    isBound() {
        return !is.null(this.server); 
    }

    bind(netron) {
        throw new x.NotImplemented("method bind() should be implemented");
    }

    unbind() {
        throw new x.NotImplemented("method unbind() should be implemented");
    }
}
adone.tag.set(Adapter, adone.tag.NETRON_ADAPTER);
