export default class ExternalVariable extends adone.realm.code.Variable {
    constructor(name, module) {
        super({
            name
        });
        this.module = module;
    }
}
