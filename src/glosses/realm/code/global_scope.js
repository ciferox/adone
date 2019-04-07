const {
    realm: { code }
} = adone;

export default class GlobalScope extends code.Scope {
    constructor() {
        super();

        this.addDeclaration(new code.Variable({
            name: "global",
            rawValue: global
        }));
        this.addDeclaration(new code.UndefinedVariable());
    }
}
