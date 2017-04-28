export const state = {
    delayed: "delayed",
    inactive: "inactive",
    active: "active",
    complete: "complete",
    failed: "failed"
};

export default class Job {
    constructor(data, emitter) {
        this.data = data;
        this._emitter = emitter;
    }

    log(...args) {
        this._emitter.emit("log", adone.std.util.format.apply(null, args));
    }

    progress(completed, total, data) {
        return this._emitter.emit("progress", completed, total, data);
    }
}
