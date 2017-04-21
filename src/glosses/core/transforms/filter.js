export default class extends adone.Transform {
    constructor(func, opts) {
        super(opts);
        this.func = func;
    }

    _transform(x) {
        const ret = this.func(x);
        if (adone.is.promise(ret)) {
            return ret.then((y) => y && this.push(x));
        }
        if (ret) {
            this.push(x);
        }
    }
}
