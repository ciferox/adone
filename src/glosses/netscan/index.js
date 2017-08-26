export class MasscanScanner extends adone.event.EventEmitter {
    constructor(options) {
        super();
        this.options = options;
        this.native = adone.bind("masscan.node");
    }

    initialize() {
        this.worker = new this.native.MasscanWorker((event, value) => {
            this.emit(event, value);
        }, () => {
            this.emit("close");
        }, (error) => {
            this.emit("error", error);
        }, this.options);
        this.worker.initialize();
    }

    start() {
        return new Promise((resolve, reject) => {
            this.worker.start();
            this.on("close", resolve);
            this.on("error", reject);
        });
    }

    stop() {
        this.worker.stop();
    }
}
