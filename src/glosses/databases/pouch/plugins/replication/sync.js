const {
    is,
    util,
    event: { EventEmitter },
    database: { pouch }
} = adone;

const {
    plugin: { replication }
} = pouch;

const {
    util: {
        toPouch
    }
} = adone.private(pouch);

class Sync extends EventEmitter {
    constructor(src, target, opts, callback) {
        super();
        const self = this;
        this.canceled = false;

        const optsPush = opts.push ? { ...opts, ...opts.push } : opts;
        const optsPull = opts.pull ? { ...opts, ...opts.pull } : opts;

        this.push = replication.replicate(src, target, optsPush);
        this.pull = replication.replicate(target, src, optsPull);

        this.pushPaused = true;
        this.pullPaused = true;

        const pullChange = (change) => {
            self.emit("change", {
                direction: "pull",
                change
            });
        };
        const pushChange = (change) => {
            self.emit("change", {
                direction: "push",
                change
            });
        };
        const pushDenied = (doc) => {
            self.emit("denied", {
                direction: "push",
                doc
            });
        };
        const pullDenied = (doc) => {
            self.emit("denied", {
                direction: "pull",
                doc
            });
        };
        const pushPaused = () => {
            self.pushPaused = true;
            /* istanbul ignore if */
            if (self.pullPaused) {
                self.emit("paused");
            }
        };
        const pullPaused = () => {
            self.pullPaused = true;
            /* istanbul ignore if */
            if (self.pushPaused) {
                self.emit("paused");
            }
        };
        const pushActive = () => {
            self.pushPaused = false;
            /* istanbul ignore if */
            if (self.pullPaused) {
                self.emit("active", {
                    direction: "push"
                });
            }
        };
        const pullActive = () => {
            self.pullPaused = false;
            /* istanbul ignore if */
            if (self.pushPaused) {
                self.emit("active", {
                    direction: "pull"
                });
            }
        };

        const removed = {};

        const removeAll = (type) => { // type is 'push' or 'pull'
            return function (event, func) {
                const isChange = event === "change" &&
                    (func === pullChange || func === pushChange);
                const isDenied = event === "denied" &&
                    (func === pullDenied || func === pushDenied);
                const isPaused = event === "paused" &&
                    (func === pullPaused || func === pushPaused);
                const isActive = event === "active" &&
                    (func === pullActive || func === pushActive);

                if (isChange || isDenied || isPaused || isActive) {
                    if (!(event in removed)) {
                        removed[event] = {};
                    }
                    removed[event][type] = true;
                    if (Object.keys(removed[event]).length === 2) {
                        // both push and pull have asked to be removed
                        self.removeAllListeners(event);
                    }
                }
            };
        };

        if (opts.live) {
            this.push.on("complete", self.pull.cancel.bind(self.pull));
            this.pull.on("complete", self.push.cancel.bind(self.push));
        }

        const addOneListener = (ee, event, listener) => {
            if (ee.listeners(event).indexOf(listener) == -1) {
                ee.on(event, listener);
            }
        };

        this.on("newListener", (event) => {
            if (event === "change") {
                addOneListener(self.pull, "change", pullChange);
                addOneListener(self.push, "change", pushChange);
            } else if (event === "denied") {
                addOneListener(self.pull, "denied", pullDenied);
                addOneListener(self.push, "denied", pushDenied);
            } else if (event === "active") {
                addOneListener(self.pull, "active", pullActive);
                addOneListener(self.push, "active", pushActive);
            } else if (event === "paused") {
                addOneListener(self.pull, "paused", pullPaused);
                addOneListener(self.push, "paused", pushPaused);
            }
        });

        this.on("removeListener", (event) => {
            if (event === "change") {
                self.pull.removeListener("change", pullChange);
                self.push.removeListener("change", pushChange);
            } else if (event === "denied") {
                self.pull.removeListener("denied", pullDenied);
                self.push.removeListener("denied", pushDenied);
            } else if (event === "active") {
                self.pull.removeListener("active", pullActive);
                self.push.removeListener("active", pushActive);
            } else if (event === "paused") {
                self.pull.removeListener("paused", pullPaused);
                self.push.removeListener("paused", pushPaused);
            }
        });

        this.pull.on("removeListener", removeAll("pull"));
        this.push.on("removeListener", removeAll("push"));

        const promise = Promise.all([
            this.push,
            this.pull
        ]).then((resp) => {
            const out = {
                push: resp[0],
                pull: resp[1]
            };
            self.emit("complete", out);
            if (callback) {
                callback(null, out);
            }
            self.removeAllListeners();
            return out;
        }, (err) => {
            self.cancel();
            if (callback) {
                // if there's a callback, then the callback can receive
                // the error event
                callback(err);
            } else {
                // if there's no callback, then we're safe to emit an error
                // event, which would otherwise throw an unhandled error
                // due to 'error' being a special event in EventEmitters
                self.emit("error", err);
            }
            self.removeAllListeners();
            if (callback) {
                // no sense throwing if we're already emitting an 'error' event
                throw err;
            }
        });

        this.then = function (success, err) {
            return promise.then(success, err);
        };

        this.catch = function (err) {
            return promise.catch(err);
        };
    }

    cancel() {
        if (!this.canceled) {
            this.canceled = true;
            this.push.cancel();
            this.pull.cancel();
        }
    }
}

export default function sync(src, target, opts, callback) {
    if (is.function(opts)) {
        callback = opts;
        opts = {};
    }
    if (is.undefined(opts)) {
        opts = {};
    }
    opts = util.clone(opts);
    /*jshint validthis:true */
    opts.PouchConstructor = opts.PouchConstructor || this;
    src = toPouch(src, opts);
    target = toPouch(target, opts);
    return new Sync(src, target, opts, callback);
}
