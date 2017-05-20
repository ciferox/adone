const { is } = adone;

const checkAddress = (address) => {
    if (!is.number(address) || address < 0 || address > 0x7f) {
        throw new Error(`Invalid I2C address ${address}. Valid addresses are 0 through 0x7f.`);
    }
};

const checkRegister = (register) => {
    if (!is.undefined(register) && (!is.number(register) || register < 0 || register > 0xff)) {
        throw new Error(`Invalid I2C register ${register}. Valid registers are 0 through 0xff.`);
    }
};

const checkLength = (length, hasRegister) => {
    if (!is.number(length) || length < 0 || (hasRegister && length > 32)) {
        // Enforce 32 byte length limit only for SMBus.
        throw new Error(`Invalid I2C length ${length}. Valid lengths are 0 through 32.`);
    }
};

const checkBuffer = (buffer, hasRegister) => {
    if (!is.buffer(buffer) || buffer.length < 0 || (hasRegister && buffer.length > 32)) {
        // Enforce 32 byte length limit only for SMBus.
        throw new Error("Invalid I2C buffer. Valid lengths are 0 through 32.");
    }
};

const checkByte = (byte) => {
    if (!is.number(byte) || byte < 0 || byte > 0xff) {
        throw new Error(`Invalid I2C byte ${byte}. Valid values are 0 through 0xff.`);
    }
};

const checkWord = (word) => {
    if (!is.number(word) || word < 0 || word > 0xffff) {
        throw new Error(`Invalid I2C word ${word}. Valid values are 0 through 0xffff.`);
    }
};

const checkCallback = (cb) => {
    if (!is.function(cb)) {
        throw new Error("Invalid I2C callback");
    }
};

const createReadCallback = (suppliedCallback) => {
    return (err, resultOrBytesRead, result) => {
        if (suppliedCallback) {
            if (err) {
                suppliedCallback(err, null);
            } else if (!is.undefined(result)) {
                suppliedCallback(null, result);
            } else {
                suppliedCallback(null, resultOrBytesRead);
            }
        }
    };
};

const createWriteCallback = (suppliedCallback) => {
    return (err) => {
        if (suppliedCallback) {
            suppliedCallback(err || null);
        }
    };
};

const getPins = (config) => {
    let pins;
    if (is.array(config)) {
        pins = config;
    } else if (is.plainObject(config) && is.array(config.pins)) {
        pins = config.pins;
    } else {
        pins = ["SDA0", "SCL0"];
    }
    return pins;
};

export class I2C extends adone.hardware.board.rpi.Peripheral {
    constructor(config) {
        super(getPins(config));
        this.devices = [];
        adone.std.child_process.execSync("modprobe i2c-dev");
    }

    destroy() {
        this.devices.forEach((device) => device.closeSync());
        this.devices = [];
        super.destroy();
    }

    _getDevice(address: number) {
        let device = this.devices[address];

        if (is.undefined(device)) {
            device = adone.hardware.i2c.openSync(adone.hardware.board.rpi.board.getBoardRevision() === adone.hardware.board.rpi.board.VERSION_1_MODEL_B_REV_1 ? 0 : 1);
            this.devices[address] = device;
        }

        return device;
    }

    read(address, registerOrLength, lengthOrCb, cb) {
        this.validateAlive();

        let length;
        let register;
        if (is.function(cb) && is.number(lengthOrCb)) {
            length = lengthOrCb;
            register = registerOrLength;
        } else if (is.function(lengthOrCb)) {
            cb = lengthOrCb;
            length = registerOrLength;
            register = undefined;
        } else {
            throw new TypeError("Invalid I2C read arguments");
        }

        checkAddress(address);
        checkRegister(register);
        checkLength(length, Boolean(register));
        checkCallback(cb);

        const buffer = Buffer.allocUnsafe(length);

        if (is.undefined(register)) {
            this._getDevice(address).i2cRead(address, length, buffer, createReadCallback(cb));
        } else {
            this._getDevice(address).readI2cBlock(address, register, length, buffer, createReadCallback(cb));
        }
    }

    readSync(address, registerOrLength, length) {
        this.validateAlive();

        let register;
        if (is.undefined(length)) {
            length = registerOrLength;
        } else {
            register = registerOrLength;
        }

        checkAddress(address);
        checkRegister(register);
        checkLength(length, Boolean(register));

        const buffer = Buffer.allocUnsafe(length);

        if (is.undefined(register)) {
            this._getDevice(address).i2cReadSync(address, length, buffer);
        } else {
            this._getDevice(address).readI2cBlockSync(address, register, length, buffer);
        }

        return buffer;
    }

    readByte(address, registerOrCb, cb) {
        this.validateAlive();

        let register;
        if (is.function(registerOrCb)) {
            cb = registerOrCb;
            register = undefined;
        }

        checkAddress(address);
        checkRegister(register);
        checkCallback(cb);

        if (is.undefined(register)) {
            const buffer = Buffer.allocUnsafe(1);
            this._getDevice(address).i2cRead(address, buffer.length, buffer, (err) => {
                if (err) {
                    if (cb) {
                        cb(err, null);
                    }
                } else if (cb) {
                    cb(null, buffer[0]);
                }
            });
        } else {
            this._getDevice(address).readByte(address, register, createReadCallback(cb));
        }
    }

    readByteSync(address, register) {
        this.validateAlive();

        checkAddress(address);
        checkRegister(register);

        let byte;
        if (is.undefined(register)) {
            const buffer = Buffer.allocUnsafe(1);
            this._getDevice(address).i2cReadSync(address, buffer.length, buffer);
            byte = buffer[0];
        } else {
            byte = this._getDevice(address).readByteSync(address, register);
        }
        return byte;
    }

    // public readWord(address: number, cb: IReadCallback): void;
    // public readWord(address: number, register: number, cb: IReadCallback): void;
    readWord(address, registerOrCb, cb) {
        this.validateAlive();

        let register;
        if (is.function(registerOrCb)) {
            cb = registerOrCb;
        }

        checkAddress(address);
        checkRegister(register);
        checkCallback(cb);

        if (is.undefined(register)) {
            const buffer = Buffer.allocUnsafe(2);
            this._getDevice(address).i2cRead(address, buffer.length, buffer, (err) => {
                if (cb) {
                    if (err) {
                        return cb(err, null);
                    }
                    cb(null, buffer.readUInt16LE(0));
                }
            });
        } else {
            this._getDevice(address).readWord(address, register, createReadCallback(cb));
        }
    }

    readWordSync(address, register) {
        this.validateAlive();

        checkAddress(address);
        checkRegister(register);

        let byte;
        if (is.undefined(register)) {
            const buffer = Buffer.allocUnsafe(2);
            this._getDevice(address).i2cReadSync(address, buffer.length, buffer);
            byte = buffer.readUInt16LE(0);
        } else {
            byte = this._getDevice(address).readWordSync(address, register);
        }
        return byte;
    }

    write(address, registerOrBuffer, bufferOrCb, cb) {
        this.validateAlive();

        let buffer;
        let register;
        if (is.buffer(registerOrBuffer)) {
            cb = bufferOrCb;
            buffer = registerOrBuffer;
            register = undefined;
        } else if (is.number(registerOrBuffer) && is.buffer(bufferOrCb)) {
            register = registerOrBuffer;
            buffer = bufferOrCb;
        } else {
            throw new TypeError("Invalid I2C write arguments");
        }

        checkAddress(address);
        checkRegister(register);
        checkBuffer(buffer, Boolean(register));

        if (is.undefined(register)) {
            this._getDevice(address).i2cWrite(address, buffer.length, buffer, createWriteCallback(cb));
        } else {
            this._getDevice(address).writeI2cBlock(address, register, buffer.length, buffer, createWriteCallback(cb));
        }
    }

    writeSync(address, registerOrBuffer, buffer) {
        this.validateAlive();

        let register;
        if (is.buffer(registerOrBuffer)) {
            buffer = registerOrBuffer;
        } else if (!buffer) {
            throw new Error("Invalid I2C write arguments");
        }

        checkAddress(address);
        checkRegister(register);
        checkBuffer(buffer, Boolean(register));

        if (is.undefined(register)) {
            this._getDevice(address).i2cWriteSync(address, buffer.length, buffer);
        } else {
            this._getDevice(address).writeI2cBlockSync(address, register, buffer.length, buffer);
        }
    }

    writeByte(address, registerOrByte, byteOrCb, cb) {
        this.validateAlive();

        let byte;
        let register;
        if (is.number(byteOrCb)) {
            byte = byteOrCb;
            register = registerOrByte;
        } else {
            cb = byteOrCb;
            byte = registerOrByte;
        }

        checkAddress(address);
        checkRegister(register);
        checkByte(byte);

        if (is.undefined(register)) {
            this._getDevice(address).i2cWrite(address, 1, Buffer.from([byte]), createWriteCallback(cb));
        } else {
            this._getDevice(address).writeByte(address, register, byte, createWriteCallback(cb));
        }
    }

    writeByteSync(address, registerOrByte, byte) {
        this.validateAlive();

        let register;
        if (is.undefined(byte)) {
            byte = registerOrByte;
        } else {
            register = registerOrByte;
        }

        checkAddress(address);
        checkRegister(register);
        checkByte(byte);

        if (is.undefined(register)) {
            this._getDevice(address).i2cWriteSync(address, 1, Buffer.from([byte]));
        } else {
            this._getDevice(address).writeByteSync(address, register, byte);
        }
    }

    writeWord(address, registerOrWord, wordOrCb, cb) {
        this.validateAlive();

        let register;
        let word;
        if (is.number(wordOrCb)) {
            register = registerOrWord;
            word = wordOrCb;
        } else if (is.function(wordOrCb)) {
            word = registerOrWord;
            cb = wordOrCb;
        } else {
            throw new Error("Invalid I2C write arguments");
        }

        checkAddress(address);
        checkRegister(register);
        checkWord(word);

        if (is.undefined(register)) {
            const buffer = Buffer.allocUnsafe(2);
            buffer.writeUInt16LE(word, 0);
            this._getDevice(address).i2cWrite(address, buffer.length, buffer, createWriteCallback(cb));
        } else {
            this._getDevice(address).writeWord(address, register, word, createWriteCallback(cb));
        }
    }

    writeWordSync(address, registerOrWord, word) {
        this.validateAlive();

        let register;
        if (is.undefined(word)) {
            word = registerOrWord;
        } else {
            register = registerOrWord;
        }

        checkAddress(address);
        checkRegister(register);
        checkWord(word);

        if (is.undefined(register)) {
            const buffer = Buffer.allocUnsafe(2);
            buffer.writeUInt16LE(word, 0);
            this._getDevice(address).i2cWriteSync(address, buffer.length, buffer);
        } else {
            this._getDevice(address).writeWordSync(address, register, word);
        }
    }
}
