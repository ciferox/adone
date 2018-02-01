const {
    util,
    exception,
    is,
    lazify
} = adone;

const TYPE_CONSTRUCTOR_OPTIONS = new Set([
    "kind",
    "resolve",
    "construct",
    "instanceOf",
    "predicate",
    "represent",
    "defaultStyle",
    "styleAliases"
]);

const YAML_NODE_KINDS = new Set([
    "scalar",
    "sequence",
    "mapping"
]);

const compileStyleAliases = (map) => {
    const result = {};

    if (!is.null(map)) {
        for (const [style, aliases] of util.entries(map)) {
            for (const alias of aliases) {
                result[String(alias)] = style;
            }
        }
    }

    return result;
};

export class Type {
    constructor(tag, options = {}) {
        options = options || {};

        for (const name of util.keys(options)) {
            if (!TYPE_CONSTRUCTOR_OPTIONS.has(name)) {
                throw new exception.InvalidArgument(`Unknown option "${name}" is met in definition of "${tag}" YAML type.`);
            }
        }

        if (!YAML_NODE_KINDS.has(options.kind)) {
            throw new exception.InvalidArgument(`Unknown kind "${this.kind}" is specified for "${tag}" YAML type.`);
        }

        // TODO: Add tag format check.
        this.kind = options.kind;
        this.resolve = options.resolve || adone.truly;
        this.construct = options.construct || adone.identity;
        this.instanceOf = options.instanceOf || null;
        this.predicate = options.predicate || null;
        this.represent = options.represent || null;
        this.defaultStyle = options.defaultStyle || null;
        this.styleAliases = compileStyleAliases(options.styleAliases || null);
        this.tag = tag;
    }
}

const type = lazify({
    Binary: "./binary",
    Bool: "./bool",
    Float: "./float",
    Int: "./int",
    Map: "./map",
    Merge: "./merge",
    Null: "./null",
    Omap: "./omap",
    Pairs: "./pairs",
    Seq: "./seq",
    Set: "./set",
    Str: "./str",
    Timestamp: "./timestamp"
}, exports, require);

type.js = lazify({
    Function: "./js/function",
    RegExp: "./js/regexp",
    Undefined: "./js/undefined"
}, null, require);
