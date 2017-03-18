const { is, js: { compiler: { parse, generate } } } = adone;

export default class XBase {
    constructor({ code = null, ast = null, type = "script" } = {} ) {
        this.code = code;
        this.type = type;
        this.ast = ast;
    }

    parse() {
        if (is.null(this.ast)) {
            this.ast = parse(this.code, {
                sourceType: this.type,
                plugins: [
                    "decorators",
                    "functionBind"
                ]
            });
        }
    }

    generate() {
        const generated = generate(this.ast, {
            comments: false
        });
        this.code = generated.code;
    }
}
