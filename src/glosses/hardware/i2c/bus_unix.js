const { is, std: { fs } } = adone;
const i2c = adone.nativeAddon("i2c.node");

const DEVICE_PREFIX = "/dev/i2c-";
const FIRST_SCAN_ADDR = 0x03;
const LAST_SCAN_ADDR = 0x77;

class I2cFuncs {
    constructor(i2cFuncBits) {
        this.i2c = i2cFuncBits & i2c.I2C_FUNC_I2C;
        this.tenBitAddr = i2cFuncBits & i2c.I2C_FUNC_10BIT_ADDR;
        this.protocolMangling = i2cFuncBits & i2c.I2C_FUNC_PROTOCOL_MANGLING;
        this.smbusPec = i2cFuncBits & i2c.I2C_FUNC_SMBUS_PEC;
        this.smbusBlockProcCall = i2cFuncBits & i2c.I2C_FUNC_SMBUS_BLOCK_PROC_CALL;
        this.smbusQuick = i2cFuncBits & i2c.I2C_FUNC_SMBUS_QUICK;
        this.smbusReceiveByte = i2cFuncBits & i2c.I2C_FUNC_SMBUS_READ_BYTE;
        this.smbusSendByte = i2cFuncBits & i2c.I2C_FUNC_SMBUS_WRITE_BYTE;
        this.smbusReadByte = i2cFuncBits & i2c.I2C_FUNC_SMBUS_READ_BYTE_DATA;
        this.smbusWriteByte = i2cFuncBits & i2c.I2C_FUNC_SMBUS_WRITE_BYTE_DATA;
        this.smbusReadWord = i2cFuncBits & i2c.I2C_FUNC_SMBUS_READ_WORD_DATA;
        this.smbusWriteWord = i2cFuncBits & i2c.I2C_FUNC_SMBUS_WRITE_WORD_DATA;
        this.smbusProcCall = i2cFuncBits & i2c.I2C_FUNC_SMBUS_PROC_CALL;
        this.smbusReadBlock = i2cFuncBits & i2c.I2C_FUNC_SMBUS_READ_BLOCK_DATA;
        this.smbusWriteBlock = i2cFuncBits & i2c.I2C_FUNC_SMBUS_WRITE_BLOCK_DATA;
        this.smbusReadI2cBlock = i2cFuncBits & i2c.I2C_FUNC_SMBUS_READ_I2C_BLOCK;
        this.smbusWriteI2cBlock = i2cFuncBits & i2c.I2C_FUNC_SMBUS_WRITE_I2C_BLOCK;
    }
}

const peripheral = (bus, addr, cb) => {
    const device = bus._peripherals[addr];

    if (is.undefined(device)) {
        fs.open(DEVICE_PREFIX + bus._busNumber, "r+", (err, device) => {
            if (err) {
                return cb(err);
            }

            bus._peripherals[addr] = device;

            i2c.setAddrAsync(device, addr, bus._forceAccess, (err) => {
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

const peripheralSync = (bus, addr) => {
    let peripheral = bus._peripherals[addr];

    if (is.undefined(peripheral)) {
        peripheral = adone.std.fs.openSync(DEVICE_PREFIX + bus._busNumber, "r+");
        bus._peripherals[addr] = peripheral;
        i2c.setAddrSync(peripheral, addr, bus._forceAccess);
    }

    return peripheral;
};

export default class Bus {
    constructor(busNumber, options) {
        options = options || {};

        this._busNumber = busNumber;
        this._forceAccess = Boolean(options.forceAccess) || false;
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

            fs.close(peripherals.pop(), (err) => {
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
                fs.closeSync(peripheral);
            }
        });
        this._peripherals = [];
    }

    i2cFuncs(cb) {
        if (!this.funcs) {
            peripheral(this, 0, (err, device) => {
                if (err) {
                    return cb(err);
                }

                i2c.i2cFuncsAsync(device, function (err, i2cFuncBits) {
                    if (err) {
                        return cb(err);
                    }
                    this.funcs = Object.freeze(new I2cFuncs(i2cFuncBits));
                    cb(null, this.funcs);
                });
            });
        } else {
            setImmediate(cb, null, this.funcs);
        }
    }

    i2cFuncsSync() {
        if (!this.funcs) {
            this.funcs = Object.freeze(new I2cFuncs(i2c.i2cFuncsSync(peripheralSync(this, 0))));
        }

        return this.funcs;
    }

    readByte(addr, cmd, cb) {
        peripheral(this, addr, (err, device) => {
            if (err) {
                return cb(err);
            }

            i2c.readByteAsync(device, cmd, cb);
        });
    }

    readByteSync(addr, cmd) {
        return i2c.readByteSync(peripheralSync(this, addr), cmd);
    }

    readWord(addr, cmd, cb) {
        peripheral(this, addr, (err, device) => {
            if (err) {
                return cb(err);
            }

            i2c.readWordAsync(device, cmd, cb);
        });
    }

    readWordSync(addr, cmd) {
        return i2c.readWordSync(peripheralSync(this, addr), cmd);
    }

    // UNTESTED and undocumented due to lack of supporting hardware
    readBlock(addr, cmd, buffer, cb) {
        peripheral(this, addr, (err, device) => {
            if (err) {
                return cb(err);
            }

            i2c.readBlockAsync(device, cmd, buffer, cb);
        });
    }

    // UNTESTED and undocumented due to lack of supporting hardware
    readBlockSync(addr, cmd, buffer) {
        return i2c.readBlockSync(peripheralSync(this, addr), cmd, buffer);
    }

    readI2cBlock(addr, cmd, length, buffer, cb) {
        peripheral(this, addr, (err, device) => {
            if (err) {
                return cb(err);
            }

            i2c.readI2cBlockAsync(device, cmd, length, buffer, cb);
        });
    }

    readI2cBlockSync(addr, cmd, length, buffer) {
        return i2c.readI2cBlockSync(peripheralSync(this, addr), cmd, length, buffer);
    }

    receiveByte(addr, cb) {
        peripheral(this, addr, (err, device) => {
            if (err) {
                return cb(err);
            }

            i2c.receiveByteAsync(device, cb);
        });
    }

    receiveByteSync(addr) {
        return i2c.receiveByteSync(peripheralSync(this, addr));
    }

    sendByte(addr, byte, cb) {
        peripheral(this, addr, (err, device) => {
            if (err) {
                return cb(err);
            }

            i2c.sendByteAsync(device, byte, cb);
        });
    }

    sendByteSync(addr, byte) {
        i2c.sendByteSync(peripheralSync(this, addr), byte);
        return this;
    }

    writeByte(addr, cmd, byte, cb) {
        peripheral(this, addr, (err, device) => {
            if (err) {
                return cb(err);
            }

            i2c.writeByteAsync(device, cmd, byte, cb);
        });
    }

    writeByteSync(addr, cmd, byte) {
        i2c.writeByteSync(peripheralSync(this, addr), cmd, byte);
        return this;
    }

    writeWord(addr, cmd, word, cb) {
        peripheral(this, addr, (err, device) => {
            if (err) {
                return cb(err);
            }

            i2c.writeWordAsync(device, cmd, word, cb);
        });
    }

    writeWordSync(addr, cmd, word) {
        i2c.writeWordSync(peripheralSync(this, addr), cmd, word);
        return this;
    }

    writeQuick(addr, bit, cb) {
        peripheral(this, addr, (err, device) => {
            if (err) {
                return cb(err);
            }

            i2c.writeQuickAsync(device, bit, cb);
        });
    }

    writeQuickSync(addr, bit) {
        i2c.writeQuickSync(peripheralSync(this, addr), bit);
        return this;
    }

    // UNTESTED and undocumented due to lack of supporting hardware
    writeBlock(addr, cmd, length, buffer, cb) {
        peripheral(this, addr, (err, device) => {
            if (err) {
                return cb(err);
            }

            i2c.writeBlockAsync(device, cmd, length, buffer, cb);
        });
    }

    // UNTESTED and undocumented due to lack of supporting hardware
    writeBlockSync(addr, cmd, length, buffer) {
        i2c.writeBlockSync(peripheralSync(this, addr), cmd, length, buffer);
        return this;
    }

    writeI2cBlock(addr, cmd, length, buffer, cb) {
        peripheral(this, addr, (err, device) => {
            if (err) {
                return cb(err);
            }

            i2c.writeI2cBlockAsync(device, cmd, length, buffer, cb);
        });
    }

    writeI2cBlockSync(addr, cmd, length, buffer) {
        i2c.writeI2cBlockSync(peripheralSync(this, addr), cmd, length, buffer);
        return this;
    }

    i2cRead(addr, length, buffer, cb) {
        peripheral(this, addr, (err, device) => {
            if (err) {
                return cb(err);
            }

            fs.read(device, buffer, 0, length, 0, cb);
        });
    }

    i2cReadSync(addr, length, buffer) {
        return fs.readSync(peripheralSync(this, addr), buffer, 0, length, 0);
    }

    i2cWrite(addr, length, buffer, cb) {
        peripheral(this, addr, (err, device) => {
            if (err) {
                return cb(err);
            }

            fs.write(device, buffer, 0, length, 0, cb);
        });
    }

    i2cWriteSync(addr, length, buffer) {
        return fs.writeSync(peripheralSync(this, addr), buffer, 0, length, 0);
    }

    scan(cb) {
        const addresses = [];
        const scanBus = adone.hardware.i2c.open(this._busNumber, { forceAccess: this._forceAccess }, (err) => {
            if (err) {
                return cb(err);
            }

            (function next(addr) {
                if (addr > LAST_SCAN_ADDR) {
                    return scanBus.close((err) => {
                        if (err) {
                            return cb(err);
                        }
                        cb(null, addresses);
                    });
                }

                scanBus.receiveByte(addr, (err) => {
                    if (!err) {
                        addresses.push(addr);
                    }

                    next(addr + 1);
                });
            }(FIRST_SCAN_ADDR));
        });
    }

    scanSync() {
        const scanBus = adone.hardware.i2c.openSync(this._busNumber, { forceAccess: this._forceAccess });
        const addresses = [];
        let addr;

        for (addr = FIRST_SCAN_ADDR; addr <= LAST_SCAN_ADDR; addr += 1) {
            try {
                scanBus.receiveByteSync(addr);
                addresses.push(addr);
            } catch (ignore) {
            }
        }

        scanBus.closeSync();
        return addresses;
    }
}
