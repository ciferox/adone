const binding = adone.nativeAddon(adone.std.path.join(__dirname, "native", "hid.node"));

adone.asNamespace(exports);

export class Device extends adone.event.Emitter {
    constructor(...args) {
        super();

        /**
         * We also want to inherit from `binding.HID`, but unfortunately,
         * it's not so easy for native Objects. For example, the
         * following won't work since `new` keyword isn't used:
         *
         * `binding.HID.apply(this, arguments);`
         *
         * So... we do this craziness instead...
         */
        const thisPlusArgs = new Array(arguments.length + 1);
        thisPlusArgs[0] = null;
        for (let i = 0; i < arguments.length; i++) {
            thisPlusArgs[i + 1] = args[i];
        }
        this._raw = new (Function.prototype.bind.apply(binding.HID, thisPlusArgs))();

        /* Now we have `this._raw` Object from which we need to
            inherit.  So, one solution is to simply copy all
            prototype methods over to `this` and binding them to
            `this._raw`
        */
        for (const i in binding.HID.prototype) {
            if (i !== "close" && i !== "read") {
                this[i] = binding.HID.prototype[i].bind(this._raw);
            }
        }

        /**
         * We are now done inheriting from `binding.HID` and EventEmitter.
         *
         * Now upon adding a new listener for "data" events, we start
         * polling the HID device using `read(...)`
         */
        this._paused = true;
        const self = this;
        self.on("newListener", (eventName, listener) => {
            if (eventName === "data") {
                process.nextTick(self.resume.bind(self));
            }
        });
    }

    close() {
        this._closing = true;
        this.removeAllListeners();
        this._raw.close();
        this._closed = true;
    }

    //Pauses the reader, which stops "data" events from being emitted
    pause() {
        this._paused = true;
    }

    read(callback) {
        if (this._closed) {
            throw new Error("Unable to read from a closed HID device");
        } else {
            return this._raw.read(callback);
        }
    }

    resume() {
        const self = this;
        if (self._paused && self.listeners("data").length > 0) {
            //Start polling & reading loop
            self._paused = false;
            self.read(function readFunc(err, data) {
                if (err) {
                    //Emit error and pause reading
                    self._paused = true;
                    if (!self._closing) {
                        self.emit("error", err);
                    }
                    //else ignore any errors if I'm closing the device
                } else {
                    //If there are no "data" listeners, we pause
                    if (self.listeners("data").length <= 0) {
                        self._paused = true;
                    }
                    //Keep reading if we aren't paused
                    if (!self._paused) {
                        self.read(readFunc);
                    }
                    //Now emit the event
                    self.emit("data", data);
                }
            });
        }
    }
}

export const devices = binding.devices;
