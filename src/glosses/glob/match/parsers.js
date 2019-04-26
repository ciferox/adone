const {
    util,
    glob: {
        match: {
            minimal,
            extglob
        }
    }
} = adone;

/**
 * Create text regex
 */
const textRegex = (pattern) => {
    const notStr = util.regexNot.create(pattern, { contains: true, strictClose: false });
    const prefix = "(?:[\\^]|\\\\|";
    return util.toRegex(`${prefix + notStr})`, { strictClose: false });
};

/**
 * Characters to use in negation regex (we want to "not" match
 * characters that are matched by other parsers)
 */
const TEXT = "([!@*?+]?\\(|\\)|\\[:?(?=.*?:?\\])|:?\\]|[*+?!^$.\\\\/])+";
const not = textRegex(TEXT);

/**
 * Parsers
 */
export default function parsers(snapdragon) {
    const parsers = snapdragon.parser.parsers;

    snapdragon.use(minimal.parsers);

    // get references to some specific minimal parsers before they
    // are overridden by the extglob and/or parsers
    const escape = parsers.escape;
    const slash = parsers.slash;
    const qmark = parsers.qmark;
    const plus = parsers.plus;
    const star = parsers.star;
    const dot = parsers.dot;

    snapdragon.use(extglob.parsers);

    snapdragon.parser
        .use(function () {
            // override "notRegex" created in minimal parser
            this.notRegex = /^!+(?!\()/;
        })
        // reset the referenced parsers
        .capture("escape", escape)
        .capture("slash", slash)
        .capture("qmark", qmark)
        .capture("star", star)
        .capture("plus", plus)
        .capture("dot", dot)

        /**
         * Override `text` parser
         */
        .capture("text", function () {
            if (this.isInside("bracket")) {
                return;
            }
            const pos = this.position();
            const m = this.match(not);
            if (!m || !m[0]) {
                return;
            }

            // escape regex boundary characters and simple brackets
            const val = m[0].replace(/([[\]^$])/g, "\\$1");

            return pos({
                type: "text",
                val
            });
        });
}
