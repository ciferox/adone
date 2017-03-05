const MAX_INTEGER = Number.MAX_SAFE_INTEGER >>> 0;

export default class SequenceId {
    constructor() {
        this._id = 0 >>> 0;
    }

    next() {
        if (this._id === MAX_INTEGER) {
            this._id = 1;
        } else {
            this._id++;
        }
        return this._id;
    }
}
