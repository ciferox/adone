const {
    is,
    std: { repl }
} = adone;

export class REPL {
    constructor(options) {
        this.options = options;
    }

    start() {
        if (is.string(this.options.banner)) {
            let banner = this.options.banner;
            if (this.options.ts) {
                banner += `, ${adone.cli.chalk.bold.hex("294e80")("TypeScript")} v${adone.typescript.version}`;
            }
            console.log(banner);
            this.options = adone.util.omit(this.options, "banner");
        }

        this.instance = repl.start({
            input: process.stdin,
            output: process.stdout,
            terminal: process.stdout.isTTY,
            useGlobal: true,
            ...this.options
        });

        let transform;
        if (this.options.ts) {
            this.ts = this.options.__.ts.register(this.options);
            transform = this.ts.getTransform(this.instance);
        } else {
            transform = (code, filename) => adone.js.babel.transform(code, {
                plugins: adone.module.BABEL_PLUGINS,
                parserOpts: {
                    allowAwaitOutsideFunction: true
                },
                filename
            }).code;
        }

        const originalEval = this.instance.eval;
        this.instance.eval = function (code, context, filename, callback) {
            try {
                if (code[0] === "(" && code[code.length - 1] === ")") {
                    code = code.slice(1, -1); // remove "(" and ")"
                }

                code = code.trim();
                if (!code) {
                    callback(null);
                    return;
                }

                code = transform(`${code}\n`, filename);
                if (!code) {
                    callback(null);
                    return;
                }
                return originalEval.call(this, code, context, filename, callback);
            } catch (err) {
                callback(err);
            }
        };
    }
}

export const start = (options) => {
    const r = new REPL(options);
    r.start();
    return r;
};
