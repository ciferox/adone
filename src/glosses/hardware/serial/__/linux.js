const { promisify } = adone.promise;

const promisedFilter = (func) => {
    return function (data) {
        const shouldKeep = data.map(func);
        return Promise.all(shouldKeep).then((keep) => {
            return data.filter((path, index) => {
                return keep[index];
            });
        });
    };
};

const statAsync = promisify(adone.std.fs.stat);
const readdirAsync = promisify(adone.std.fs.readdir);
const execAsync = promisify(adone.std.child_process.exec);

const udevParser = (output) => {
    const udevInfo = output.split("\n").reduce((info, line) => {
        if (!line || line.trim() === "") {
            return info;
        }
        const parts = line.split("=").map((part) => part.trim());

        info[parts[0].toLowerCase()] = parts[1];

        return info;
    }, {});

    let pnpId;
    if (udevInfo.devlinks) {
        udevInfo.devlinks.split(" ").forEach((path) => {
            if (path.indexOf("/by-id/") === -1) {
                return;
            }
            pnpId = path.substring(path.lastIndexOf("/") + 1);
        });
    }

    let vendorId = udevInfo.id_vendor_id;
    if (vendorId && vendorId.substring(0, 2) !== "0x") {
        vendorId = `0x${vendorId}`;
    }

    let productId = udevInfo.id_model_id;
    if (productId && productId.substring(0, 2) !== "0x") {
        productId = `0x${productId}`;
    }

    return {
        comName: udevInfo.devname,
        manufacturer: udevInfo.id_vendor,
        serialNumber: udevInfo.id_serial,
        pnpId,
        vendorId,
        productId
    };
};

const checkPathAndDevice = (path) => {
    // get only serial port names
    if (!(/(tty(S|ACM|USB|AMA|MFD)|rfcomm)/).test(path)) {
        return false;
    }
    return statAsync(path).then((stats) => stats.isCharacterDevice());
};

const lookupPort = (file) => {
    const udevadm = `udevadm info --query=property -p $(udevadm info -q path -n ${file})`;
    return execAsync(udevadm).then(udevParser);
};

const defaultBindingOptions = Object.freeze({
    vmin: 1,
    vtime: 0
});

export default class LinuxBinding extends adone.hardware.serial.__.BaseBinding {
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

    static list() {
        const dirName = "/dev";
        return readdirAsync(dirName).catch((err) => {
            // if this directory is not found we just pretend everything is OK
            // TODO Deprecate this check?
            if (err.errno === 34) {
                return [];
            }
            throw err;
        }).then((data) => data.map((file) => adone.std.path.join(dirName, file)))
            .then(promisedFilter(checkPathAndDevice))
            .then((data) => Promise.all(data.map(lookupPort)));
    }
}
