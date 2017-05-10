const { promisify } = adone.promise;

const defaultBindingOptions = Object.freeze({
    vmin: 1,
    vtime: 0
});

export default class DarwinBinding extends adone.hardware.serial.__.BaseBinding {
    static list() {
        return promisify(adone.hardware.serial.__.native.list)();
    }

    constructor(opt) {
        super(opt);
        this.disconnect = opt.disconnect;
        this.bindingOptions = opt.bindingOptions || {};
        this.fd = null;
    }

    get isOpen() {
        return this.fd !== null;
    }

    open(path, options) {
        return super.open(path, options).then(() => {
            options = Object.assign({}, defaultBindingOptions, this.bindingOptions, options);
            return promisify(adone.hardware.serial.__.native.open)(path, options);
        }).then((fd) => {
            this.fd = fd;
        });
    }

    close() {
        return super.close().then(() => {
            if (this.readPoller) {
                this.readPoller.close();
                this.readPoller = null;
            }

            return promisify(adone.hardware.serial.__.native.close)(this.fd);
        }).then(() => {
            this.fd = null;
        });
    }

    read(buffer, offset, length) {
        return super.read(buffer, offset, length).then(() => adone.hardware.serial.__.unixRead.call(this, buffer, offset, length));
    }

    write(buffer) {
        return super.write(buffer).then(() => promisify(adone.hardware.serial.__.native.write)(this.fd, buffer));
    }

    update(options) {
        return super.update(options).then(() => promisify(adone.hardware.serial.__.native.update)(this.fd, options));
    }

    set(options) {
        return super.set(options).then(() => promisify(adone.hardware.serial.__.native.set)(this.fd, options));
    }

    get() {
        return super.get().then(() => promisify(adone.hardware.serial.__.native.get)(this.fd));
    }

    drain() {
        return super.drain().then(() => promisify(adone.hardware.serial.__.native.drain)(this.fd));
    }

    flush() {
        return super.flush().then(() => promisify(adone.hardware.serial.__.native.flush)(this.fd));
    }
}
