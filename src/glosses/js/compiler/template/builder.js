import {
    merge,
    validate
} from "./options";
import stringTemplate from "./string";
import literalTemplate from "./literal";

const {
    is
} = adone;

// Prebuild the options that will be used when parsing a `.ast` template.
// These do not use a pattern because there is no way for users to pass in
// replacement patterns to begin with, and disabling pattern matching means
// users have more flexibility in what type of content they have in their
// template JS.
const NO_PLACEHOLDER = validate({
    placeholderPattern: false
});

const extendedTrace = function (fn) {
    // Since we lazy parse the template, we get the current stack so we have the
    // original stack to append if it errors when parsing
    let rootStack = "";
    try {
        // error stack gets populated in IE only on throw
        // (https://msdn.microsoft.com/en-us/library/hh699850(v=vs.94).aspx)
        throw new Error();
    } catch (error) {
        if (error.stack) {
            // error.stack does not exists in IE <= 9
            // We slice off the top 3 items in the stack to remove the call to
            // 'extendedTrace', and the anonymous builder function, with the final
            // stripped line being the error message itself since we threw it
            // in the first place and it doesn't matter.
            rootStack = error.stack
                .split("\n")
                .slice(3)
                .join("\n");
        }
    }

    return (arg) => {
        try {
            return fn(arg);
        } catch (err) {
            err.stack += `\n    =============\n${rootStack}`;
            throw err;
        }
    };
};


export default function createTemplateBuilder(
    formatter,
    defaultOpts,
) {
    const templateFnCache = new WeakMap();
    const templateAstCache = new WeakMap();
    const cachedOpts = defaultOpts || validate(null);

    return Object.assign(
        ((tpl, ...args) => {
            if (is.string(tpl)) {
                if (args.length > 1) {
                    throw new Error("Unexpected extra params.");
                }
                return extendedTrace(
                    stringTemplate(formatter, tpl, merge(cachedOpts, validate(args[0]))),
                );
            } else if (is.array(tpl)) {
                let builder = templateFnCache.get(tpl);
                if (!builder) {
                    builder = literalTemplate(formatter, tpl, cachedOpts);
                    templateFnCache.set(tpl, builder);
                }
                return extendedTrace(builder(args));
            } else if (typeof tpl === "object" && tpl) {
                if (args.length > 0) {
                    throw new Error("Unexpected extra params.");
                }
                return createTemplateBuilder(
                    formatter,
                    merge(cachedOpts, validate(tpl)),
                );
            }
            throw new Error(`Unexpected template param ${typeof tpl}`);
        }),
        {
            ast: (tpl, ...args) => {
                if (is.string(tpl)) {
                    if (args.length > 1) {
                        throw new Error("Unexpected extra params.");
                    }
                    return stringTemplate(
                        formatter,
                        tpl,
                        merge(merge(cachedOpts, validate(args[0])), NO_PLACEHOLDER),
                    )();
                } else if (is.array(tpl)) {
                    let builder = templateAstCache.get(tpl);
                    if (!builder) {
                        builder = literalTemplate(
                            formatter,
                            tpl,
                            merge(cachedOpts, NO_PLACEHOLDER),
                        );
                        templateAstCache.set(tpl, builder);
                    }
                    return builder(args)();
                }

                throw new Error(`Unexpected template param ${typeof tpl}`);
            }
        });
}
