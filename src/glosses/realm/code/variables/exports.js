export default class ExportsVariable extends adone.realm.code.Variable {
    constructor(rawValue) {
        super({
            name: "exports",
            rawValue
        });
    }
}
