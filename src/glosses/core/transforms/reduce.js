

export default class extends adone.Transform {
    constructor(func, initial) {
        super();
        this.func = func;
        this.value = initial;
        this.first = true;
    }

    _transform(x) {
        if (this.first) {
            this.first = false;
            if (this.value === undefined) {  // no initial value
                this.value = x;
                return;
            }
        }
        const ret = this.func(this.value, x);
        if (adone.is.promise(ret)) {
            return ret.then((y) => this.value = y);
        }
        this.value = ret;
    }

    _flush() {
        this.push(this.value);
    }
}
