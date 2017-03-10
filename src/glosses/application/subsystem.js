

export default class Subsystem extends adone.EventEmitter {
    constructor() {
        super();

        this.app = this;
        this._ = this.data = { };
    }

    initialize() {

    }

    uninitialize() {

    }

    defineCommand(...args) {
        return this.app.defineCommand(this, ...args);
    }
}
adone.tag.set(Subsystem, adone.tag.SUBSYSTEM);
