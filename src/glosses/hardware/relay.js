const Board = require("./board");
const Collection = require("./mixins/collection");
const util = require("util");
const priv = new Map();

function Relay(opts) {

    let state;

    if (!(this instanceof Relay)) {
        return new Relay(opts);
    }

    Board.Component.call(
        this, opts = Board.Options(opts)
    );

    opts.type = opts.type || "NO";

    state = {
        isInverted: opts.type === "NC",
        isOn: false,
        value: null
    };

    priv.set(this, state);

    Object.defineProperties(this, {
        value: {
            get() {
                return Number(this.isOn);
            }
        },
        type: {
            get() {
                return state.isInverted ? "NC" : "NO";
            }
        },
        isOn: {
            get() {
                return state.isOn;
            }
        }
    });
}

/**
 * on Turn the relay on
 * @return {Relay}
 */
Relay.prototype.on = function () {
    const state = priv.get(this);

    this.io.digitalWrite(
        this.pin, state.isInverted ? this.io.LOW : this.io.HIGH
    );
    state.isOn = true;

    return this;
};

Relay.prototype.close = Relay.prototype.on;

/**
 * off Turn the relay off
 * @return {Relay}
 */
Relay.prototype.off = function () {
    const state = priv.get(this);

    this.io.digitalWrite(
        this.pin, state.isInverted ? this.io.HIGH : this.io.LOW
    );
    state.isOn = false;

    return this;
};

Relay.prototype.open = Relay.prototype.off;

/**
 * toggle Toggle the on/off state of the relay
 * @return {Relay}
 */
Relay.prototype.toggle = function () {
    const state = priv.get(this);

    if (state.isOn) {
        this.off();
    } else {
        this.on();
    }

    return this;
};

/**
 * Relays()
 * new Relays()
 *
 * Constructs an Array-like instance of all relays
 */
function Relays(numsOrObjects) {
    if (!(this instanceof Relays)) {
        return new Relays(numsOrObjects);
    }

    Object.defineProperty(this, "type", {
        value: Relay
    });

    Collection.call(this, numsOrObjects);
}

util.inherits(Relays, Collection);

/*
 * Relays, on()
 *
 * Turn all relays on
 *
 * eg. collection.on();
 *
 *
 * Relays, off()
 *
 * Turn all relays off
 *
 * eg. collection.off();
 *
 *
 * Relays, open()
 *
 * Open all relays
 *
 * eg. collection.open();
 *
 *
 * Relays, close()
 *
 * Close all relays
 *
 * eg. collection.close();
 *
 *
 * Relays, toggle()
 *
 * Toggle the state of all relays
 *
 * eg. collection.toggle();
 */

Collection.installMethodForwarding(
    Relays.prototype, Relay.prototype
);

// Assign Relays Collection class as static "method" of Relay.
// TODO: Eliminate .Array for 1.0.0
Relay.Array = Relays;
Relay.Collection = Relays;

/* istanbul ignore else */
if (process.env.IS_TEST_MODE) {
    Relay.purge = function () {
        priv.clear();
    };
}

module.exports = Relay;
