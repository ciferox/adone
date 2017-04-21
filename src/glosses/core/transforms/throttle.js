export default class extends adone.Transform {
    constructor(timeout, ...args) {
        super(...args);
        this.timeout = timeout;
        this.opened = true;
    }

    _transform(x) {
        if (this.opened) {
            this.push(x);
            this.opened = false;
            setTimeout(() => {
                this.opened = true;
            }, this.timeout);
        }
    }
}
