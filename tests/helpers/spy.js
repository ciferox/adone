const { lodash: _ } = adone.vendor;

export default class Dummy {
    constructor() {
        const self = this;
        this.callback = function(...args) {
            const meta = {
                context: this,
                args,
                timestamp: new Date().getTime()
            };
            self.meta.push(meta);
            self.subscribers.slice().map((x) => x(() => self.unsubscribe(x), meta, self.calls));
        };
        this.meta = [];
        this.subid = 0;
        this.subscribers = [];
        this.timers = new Map();
    }

    reset() {
        this.meta = [];
    }
    
    get calls() {
        return this.meta.length;
    }

    get(index) {
        return this.meta[index];
    }

    find(callback) {
        for (let i = 0; i < this.meta.length; ++i) {
            const meta = this.meta[i];
            if (callback(meta, i)) {
                return [meta, i];
            }
        }
    }

    findByArgs(...args) {
        return this.find(({ args: _args }) => _.isEqual(_args.slice(0, args.length), args));
    }

    subscribe(callback) {
        this.subscribers.push(callback);
    }

    unsubscribe(callback) {
        this.subscribers.splice(this.subscribers.indexOf(callback), 1);
    }

    calledWithArgs() {
        return this.meta.map((x) => x.args);
    }

    waitForArgs(...args) {
        return new Promise((resolve) => {
            this.subscribe((unsubscribe, meta, i) => {
                if (_.isEqual(meta.args.slice(0, args.length), args)) {
                    unsubscribe();
                    resolve([meta, i]);
                }
            });
        });
    }

    waitForArg(i, value) {
        return new Promise((resolve) => {
            this.subscribe((unsubscribe, meta, idx) => {
                if (_.isEqual(meta.args[i], value)) {
                    unsubscribe();
                    resolve([meta, idx]);
                }
            });
        });
    }

    waitForCall() {
        return this.waitForNCalls(1).then(([[meta, i]]) => [meta, i]);
    }

    waitFor(callback) {
        return new Promise((resolve) => {
            this.subscribe((unsubscribe, meta, i) => {
                if (callback(meta, i)) {
                    unsubscribe();
                    resolve([meta, i]);
                }
            });
        });
    }

    waitForNCalls(n) {
        return new Promise((resolve) => {
            const buf = [];
            this.subscribe((unsubscribe, meta, i) => {
                buf.push([meta, i]);
                if (!--n) {
                    unsubscribe();
                    resolve(buf);
                }
            });
        });
    }

    time(name) {
        this.timers.set(name, process.hrtime());
    }

    timeEnd(name) {
        const [seconds, nanoseconds] = process.hrtime(this.timers.get(name));
        return seconds * 1000 + nanoseconds / 1e6;
    }
}