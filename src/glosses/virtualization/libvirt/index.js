const native = adone.bind("libvirt");

const {
    promise: { promisifyAll },
    std: { util, events: { EventEmitter } }
} = adone;

class LibvirtError extends Error {
    constructor(message) {
        super();
        Error.captureStackTrace(this, this.constructor);
        this.name = this.constructor.name;
        this.message = message;
    }
}

const errorHandler = (err) => {
    const newError = new LibvirtError(err.message);
    for (const key in err) {
        newError[key] = err[key];
    }
    throw newError;
};

const promisifyOptions = {
    promisifier: (originalFunction, defaultPromisifier) => function (...args) {
        return defaultPromisifier.apply(this, args).catch(errorHandler);
    }
};

const libvirt = native;

util.inherits(libvirt.Domain, EventEmitter);

libvirt.Hypervisor.prototype = promisifyAll(native.Hypervisor.prototype, promisifyOptions);
libvirt.Domain.prototype = promisifyAll(native.Domain.prototype, promisifyOptions);
libvirt.NodeDevice.prototype = promisifyAll(native.NodeDevice.prototype, promisifyOptions);
libvirt.Interface.prototype = promisifyAll(native.Interface.prototype, promisifyOptions);
libvirt.Network.prototype = promisifyAll(native.Network.prototype, promisifyOptions);
libvirt.NetworkFilter.prototype = promisifyAll(native.NetworkFilter.prototype, promisifyOptions);
libvirt.Secret.prototype = promisifyAll(native.Secret.prototype, promisifyOptions);
libvirt.StoragePool.prototype = promisifyAll(native.StoragePool.prototype, promisifyOptions);
libvirt.StorageVolume.prototype = promisifyAll(native.StorageVolume.prototype, promisifyOptions);

/*
 * A helper method returning an 'all domains' promise.
 */
libvirt.Hypervisor.prototype.getAllDomains = function () {
    const self = this;
    return Promise.join([this.listDefinedDomainsAsync(), this.listActiveDomainsAsync()]).spread((defined, active) => {
        return defined.concat(active);
    }).spread((defined, active) => {
        return Promise.all([
            Promise.map(defined, (domain) => {
                return self.lookupDomainByNameAsync(domain);
            }),
            Promise.map(active, (domain) => {
                return self.lookupDomainByIdAsync(domain);
            })
        ]);
    }).spread((defined, active) => {
        return defined.concat(active);
    });
};

libvirt.startEventLoop = native.setupEvent;
libvirt.createHypervisor = function (uri, options) {
    return new libvirt.Hypervisor(uri, options);
};

libvirt.LibvirtError = LibvirtError;

export default libvirt;
