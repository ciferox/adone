export default class ModuleVariable extends adone.realm.code.Variable {
    constructor(rawValue) {
        super({
            name: "module",
            rawValue
        });
    }
}
