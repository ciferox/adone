const { exception } = adone;

const opts = new Set(["i", "m", "x", "l", "s", "u"]);

export default class BSONRegExp {
    constructor(pattern, options) {
        this._bsontype = "BSONRegExp";
        this.pattern = pattern || "";
        this.options = options || "";

        // Validate options
        for (const opt of this.options) {
            if (!opts.has(opt)) {
                throw new exception.InvalidArgument(`the regular expression options [${opt}] is not supported`);
            }
        }
    }
}
