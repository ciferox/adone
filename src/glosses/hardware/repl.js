const Emitter = require("events").EventEmitter;
const repl = require("repl");
const util = require("util");

const priv = new Map();

// Ported from
// https://github.com/jgautier/firmata

function Repl(opts) {
    if (!Repl.isActive) {
        Repl.isActive = true;

        if (!(this instanceof Repl)) {
            return new Repl(opts);
        }

        // Store context values in instance property
        // this will be used for managing scope when
        // injecting new values into an existing Repl
        // session.
        this.context = {};
        this.ready = false;

        const state = {
            opts,
            board: opts.board
        };

        priv.set(this, state);

        // Store an accessible copy of the Repl instance
        // on a static property. This is later used by the
        // Board constructor to automattically setup Repl
        // sessions for all programs, which reduces the
        // boilerplate requirement.
        Repl.ref = this;
    } else {
        return Repl.ref;
    }
}

// Inherit event api
util.inherits(Repl, Emitter);

Repl.isActive = false;
Repl.isBlocked = false;

// See Repl.ref notes above.
Repl.ref = null;

Repl.prototype.initialize = function (callback) {
    const state = priv.get(this);

    process.stdin.resume();
    process.stdin.setEncoding("utf8");

    const replDefaults = {
        prompt: ">> ",
        useGlobal: false
    };

    // Call this immediately before repl.start to
    // avoid crash on Intel Edison
    state.board.info("Repl", "Initialized");

    // Initialize the REPL session with the default
    // repl settings.
    // Assign the returned repl instance to "cmd"
    const cmd = repl.start(replDefaults);

    this.ready = true;

    // Assign a reference to the REPL's "content" object
    // This will be use later by the Repl.prototype.inject
    // method for allowing user programs to inject their
    // own explicit values and reference
    this.cmd = cmd;
    this.context = cmd.context;

    cmd.on("exit", () => {
        state.board.emit("exit");
        state.board.warn("Board", "Closing.");

        var interval = setInterval(() => {
            /* istanbul ignore else */
            if (!state.board.io.pending) {
                clearInterval(interval);
                process.nextTick(process.reallyExit);
            }
        }, 1);
    });

    this.inject(state.opts);

    /* istanbul ignore else */
    if (callback) {
        process.nextTick(callback);
    }
};

Repl.prototype.close = function () {
    this.cmd.emit("exit");
};

Repl.prototype.inject = function (obj) {
    Object.keys(obj).forEach(function (key) {
        Object.defineProperty(
            this.context, key, Object.getOwnPropertyDescriptor(obj, key)
        );
    }, this);
};

module.exports = Repl;
