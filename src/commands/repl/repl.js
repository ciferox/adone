// async/await support implementation is taken from https://github.com/nfcampos/await-outside

const {
    is,
    std: { repl, vm }
} = adone;

/**
 * - allow whitespace before everything else
 * - optionally capture `var|let|const <varname> = `
 * - varname only matches if it starts with a-Z or _ or $
 * and if contains only those chars or numbers
 * - this is overly restrictive but is easier to maintain
 * - capture `await <anything that follows it>`
 */
const re = /^\s*((?:(?:var|const|let)\s+)?[a-zA-Z_$][0-9a-zA-Z_$]*\s*=\s*)?(\(?\s*await[\s\S]*)/;

const isAwaitOutside = (source) => re.test(source);

const RESULT = "__await_outside_result";

// see https://github.com/nodejs/node/blob/master/lib/repl.js#L1371
const isRecoverableError = function (error) {
    if (error && error.name === "SyntaxError") {
        const message = error.message;
        if (
            message === "Unterminated template literal" ||
            message === "Missing } in template expression"
        ) {
            return true;
        }

        if (
            message.startsWith("Unexpected end of input") ||
            message.startsWith("missing ) after argument list") ||
            message.startsWith("Unexpected token")
        ) {
            return true;
        }
    }
    return false;
};


const formatError = function (error, source) {
    // promises can be rejected with non-error values
    if (!error.stack) {
        return error;
    }

    const firstLineOfSource = `at repl:${0}`;
    const lastLineOfSource = `at repl:${source.split("\n").length - 1}`;

    let frames = error.stack.split("\n");

    frames = frames
        // remove __async invocation from stack
        .filter((l) => !l.trim().startsWith(firstLineOfSource))
        // remove IIFE invocation from stack
        .filter((l) => !l.trim().startsWith(lastLineOfSource))
        // remove any frames inside this file (ie. inside __async helper)
        .filter((l) => !l.includes(__filename));

    error.stack = frames.join("\n");

    return error;
};

export default class REPL {
    constructor(options) {
        this.options = options;
    }

    start() {
        if (is.string(this.options.banner)) {
            console.log(this.options.banner);
        }

        this.instance = repl.start(adone.util.omit(this.options, "banner"));

        const originalEval = this.instance.eval;

        this.instance.eval = function (source, context, filename, cb) {
            if (isAwaitOutside(source)) {
                const [_, assign, expression] = source.match(re);

                // strange indentation keeps column offset correct in stack traces
                const wrappedExpression = `(async function() { try { ${assign ? `global.${RESULT} =` : "return"} (
${expression.trim()}
); } catch(e) { global.ERROR = e; throw e; } }())`;

                const assignment = assign
                    ? `${assign.trim()} global.${RESULT}; void delete global.${RESULT};`
                    : null;

                let transpiledSource;
                let script;
                try {
                    const options = { filename, displayErrors: true, lineOffset: -1 };
                    transpiledSource = wrappedExpression;
                    script = vm.createScript(transpiledSource, options);
                } catch (e) {
                    cb(isRecoverableError(e)
                        ? new repl.Recoverable(e)
                        : e
                    );
                    return;
                }

                const runScript = (script) => {
                    const options = { displayErrors: true, breakOnSigint: true };
                    return this.useGlobal
                        ? script.runInThisContext(options)
                        : script.runInContext(context, options);
                };

                runScript(script)
                    .then((r) => assignment ? runScript(vm.createScript(assignment)) : r)
                    .then((r) => cb(null, r))
                    .catch((err) => cb(formatError(err, transpiledSource)));
            } else {
                return originalEval.call(this, source, context, filename, cb);
            }
        };
    }
}
