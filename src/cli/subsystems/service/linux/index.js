const { is, std: { path, fs } } = adone;

const runtime = adone.lazify({
    systemd: "./systemd",
    systemv: "./systemv"
}, null, require);

export default class Service extends adone.EventEmitter {
    constructor(config) {
        super();

        let mode;
        if (is.string(config.mode)) {
            mode = config.mode;
        } else {
            mode = "systemv";
        }

        if ((mode === "systemd" && (fs.existsSync("/bin/systemctl") || fs.existsSync("/usr/bin/systemctl"))) ||
            (mode === "systemv" && fs.existsSync("/etc/init.d"))) {
            this.mode = mode;
        } else {
            throw new Error("Could not detect init system");
        }

        this.mode = mode;

        this._name = config.name || null;
        this.user = config.user || adone.util.userid.username();
        this.group = config.group || adone.util.userid.groupname();
        this.cwd = config.cwd || path.dirname(config.path);
        this._ev = config.env || [];
        this._suspendedEvents = [];

        this.path = is.string(config.path) ? path.resolve(config.path) : null;

        if (!this.path) {
            throw new Error("Script was not provided as a configuration attribute.");
        }

        // Create options
        const opts = {};
        for (const attr in this) {
            if (!is.function(this[attr])) {
                opts[attr] = this[attr];
            }
        }

        opts.name = this.label;
        opts.env = this.EnvironmentVariables;
        opts.usewrapper = config.usewrapper;

        // Create the generator
        this._gen = new runtime[this.mode](opts);

        // Handle generator events & bubble accordingly
        this._gen.on("install", () => {
            !this.isSuspended("install") && this.emit("install");
        });

        /**
         * @event uninstall
         * Fired when the uninstallation/removal completes.
         */
        this._gen.on("uninstall", () => {
            !this.isSuspended("uninstall") && this.emit("un(install)");
        });

        /**
         * @event enable
         * Fired when the enabling completes.
         */
        this._gen.on("enable", () => {
            !this.isSuspended("enable") && this.emit("enable");
        });

        /**
         * @event disable
         * Fired when the disabling completes.
         */
        this._gen.on("disable", () => {
            !this.isSuspended("disable") && this.emit("disable");
        });

        /**
         * @event alreadyinstalled
         * Fired when a duplicate #install is attempted.
         */
        this._gen.on("alreadyinstalled", () => {
            !this.isSuspended("alreadyinstalled") && this.emit("alreadyinstalled");
        });

        /**
         * @event invalidinstallation
         * Fired when an invalid installation is detected.
         */
        this._gen.on("invalidinstallation", () => {
            !this.isSuspended("invalidinstallation") && this.emit("invalidinstallation");
        });

        /**
         * @event start
         * Fired when the #start thisthod finishes.
         */
        this._gen.on("start", () => {
            !this.isSuspended("start") && this.emit("start");
        });

        /**
         * @event stop
         * Fired when the #stop thisthod finishes.
         */
        this._gen.on("stop", () => {
            !this.isSuspended("stop") && this.emit("stop");
        });

        /**
         * @event error
         * Fired when an error occurs. The error is passed as a callback to the listener.
         */
        this._gen.on("error", (err) => {
            !this.isSuspended("error") && this.emit("error", err);
        });

        /**
         * @event doesnotexist
         * Fired when an attempt to uninstall the service fails because it does not exist.
         */
        this._gen.on("doesnotexist", (err) => {
            !this.isSuspended("doesnotexist") && this.emit("doesnotexist");
        });
    }

    get name() {
        return this._name;
    }

    set name(value) {
        this._name = value;
    }

    get label() {
        return this.name.replace(/[^a-zA-Z0-9\_]+/gi, "").toLowerCase();
    }

    get EnvironmentVariables() {
        const ev = [];
        let tmp = {};
        if (Object.prototype.toString.call(this._ev) === "[object Array]") {
            this._ev.forEach((item) => {
                tmp = {};
                tmp[item.name] = item.value;
                ev.push(tmp);
            });
        } else {
            tmp[this._ev.name] = this._ev.value;
            ev.push(tmp);
        }
        return ev;
    }

    exists() {
        return this._gen.exists;
    }

    isSuspended(eventname) {
        return this._suspendedEvents.indexOf(eventname) >= 0;
    }

    suspendEvent(eventname) {
        if (!this.isSuspended(eventname)) {
            this._suspendedEvents.push(eventname);
        }
    }

    resumeEvent(eventname) {
        if (this.isSuspended(eventname)) {
            this._suspendedEvents.splice(this._suspendedEvents.indexOf(eventname), 1);
        }
    }

    install() {
        return this._gen.createProcess();
    }

    uninstall(callback) {
        const me = this;
        this.suspendEvent("stop");
        this.stop(() => {
            me.resumeEvent("stop");
            me.generator.removeProcess((success) => {
                callback && callback();
            });
        });
    }

    enable(callback) {
        this._gen.enable(callback || adone.noop);
    }

    disable(callback) {
        this._gen.disable(callback || adone.noop);
    }

    start(callback) {
        this._gen.start(callback);
    }

    stop(callback) {
        this._gen.stop(callback);
    }

    restart(callback) {
        const me = this;
        this.stop(() => {
            me.start(callback);
        });
    }
}
