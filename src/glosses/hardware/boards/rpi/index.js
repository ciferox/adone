const { is } = adone;

// Constants
const INPUT_MODE = 0;
const OUTPUT_MODE = 1;
const ANALOG_MODE = 2;
const PWM_MODE = 3;
const SERVO_MODE = 4;
const UNKNOWN_MODE = 99;

const LOW = 0;
const HIGH = 1;

const LED_PIN = -1;

const SOFTWARE_PWM_RANGE = 1000;
const SOFTWARE_PWM_FREQUENCY = 50;

// Settings
const DEFAULT_SERVO_MIN = 1000;
const DEFAULT_SERVO_MAX = 2000;
const DIGITAL_READ_UPDATE_RATE = 19;

// Private symbols
const isReady = Symbol("isReady");
const pins = Symbol("pins");
const instances = Symbol("instances");
const analogPins = Symbol("analogPins");
const getPinInstance = Symbol("getPinInstance");
const i2c = Symbol("i2c");
const i2cDelay = Symbol("i2cDelay");
const i2cRead = Symbol("i2cRead");
const i2cCheckAlive = Symbol("i2cCheckAlive");
const pinMode = Symbol("pinMode");
const serial = Symbol("serial");
const serialQueue = Symbol("serialQueue");
const addToSerialQueue = Symbol("addToSerialQueue");
const serialPump = Symbol("serialPump");
const isSerialProcessing = Symbol("isSerialProcessing");
const isSerialOpen = Symbol("isSerialOpen");

const SERIAL_ACTION_WRITE = "SERIAL_ACTION_WRITE";
const SERIAL_ACTION_CLOSE = "SERIAL_ACTION_CLOSE";
const SERIAL_ACTION_FLUSH = "SERIAL_ACTION_FLUSH";
const SERIAL_ACTION_CONFIG = "SERIAL_ACTION_CONFIG";
const SERIAL_ACTION_READ = "SERIAL_ACTION_READ";
const SERIAL_ACTION_STOP = "SERIAL_ACTION_STOP";

const bufferToArray = (buffer) => {
    const array = Array(buffer.length);
    for (let i = 0; i < buffer.length; i++) {
        array[i] = buffer[i];
    }
    return array;
};

adone.lazify({
    Peripheral: "./peripheral",
    board: "./board",
    serial: "./serial",
    gpio: "./gpio",
    i2c: "./i2c",
    led: "./led",
    pwm: "./pwm",
    softPwm: "./soft_pwm"
}, exports, require);

export class IO extends adone.EventEmitter {
    constructor({ includePins, excludePins, enableSerial, enableSoftPwm = false } = {}) {
        super();

        if (is.undefined(enableSerial)) {
            const board = adone.hardware.board.rpi.board;
            enableSerial = board.getBoardRevision() !== board.VERSION_3_MODEL_B && board.getBoardRevision() !== board.VERSION_1_MODEL_ZERO_W;
        }

        Object.defineProperties(this, {
            name: {
                enumerable: true,
                value: "RaspberryPi-IO"
            },

            [instances]: {
                writable: true,
                value: []
            },

            [isReady]: {
                writable: true,
                value: false
            },
            isReady: {
                enumerable: true,
                get() {
                    return this[isReady];
                }
            },

            [pins]: {
                writable: true,
                value: []
            },
            pins: {
                enumerable: true,
                get() {
                    return this[pins];
                }
            },

            [analogPins]: {
                writable: true,
                value: []
            },
            analogPins: {
                enumerable: true,
                get() {
                    return this[analogPins];
                }
            },

            [i2c]: {
                writable: true,
                value: new adone.hardware.board.rpi.i2c.I2C()
            },

            [i2cDelay]: {
                writable: true,
                value: 0
            },

            [serialQueue]: {
                value: []
            },

            [isSerialProcessing]: {
                writable: true,
                value: false
            },

            [isSerialOpen]: {
                writable: true,
                value: false
            },

            MODES: {
                enumerable: true,
                value: Object.freeze({
                    INPUT: INPUT_MODE,
                    OUTPUT: OUTPUT_MODE,
                    ANALOG: ANALOG_MODE,
                    PWM: PWM_MODE,
                    SERVO: SERVO_MODE
                })
            },

            HIGH: {
                enumerable: true,
                value: HIGH
            },
            LOW: {
                enumerable: true,
                value: LOW
            },

            defaultLed: {
                enumerable: true,
                value: LED_PIN
            }
        });

        if (enableSerial) {
            Object.defineProperties(this, {
                [serial]: {
                    writable: true,
                    value: new adone.hardware.board.rpi.serial.Serial()
                },
                SERIAL_PORT_IDs: {
                    enumerable: true,
                    value: Object.freeze({
                        HW_SERIAL0: adone.hardware.board.rpi.serial.DEFAULT_PORT,
                        DEFAULT: adone.hardware.board.rpi.serial.DEFAULT_PORT
                    })
                }

            });
        } else {
            Object.defineProperties(this, {
                SERIAL_PORT_IDs: {
                    enumerable: true,
                    value: Object.freeze({})
                }

            });
        }

        process.nextTick(() => {
            let pinMappings = adone.hardware.board.rpi.board.getPins();
            this[pins] = [];

            // Slight hack to get the LED in there, since it's not actually a pin
            pinMappings[LED_PIN] = {
                pins: [LED_PIN],
                peripherals: ["gpio"]
            };

            if (includePins && excludePins) {
                throw new Error('"includePins" and "excludePins" cannot be specified at the same time');
            }

            if (is.array(includePins)) {
                const newPinMappings = {};
                for (const pin of includePins) {
                    const normalizedPin = adone.hardware.board.rpi.board.getPinNumber(pin);
                    if (is.null(normalizedPin)) {
                        throw new Error(`Invalid pin "${pin}" specified in includePins`);
                    }
                    newPinMappings[normalizedPin] = pinMappings[normalizedPin];
                }
                pinMappings = newPinMappings;
            } else if (is.array(excludePins)) {
                pinMappings = Object.assign({}, pinMappings);
                for (const pin of excludePins) {
                    const normalizedPin = adone.hardware.board.rpi.board.getPinNumber(pin);
                    if (is.null(normalizedPin)) {
                        throw new Error(`Invalid pin "${pin}" specified in excludePins`);
                    }
                    delete pinMappings[normalizedPin];
                }
            }

            Object.keys(pinMappings).forEach((pin) => {
                const pinInfo = pinMappings[pin];
                const supportedModes = [];
                // We don't want I2C to be used for anything else, since changing the
                // pin mode makes it unable to ever do I2C again.
                if (pinInfo.peripherals.indexOf("i2c") === -1 && pinInfo.peripherals.indexOf("uart") === -1) {
                    if (pin === LED_PIN) {
                        supportedModes.push(OUTPUT_MODE);
                    } else if (pinInfo.peripherals.indexOf("gpio") !== -1) {
                        supportedModes.push(INPUT_MODE, OUTPUT_MODE);
                    }
                    if (pinInfo.peripherals.indexOf("pwm") !== -1) {
                        supportedModes.push(PWM_MODE, SERVO_MODE);
                    } else if (enableSoftPwm === true && pinInfo.peripherals.indexOf("gpio") !== -1) {
                        supportedModes.push(PWM_MODE, SERVO_MODE);
                    }
                }
                const instance = this[instances][pin] = {
                    peripheral: null,
                    mode: supportedModes.indexOf(OUTPUT_MODE) === -1 ? UNKNOWN_MODE : OUTPUT_MODE,

                    // Used to cache the previously written value for reading back in OUTPUT mode
                    // We start with undefined because it's in an unknown state
                    previousWrittenValue: undefined,

                    // Used to set the default min and max values
                    min: DEFAULT_SERVO_MIN,
                    max: DEFAULT_SERVO_MAX,

                    // Used to track if this pin is capable of hardware PWM
                    isHardwarePwm: pinInfo.peripherals.indexOf("pwm") !== -1
                };
                this[pins][pin] = Object.create(null, {
                    supportedModes: {
                        enumerable: true,
                        value: Object.freeze(supportedModes)
                    },
                    mode: {
                        enumerable: true,
                        get() {
                            return instance.mode;
                        }
                    },
                    value: {
                        enumerable: true,
                        get() {
                            switch (instance.mode) {
                                case INPUT_MODE:
                                    return instance.peripheral.read();
                                case OUTPUT_MODE:
                                    return instance.previousWrittenValue;
                                default:
                                    return null;
                            }
                        },
                        set(value) {
                            if (instance.mode === OUTPUT_MODE) {
                                instance.peripheral.write(value);
                            }
                        }
                    },
                    report: {
                        enumerable: true,
                        value: 1
                    },
                    analogChannel: {
                        enumerable: true,
                        value: 127
                    }
                });
                if (instance.mode === OUTPUT_MODE) {
                    this.pinMode(pin, OUTPUT_MODE);
                    this.digitalWrite(pin, LOW);
                }
            });

            // Fill in the holes, sins pins are sparse on the A+/B+/2
            for (let i = 0; i < this[pins].length; i++) {
                if (!this[pins][i]) {
                    this[pins][i] = Object.create(null, {
                        supportedModes: {
                            enumerable: true,
                            value: Object.freeze([])
                        },
                        mode: {
                            enumerable: true,
                            get() {
                                return UNKNOWN_MODE;
                            }
                        },
                        value: {
                            enumerable: true,
                            get() {
                                return 0;
                            },
                            set() { }
                        },
                        report: {
                            enumerable: true,
                            value: 1
                        },
                        analogChannel: {
                            enumerable: true,
                            value: 127
                        }
                    });
                }
            }

            if (enableSerial) {
                this.serialConfig({
                    portId: adone.hardware.board.rpi.serial.DEFAULT_PORT,
                    baud: 9600
                });
            }

            this[isReady] = true;
            this.emit("ready");
            this.emit("connect");
        });
    }

    reset() {
        throw new Error("reset is not supported on the Raspberry Pi");
    }

    normalize(pin) {
        const normalizedPin = adone.hardware.board.rpi.board.getPinNumber(pin);
        if (!is.number(normalizedPin)) {
            throw new Error(`Unknown pin "${pin}"`);
        }
        return normalizedPin;
    }

    [getPinInstance](pin) {
        const pinInstance = this[instances][pin];
        if (!pinInstance) {
            throw new Error(`Unknown pin "${pin}"`);
        }
        return pinInstance;
    }

    pinMode(pin, mode) {
        this[pinMode]({ pin, mode });
    }

    [pinMode]({ pin, mode, pullResistor = adone.hardware.board.rpi.gpio.PULL_NONE }) {
        const normalizedPin = this.normalize(pin);
        const pinInstance = this[getPinInstance](normalizedPin);
        pinInstance.pullResistor = pullResistor;
        const config = {
            pin: normalizedPin,
            pullResistor: pinInstance.pullResistor,
            enableListener: false
        };
        if (this[pins][normalizedPin].supportedModes.indexOf(mode) === -1) {
            let modeName;
            switch (mode) {
                case INPUT_MODE: modeName = "input"; break;
                case OUTPUT_MODE: modeName = "output"; break;
                case ANALOG_MODE: modeName = "analog"; break;
                case PWM_MODE: modeName = "pwm"; break;
                case SERVO_MODE: modeName = "servo"; break;
                default: modeName = "other"; break;
            }
            throw new Error(`Pin "${pin}" does not support mode "${modeName}"`);
        }

        if (pin === LED_PIN) {
            if (pinInstance.peripheral instanceof adone.hardware.board.rpi.led.LED) {
                return;
            }
            pinInstance.peripheral = new adone.hardware.board.rpi.led.LED();
        } else {
            switch (mode) {
                case INPUT_MODE:
                    pinInstance.peripheral = new adone.hardware.board.rpi.gpio.DigitalInput(config);
                    break;
                case OUTPUT_MODE:
                    pinInstance.peripheral = new adone.hardware.board.rpi.gpio.DigitalOutput(config);
                    break;
                case PWM_MODE:
                case SERVO_MODE:
                    if (pinInstance.isHardwarePwm) {
                        pinInstance.peripheral = new adone.hardware.board.rpi.pwm.PWM(normalizedPin);
                    } else {
                        pinInstance.peripheral = new adone.hardware.board.rpi.softPwm.SoftPWM({
                            pin: normalizedPin,
                            frequency: SOFTWARE_PWM_FREQUENCY,
                            range: SOFTWARE_PWM_RANGE
                        });
                    }
                    break;
                default:
                    console.warn(`Unknown pin mode: ${mode}`); // eslint-disable-line no-console
                    break;
            }
        }
        pinInstance.mode = mode;
    }

    analogRead() {
        throw new Error("analogRead is not supported on the Raspberry Pi");
    }

    analogWrite(pin, value) {
        this.pwmWrite(pin, value);
    }

    pwmWrite(pin, value) {
        const pinInstance = this[getPinInstance](this.normalize(pin));
        if (pinInstance.mode !== PWM_MODE) {
            this.pinMode(pin, PWM_MODE);
        }
        pinInstance.peripheral.write(value / 255);
    }

    digitalRead(pin, handler) {
        const pinInstance = this[getPinInstance](this.normalize(pin));
        if (pinInstance.mode !== INPUT_MODE) {
            this.pinMode(pin, INPUT_MODE);
        }
        const interval = setInterval(() => {
            let value;
            if (pinInstance.mode === INPUT_MODE) {
                value = pinInstance.peripheral.read();
            } else {
                value = pinInstance.previousWrittenValue;
            }
            if (handler) {
                handler(value);
            }
            this.emit(`digital-read-${pin}`, value);
        }, DIGITAL_READ_UPDATE_RATE);
        pinInstance.peripheral.on("destroyed", () => {
            clearInterval(interval);
        });
    }

    digitalWrite(pin, value) {
        const pinInstance = this[getPinInstance](this.normalize(pin));
        if (pinInstance.mode === INPUT_MODE && value === HIGH) {
            this[pinMode]({ pin, mode: INPUT_MODE, pullResistor: adone.hardware.board.rpi.gpio.PULL_UP });
        } else if (pinInstance.mode === INPUT_MODE && value === LOW) {
            this[pinMode]({ pin, mode: INPUT_MODE, pullResistor: adone.hardware.board.rpi.gpio.PULL_DOWN });
        } else if (pinInstance.mode !== OUTPUT_MODE) {
            this[pinMode]({ pin, mode: OUTPUT_MODE });
        }
        if (pinInstance.mode === OUTPUT_MODE && value !== pinInstance.previousWrittenValue) {
            pinInstance.peripheral.write(value ? HIGH : LOW);
            pinInstance.previousWrittenValue = value;
        }
    }

    servoConfig(pin, min, max) {
        let config = pin;
        if (!is.plainObject(config)) {
            config = { pin, min, max };
        }
        if (!is.number(config.min)) {
            config.min = DEFAULT_SERVO_MIN;
        }
        if (!is.number(config.max)) {
            config.max = DEFAULT_SERVO_MAX;
        }
        const normalizedPin = this.normalize(pin);
        this[pinMode]({
            pin: normalizedPin,
            mode: SERVO_MODE
        });
        const pinInstance = this[getPinInstance](this.normalize(normalizedPin));
        pinInstance.min = config.min;
        pinInstance.max = config.max;
    }

    servoWrite(pin, value) {
        const pinInstance = this[getPinInstance](this.normalize(pin));
        if (pinInstance.mode !== SERVO_MODE) {
            this.pinMode(pin, SERVO_MODE);
        }
        const period = 1000000 / pinInstance.peripheral.frequency; // in us
        const pulseWidth = (pinInstance.min + (value / 180) * (pinInstance.max - pinInstance.min)); // in us
        pinInstance.peripheral.write(pulseWidth / period);
    }

    queryCapabilities(cb) {
        if (this.isReady) {
            process.nextTick(cb);
        } else {
            this.on("ready", cb);
        }
    }

    queryAnalogMapping(cb) {
        if (this.isReady) {
            process.nextTick(cb);
        } else {
            this.on("ready", cb);
        }
    }

    queryPinState(pin, cb) {
        if (this.isReady) {
            process.nextTick(cb);
        } else {
            this.on("ready", cb);
        }
    }

    [i2cCheckAlive]() {
        if (!this[i2c].alive) {
            throw new Error("I2C pins not in I2C mode");
        }
    }

    i2cConfig(options) {
        let delay;

        if (is.number(options)) {
            delay = options;
        } else {
            if (is.plainObject(options) && !is.null(options)) {
                delay = options.delay;
            }
        }

        this[i2cCheckAlive]();

        this[i2cDelay] = Math.round((delay || 0) / 1000);

        return this;
    }

    i2cWrite(address, cmdRegOrData, inBytes) {
        this[i2cCheckAlive]();

        // If i2cWrite was used for an i2cWriteReg call...
        if (arguments.length === 3 && !is.array(cmdRegOrData) && !is.array(inBytes)) {
            return this.i2cWriteReg(address, cmdRegOrData, inBytes);
        }

        // Fix arguments if called with Firmata.js API
        if (arguments.length === 2) {
            if (is.array(cmdRegOrData)) {
                inBytes = cmdRegOrData.slice();
                cmdRegOrData = inBytes.shift();
            } else {
                inBytes = [];
            }
        }

        const buffer = Buffer.from([cmdRegOrData].concat(inBytes));

        // Only write if bytes provided
        if (buffer.length) {
            this[i2c].writeSync(address, buffer);
        }

        return this;
    }

    i2cWriteReg(address, register, value) {
        this[i2cCheckAlive]();

        this[i2c].writeByteSync(address, register, value);

        return this;
    }

    [i2cRead](continuous, address, register, bytesToRead, callback) {
        this[i2cCheckAlive]();

        // Fix arguments if called with Firmata.js API
        if (arguments.length === 4 && is.number(register) && is.function(bytesToRead)) {
            callback = bytesToRead;
            bytesToRead = register;
            register = null;
        }

        callback = is.function(callback) ? callback : adone.noop;

        let event = `i2c-reply-${address}-`;
        event += !is.null(register) ? register : 0;

        const read = () => {
            const afterRead = (err, buffer) => {
                if (err) {
                    return this.emit("error", err);
                }

                // Convert buffer to Array before emit
                this.emit(event, Array.prototype.slice.call(buffer));

                if (continuous) {
                    setTimeout(read, this[i2cDelay]);
                }
            };

            this.once(event, callback);

            if (!is.null(register)) {
                this[i2c].read(address, register, bytesToRead, afterRead);
            } else {
                this[i2c].read(address, bytesToRead, afterRead);
            }
        };

        setTimeout(read, this[i2cDelay]);

        return this;
    }

    i2cRead(...rest) {
        return this[i2cRead](true, ...rest);
    }

    i2cReadOnce(...rest) {
        return this[i2cRead](false, ...rest);
    }

    sendI2CConfig(...rest) {
        return this.i2cConfig(...rest);
    }

    sendI2CWriteRequest(...rest) {
        return this.i2cWrite(...rest);
    }

    sendI2CReadRequest(...rest) {
        return this.i2cReadOnce(...rest);
    }

    serialConfig({ portId, baud }) {
        if (!this[isSerialOpen] || (baud && baud !== this[serial].baudRate)) {
            this[addToSerialQueue]({
                type: SERIAL_ACTION_CONFIG,
                portId,
                baud
            });
        }
    }

    serialWrite(portId, inBytes) {
        this[addToSerialQueue]({
            type: SERIAL_ACTION_WRITE,
            portId,
            inBytes
        });
    }

    serialRead(portId, maxBytesToRead, handler) {
        if (is.function(maxBytesToRead)) {
            handler = maxBytesToRead;
            maxBytesToRead = undefined;
        }
        this[addToSerialQueue]({
            type: SERIAL_ACTION_READ,
            portId,
            maxBytesToRead,
            handler
        });
    }

    serialStop(portId) {
        this[addToSerialQueue]({
            type: SERIAL_ACTION_STOP,
            portId
        });
    }

    serialClose(portId) {
        this[addToSerialQueue]({
            type: SERIAL_ACTION_CLOSE,
            portId
        });
    }

    serialFlush(portId) {
        this[addToSerialQueue]({
            type: SERIAL_ACTION_FLUSH,
            portId
        });
    }

    [addToSerialQueue](action) {
        if (action.portId !== adone.hardware.board.rpi.serial.DEFAULT_PORT) {
            throw new Error(`Invalid serial port "${action.portId}"`);
        }
        this[serialQueue].push(action);
        this[serialPump]();
    }

    [serialPump]() {
        if (this[isSerialProcessing] || !this[serialQueue].length) {
            return;
        }
        this[isSerialProcessing] = true;
        const action = this[serialQueue].shift();
        const finalize = () => {
            this[isSerialProcessing] = false;
            this[serialPump]();
        };
        switch (action.type) {
            case SERIAL_ACTION_WRITE:
                if (!this[isSerialOpen]) {
                    throw new Error("Cannot write to closed serial port");
                }
                this[serial].write(action.inBytes, finalize);
                break;

            case SERIAL_ACTION_READ:
                if (!this[isSerialOpen]) {
                    throw new Error("Cannot read from closed serial port");
                }
                // TODO: add support for action.maxBytesToRead
                this[serial].on("data", (data) => {
                    action.handler(bufferToArray(data));
                });
                process.nextTick(finalize);
                break;

            case SERIAL_ACTION_STOP:
                if (!this[isSerialOpen]) {
                    throw new Error("Cannot stop closed serial port");
                }
                this[serial].removeAllListeners();
                process.nextTick(finalize);
                break;

            case SERIAL_ACTION_CONFIG:
                this[serial].close(() => {
                    this[serial] = new adone.hardware.board.rpi.serial.Serial({
                        baudRate: action.baud
                    });
                    this[serial].open(() => {
                        this[serial].on("data", (data) => {
                            this.emit(`serial-data-${action.portId}`, bufferToArray(data));
                        });
                        this[isSerialOpen] = true;
                        finalize();
                    });
                });
                break;

            case SERIAL_ACTION_CLOSE:
                this[serial].close(() => {
                    this[isSerialOpen] = false;
                    finalize();
                });
                break;

            case SERIAL_ACTION_FLUSH:
                if (!this[isSerialOpen]) {
                    throw new Error("Cannot flush closed serial port");
                }
                this[serial].flush(finalize);
                break;

            default:
                throw new Error("Internal error: unknown serial action type");
        }
    }

    sendOneWireConfig() {
        throw new Error("sendOneWireConfig is not supported on the Raspberry Pi");
    }

    sendOneWireSearch() {
        throw new Error("sendOneWireSearch is not supported on the Raspberry Pi");
    }

    sendOneWireAlarmsSearch() {
        throw new Error("sendOneWireAlarmsSearch is not supported on the Raspberry Pi");
    }

    sendOneWireRead() {
        throw new Error("sendOneWireRead is not supported on the Raspberry Pi");
    }

    sendOneWireReset() {
        throw new Error("sendOneWireConfig is not supported on the Raspberry Pi");
    }

    sendOneWireWrite() {
        throw new Error("sendOneWireWrite is not supported on the Raspberry Pi");
    }

    sendOneWireDelay() {
        throw new Error("sendOneWireDelay is not supported on the Raspberry Pi");
    }

    sendOneWireWriteAndRead() {
        throw new Error("sendOneWireWriteAndRead is not supported on the Raspberry Pi");
    }

    setSamplingInterval() {
        throw new Error("setSamplingInterval is not yet implemented");
    }

    reportAnalogPin() {
        throw new Error("reportAnalogPin is not yet implemented");
    }

    reportDigitalPin() {
        throw new Error("reportDigitalPin is not yet implemented");
    }

    pingRead() {
        throw new Error("pingRead is not yet implemented");
    }

    pulseIn() {
        throw new Error("pulseIn is not yet implemented");
    }

    stepperConfig() {
        throw new Error("stepperConfig is not yet implemented");
    }

    stepperStep() {
        throw new Error("stepperStep is not yet implemented");
    }
}
