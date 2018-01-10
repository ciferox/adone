const { is } = adone;
const native = adone.nativeAddon("rpigpio.node");

let initialized = false;

const initializePigpio = () => {
    if (!initialized) {
        native.gpioInitialise();
        initialized = true;
    }
};


export class Gpio extends adone.event.EventEmitter {
    constructor(gpio, options) {
        super();
        initializePigpio();

        options = options || {};

        this.gpio = Number(gpio);

        if (is.number(options.mode)) {
            this.mode(options.mode);
        }

        if (is.numbert(options.pullUpDown)) {
            this.pullUpDown(options.pullUpDown);
        }

        if (is.number(options.edge)) {
            this.enableInterrupt(options.edge,
                is.number(options.timeout) ? options.timeout : 0
            );
        }

        if (is.boolean(options.alert) && options.alert) {
            this.enableAlert();
        }
    }

    mode(mode) {
        // What happens if the mode is INPUT, there is an ISR, and the mode is
        // changed to OUTPUT (or anything else for that matter)?
        native.gpioSetMode(this.gpio, Number(mode));
        return this;
    }

    getMode() {
        return native.gpioGetMode(this.gpio);
    }

    pullUpDown(pud) {
        native.gpioSetPullUpDown(this.gpio, Number(pud));
        return this;
    }

    digitalRead() {
        return native.gpioRead(this.gpio);
    }

    digitalWrite(level) {
        native.gpioWrite(this.gpio, Number(level));
        return this;
    }

    trigger(pulseLen, level) {
        native.gpioTrigger(this.gpio, Number(pulseLen), Number(level));
        return this;
    }

    pwmWrite(dutyCycle) {
        native.gpioPWM(this.gpio, Number(dutyCycle));
        return this;
    }

    hardwarePwmWrite(frequency, dutyCycle) {
        native.gpioHardwarePWM(this.gpio, Number(frequency), Number(dutyCycle));
        return this;
    }

    getPwmDutyCycle() {
        return native.gpioGetPWMdutycycle(this.gpio);
    }

    pwmRange(range) {
        native.gpioSetPWMrange(this.gpio, Number(range));
        return this;
    }

    getPwmRange() {
        return native.gpioGetPWMrange(this.gpio);
    }

    getPwmRealRange() {
        return native.gpioGetPWMrealRange(this.gpio);
    }

    pwmFrequency(frequency) {
        native.gpioSetPWMfrequency(this.gpio, Number(frequency));
        return this;
    }

    getPwmFrequency() {
        return native.gpioGetPWMfrequency(this.gpio);
    }

    servoWrite(pulseWidth) {
        native.gpioServo(this.gpio, Number(pulseWidth));
        return this;
    }

    getServoPulseWidth() {
        return native.gpioGetServoPulsewidth(this.gpio);
    }

    enableInterrupt(edge, timeout) {
        const handler = function (gpio, level, tick) {
            this.emit("interrupt", level);
        }.bind(this);

        timeout = timeout || 0;
        native.gpioSetISRFunc(this.gpio, Number(edge), Number(timeout), handler);
        return this;
    }

    disableInterrupt() {
        native.gpioSetISRFunc(this.gpio, Gpio.EITHER_EDGE, 0);
        return this;
    }

    enableAlert() {
        const handler = function (gpio, level, tick) {
            this.emit("alert", level, tick);
        }.bind(this);

        native.gpioSetAlertFunc(this.gpio, handler);
        return this;
    }

    disableAlert() {
        native.gpioSetAlertFunc(this.gpio);
        return this;
    }
}
Gpio.prototype.analogWrite = Gpio.prototype.pwmWrite;

/* mode */
Gpio.INPUT = 0; // PI_INPUT
Gpio.OUTPUT = 1; //PI_OUTPUT;
Gpio.ALT0 = 4; // PI_ALT0;
Gpio.ALT1 = 5; // PI_ALT1;
Gpio.ALT2 = 6; // PI_ALT2;
Gpio.ALT3 = 7; // PI_ALT3;
Gpio.ALT4 = 3; // PI_ALT4;
Gpio.ALT5 = 2; // PI_ALT5;

/* pud */
Gpio.PUD_OFF = 0; // PI_PUD_OFF;
Gpio.PUD_DOWN = 1; // PI_PUD_DOWN;
Gpio.PUD_UP = 2; // PI_PUD_UP;

/* isr */
Gpio.RISING_EDGE = 0; // RISING_EDGE;
Gpio.FALLING_EDGE = 1; // FALLING_EDGE;
Gpio.EITHER_EDGE = 2; // EITHER_EDGE;

/* timeout */
Gpio.TIMEOUT = 2; // PI_TIMEOUT;

/* gpio numbers */
Gpio.MIN_GPIO = 0; // PI_MIN_GPIO;
Gpio.MAX_GPIO = 53; // PI_MAX_GPIO;
Gpio.MAX_USER_GPIO = 31; // PI_MAX_USER_GPIO;


export class GpioBank {
    constructor(bank) {
        initializePigpio();

        this.bankNo = bank || GpioBank.BANK1;
    }

    read() {
        if (this.bankNo === GpioBank.BANK1) {
            return native.GpioReadBits_0_31();
        } else if (this.bankNo === GpioBank.BANK2) {
            return native.GpioReadBits_32_53();
        }
    }

    set(bits) {
        if (this.bankNo === GpioBank.BANK1) {
            native.GpioWriteBitsSet_0_31(Number(bits));
        } else if (this.bankNo === GpioBank.BANK2) {
            native.GpioWriteBitsSet_32_53(Number(bits));
        }

        return this;
    }

    clear(bits) {
        if (this.bankNo === GpioBank.BANK1) {
            native.GpioWriteBitsClear_0_31(Number(bits));
        } else if (this.bankNo === GpioBank.BANK2) {
            native.GpioWriteBitsClear_32_53(Number(bits));
        }

        return this;
    }

    bank() {
        return this.bankNo;
    }
}
GpioBank.BANK1 = 1;
GpioBank.BANK2 = 2;


const NOTIFICATION_PIPE_PATH_PREFIX = "/dev/pigpio";

export class Notifier {
    constructor(options) {
    
        initializePigpio();

        options = options || {};

        this.handle = native.gpioNotifyOpenWithSize(1048576);

        // set highWaterMark to a multiple of NOTIFICATION_LENGTH to avoid 'data'
        // events being emitted with buffers containing partial notifications.
        this.notificationStream =
            adone.std.fs.createReadStream(NOTIFICATION_PIPE_PATH_PREFIX + this.handle, {
                highWaterMark: Notifier.NOTIFICATION_LENGTH * 5000
            });

        if (is.number(options.bits)) {
            this.start(options.bits);
        }
    }

    start(bits) {
        native.gpioNotifyBegin(this.handle, Number(bits));
        return this;
    }

    stop() {
        native.gpioNotifyPause(this.handle);
        return this;
    }

    close() {
        native.gpioNotifyClose(this.handle);
    }

    stream() {
        return this.notificationStream;
    }
}
Notifier.NOTIFICATION_LENGTH = 12;
Notifier.PI_NTFY_FLAGS_ALIVE = 1 << 6;


export const hardwareRevision = () => native.gpioHardwareRevision();
export const initialize = () => initializePigpio();
export const terminate = () => native.gpioTerminate();
export const configureClock = (microseconds, peripheral) => {
    native.gpioCfgClock(Number(microseconds), Number(peripheral));
    initializePigpio();
};
export const CLOCK_PWM = 0; // PI_CLOCK_PWM;
export const CLOCK_PCM = 1; // PI_CLOCK_PCM;


export const LOW = 0;
export const HIGH = 1;

export const PULL_NONE = Gpio.PUD_OFF;
export const PULL_DOWN = Gpio.PUD_DOWN;
export const PULL_UP = Gpio.PUD_UP;

const parseConfig = (config) => {
    let pin;
    let pullResistor;
    if (is.number(config) || is.string(config)) {
        pin = config;
        pullResistor = PULL_NONE;
    } else if (is.plainObject(config)) {
        pin = config.pin;
        pullResistor = config.pullResistor || PULL_NONE;
        if ([PULL_NONE, PULL_DOWN, PULL_UP].indexOf(pullResistor) === -1) {
            throw new Error(`Invalid pull resistor option ${pullResistor}`);
        }
    } else {
        throw new Error("Invalid pin or configuration");
    }
    return {
        pin,
        pullResistor
    };
};

const getPin = (alias, pin) => {
    const gpioPin = adone.hardware.board.rpi.gpio.getGpioNumber(pin);
    if (is.null(gpioPin)) {
        throw new Error(`Internal error: ${alias} was parsed as a valid pin, but couldn't be resolved to a GPIO pin`);
    }
    return gpioPin;
};

export class DigitalOutput extends adone.hardware.board.rpi.Peripheral {
    constructor(config) {
        const parsedConfig = parseConfig(config);
        super(parsedConfig.pin);
        this.output = new Gpio(getPin(parsedConfig.pin, this.pins[0]), {
            mode: Gpio.OUTPUT,
            pullUpDown: parsedConfig.pullResistor
        });
    }

    get value() {
        return this.currentValue;
    }

    write(value) {
        if (!this.alive) {
            throw new Error("Attempted to write to a destroyed peripheral");
        }
        if ([LOW, HIGH].indexOf(value) === -1) {
            throw new Error(`Invalid write value ${value}`);
        }
        this.currentValue = value;
        this.output.digitalWrite(this.value);
        this.emit("change", this.value);
    }
}

export class DigitalInput extends adone.hardware.board.rpi.Peripheral {
    constructor(config) {
        const parsedConfig = parseConfig(config);
        super(parsedConfig.pin);
        this.input = new Gpio(getPin(parsedConfig.pin, this.pins[0]), {
            mode: Gpio.INPUT,
            pullUpDown: parsedConfig.pullResistor
        });
        this.input.enableInterrupt(Gpio.EITHER_EDGE);
        this.input.on("interrupt", (level) => setTimeout(() => {
            this.currentValue = level;
            this.emit("change", this.value);
        }));
        this.currentValue = this.input.digitalRead();
    }

    get value() {
        return this.currentValue;
    }

    read() {
        if (!this.alive) {
            throw new Error("Attempted to read from a destroyed peripheral");
        }
        this.currentValue = this.input.digitalRead();
        return this.value;
    }
}
