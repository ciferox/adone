const {
    realm: { code }
} = adone;

export default class GlobalScope extends code.Scope {
    constructor() {
        super();

        this.addDeclaration(new code.Variable("global", global, true));
        this.addDeclaration(new code.UndefinedVariable());
    }
}
