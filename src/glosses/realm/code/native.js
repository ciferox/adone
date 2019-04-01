export default class XNative extends adone.realm.code.Base {
    constructor(options) {
        super(options);
        if (adone.is.string(options.name)) {
            this.name = options.name;
        }
    }

    getType() {
        return "Native";
    }
}
