

export default class extends adone.Transform {
    constructor(fn) {
        super();
        this._fn = fn;
    }

    _transform(chunk) {
        this._fn.call(this, chunk);
    }
}
