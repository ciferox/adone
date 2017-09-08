const {
    event: { EventEmitter }
} = adone;

// We create a basic promise so the caller can cancel the replication possibly
// before we have actually started listening to changes etc
export default class Replication extends EventEmitter {
    constructor() {
        super();
        this.cancelled = false;
        this.state = "pending";
        const self = this;
        const promise = new Promise(((fulfill, reject) => {
            self.once("complete", fulfill);
            self.once("error", reject);
        }));
        self.then = function (resolve, reject) {
            return promise.then(resolve, reject);
        };
        self.catch = function (reject) {
            return promise.catch(reject);
        };
        // As we allow error handling via "error" event as well,
        // put a stub in here so that rejecting never throws UnhandledError.
        self.catch(() => { });
    }

    cancel() {
        this.cancelled = true;
        this.state = "cancelled";
        this.emit("cancel");
    }

    ready(src, target) {
        const self = this;
        if (self._readyCalled) {
            return;
        }
        self._readyCalled = true;

        const onDestroy = () => {
            self.cancel();
        };
        src.once("destroyed", onDestroy);
        target.once("destroyed", onDestroy);
        const cleanup = () => {
            src.removeListener("destroyed", onDestroy);
            target.removeListener("destroyed", onDestroy);
        };
        self.once("complete", cleanup);
    }
}
