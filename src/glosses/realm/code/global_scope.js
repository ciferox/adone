const {
    realm: { code }
} = adone;

export default class GlobalScope extends code.Scope {
    constructor() {
        super();

        this.add(new code.Variable("global", global));
        this.add(new code.UndefinedVariable());
        // this.add("console", new ast.Variable());
    }
}
