export default class UndefinedVariable extends adone.realm.code.Variable {
    constructor() {
        super({
            name: "undefined",
            rawValue: undefined
        });
    }
}
