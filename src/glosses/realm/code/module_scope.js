const {
    realm: { code }
} = adone;

export default class ModuleScope extends code.Scope {
    constructor(module) {
        super(/*module.ast.program.body*/);
        this.module = module;
    }
}
