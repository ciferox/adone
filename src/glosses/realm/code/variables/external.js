export default class ExternalVariable extends adone.realm.code.Variable {
    constructor(name, module) {
        super(name, adone.undefined);
        this.module = module;
    }
}
