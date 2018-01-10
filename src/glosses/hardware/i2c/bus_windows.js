const { is } = adone;
const i2c = adone.nativeAddon("i2c.node");

// In this context:
// peripheral = i2c device object (https://msdn.microsoft.com/en-us/library/windows.devices.i2c.i2cdevice.aspx)
const peripheralSync = (bus, addr) => {
    let peripheral = bus._peripherals[addr];

    if (is.undefined(peripheral)) {
        peripheral = new i2c.WinI2c();
        peripheral.getControllerSync(bus._controllerName);
        bus._peripherals[addr] = peripheral;
        peripheral.createDeviceSync(addr, 1, 0);
    }
    return peripheral;
};

const peripheral = (bus, addr, cb) => {
    let device = bus._peripherals[addr];
    if (is.undefined(device)) {
        device = new i2c.WinI2c();
        device.getController(bus._controllerName, (err) => {
            if (err) {
                return cb(err);
            }

            bus._peripherals[addr] = device;

            device.createDevice(addr, 1, 0, (err) => {
                if (err) {
                    return cb(err);
                }

                cb(null, device);
            });
        });
    } else {
        setImmediate(cb, null, device);
    }
};

// In this context:
// Bus = i2c controller object (https://msdn.microsoft.com/en-us/library/windows.devices.i2c.i2ccontroller.aspx)
// busNumber = name of i2c controller
export default class Bus {
    constructor(busNumber) {
        this._controllerName = busNumber;
        this._peripherals = [];
    }

    close(cb) {
        const peripherals = this._peripherals.filter((peripheral) => {
            return !is.undefined(peripheral);
        });

        (function close() {
            if (peripherals.length === 0) {
                return setImmediate(cb, null);
            }

            peripherals.pop().closeDevice((err) => {
                if (err) {
                    return cb(err);
                }
                close();
            });
        }());
    }

    closeSync() {
        this._peripherals.forEach((peripheral) => {
            if (!is.undefined(peripheral)) {
                peripheral.closeDeviceSync();
            }
        });
        this._peripherals = [];
    }

    i2cFuncs(cb) {
        throw new Error("Not implemented");
    }

    i2cFuncsSync() {
        throw new Error("Not implemented");
    }

    readByte(addr, cmd, cb) {
        throw new Error("Not implemented");
    }

    readByteSync(addr, cmd) {
        throw new Error("Not implemented");
    }

    readWord(addr, cmd, cb) {
        throw new Error("Not implemented");
    }

    readWordSync(addr, cmd) {
        throw new Error("Not implemented");
    }

    readBlock(addr, cmd, buffer, cb) {
        throw new Error("Not implemented");
    }

    readBlockSync(addr, cmd, buffer) {
        throw new Error("Not implemented");
    }

    readI2cBlock(addr, cmd, length, buffer, cb) {
        peripheral(this, addr, (err, device) => {
            if (err) {
                return cb(err);
            }

            device.writeReadPartial(cmd, length, buffer, cb);
        });
    }

    readI2cBlockSync(addr, cmd, length, buffer) {
        return peripheralSync(this, addr).writeReadPartialSync(cmd, length, buffer);
    }

    receiveByte(addr, cb) {
        throw new Error("Not implemented");
    }

    receiveByteSync(addr) {
        throw new Error("Not implemented");
    }

    sendByte(addr, byte, cb) {
        throw new Error("Not implemented");
    }

    sendByteSync(addr, byte) {
        throw new Error("Not implemented");
    }

    writeByte(addr, cmd, byte, cb) {
        throw new Error("Not implemented");
    }

    writeByteSync(addr, cmd, byte) {
        throw new Error("Not implemented");
    }

    writeWord(addr, cmd, word, cb) {
        throw new Error("Not implemented");
    }

    writeWordSync(addr, cmd, word) {
        throw new Error("Not implemented");
    }

    writeQuickSync(addr, bit) {
        throw new Error("Not implemented");
    }

    writeBlock(addr, cmd, length, buffer, cb) {
        throw new Error("Not implemented");
    }

    writeBlockSync(addr, cmd, length, buffer) {
        throw new Error("Not implemented");
    }

    writeI2cBlock(addr, cmd, length, buffer, cb) {
        throw new Error("Not implemented");
    }

    writeI2cBlockSync(addr, cmd, length, buffer) {
        throw new Error("Not implemented");
    }

    i2cRead(addr, length, buffer, cb) {
        peripheral(this, addr, (err, device) => {
            if (err) {
                return cb(err);
            }

            device.readPartial(length, buffer, cb);
        });
    }

    i2cReadSync(addr, length, buffer) {
        return peripheralSync(this, addr).readPartialSync(length, buffer);
    }

    i2cWrite(addr, length, buffer, cb) {
        peripheral(this, addr, (err, device) => {
            if (err) {
                return cb(err);
            }

            device.writePartial(length, buffer, cb);
        });
    }

    i2cWriteSync(addr, length, buffer) {
        return peripheralSync(this, addr).writePartialSync(length, buffer);
    }

    scan(cb) {
        throw new Error("Not implemented");
    }

    scanSync() {
        throw new Error("Not implemented");
    }
}
