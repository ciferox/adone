adone.lazify({
    hid: "./hid",
    serial: "./serial",
    Accelerometer: "./accelerometer",
    Animation: "./animation",
    Altimeter: "./altimeter",
    Barometer: "./barometer",
    Board: "./board",
    Button: "./button",
    Color: "./color",
    Collection: "./mixins/collection",
    Compass: "./compass",
    ESC: "./esc",
    Expander: "./expander",
    Fn: "./fn",
    GPS: "./gps",
    Gripper: "./gripper",
    Gyro: "./gyro",
    Hygrometer: "./hygrometer",
    IMU: "./imu",
    Multi: () => adone.hardware.IMU,
    Keypad: "./keypad",
    LCD: "./lcd",
    Led: "./led",
    LedControl: "./led/ledcontrol",
    Light: "./light",
    Joystick: "./joystick",
    Motion: "./motion",
    Motor: "./motor",
    Piezo: "./piezo",
    Ping: "./ping",
    Pin: "./pin",
    Proximity: "./proximity",
    Relay: "./relay",
    Repl: "./repl",
    Sensor: "./sensor",
    Servo: "./servo",
    ShiftRegister: "./shiftregister",
    Sonar: "./sonar",
    Stepper: "./stepper",
    Switch: "./switch",
    Thermometer: "./thermometer",
    Wii: "./wii",
    Analog: () => (opts) => new adone.hardware.Sensor(opts),
    Digital: () => (opts) => {
        let pin;

        if (adone.is.number(opts) || adone.is.string(opts)) {
            pin = opts;
            opts = {
                type: "digital",
                pin
            };
        } else {
            opts.type = opts.type || "digital";
        }

        return new adone.hardware.Sensor(opts);
    },
    Luxmeter: () => (options) => new adone.hardware.Light(options),
    Magnetometer: () => (options) => new adone.hardware.Compass(options),
    // Direct Alias
    Touchpad: () => adone.hardware.Keypad,
    // Back Compat
    Nunchuk: () => adone.hardware.Wii.Nunchuk,
    IR: () => ({
        Reflect: adone.lazify({
            Array: "./reflectancearray",
            Collection: "./reflectancearray"
        }, null, require)
    }),
    // Short-handing, Aliases
    Boards: () => adone.hardware.Board.Collection,
    Buttons: () => adone.hardware.Button.Collection,
    ESCs: () => adone.hardware.ESC.Collection,
    Leds: () => adone.hardware.Led.Collection,
    Motors: () => adone.hardware.Motor.Collection,
    Pins: () => adone.hardware.Pin.Collection,
    Relays: () => adone.hardware.Relay.Collection,
    Sensors: () => adone.hardware.Sensor.Collection,
    Servos: () => adone.hardware.Servo.Collection,
    Switches: () => adone.hardware.Switch.Collection
}, exports, require);
