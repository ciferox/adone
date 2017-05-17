const { existsSync, writeFileSync, readFileSync } = adone.std.fs;

const hasLed = existsSync("/sys/class/leds/led0") && existsSync("/sys/class/leds/led0/trigger") && existsSync("/sys/class/leds/led0/brightness");

export const OFF = 0;
export const ON = 1;

export class LED extends adone.hardware.board.rpi.Peripheral {
    constructor() {
        super([]);
        if (hasLed) {
            writeFileSync("/sys/class/leds/led0/trigger", "none");
        }
    }

    read() {
        if (hasLed) {
            return parseInt(readFileSync("/sys/class/leds/led0/brightness").toString(), 10) ? ON : OFF;
        }
        return OFF;
    }

    write(value) {
        this.validateAlive();
        if ([ON, OFF].indexOf(value) === -1) {
            throw new Error(`Invalid LED value ${value}`);
        }
        if (hasLed) {
            writeFileSync("/sys/class/leds/led0/brightness", value ? "255" : "0");
        }
    }

}
