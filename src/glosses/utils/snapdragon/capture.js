const {
    is
} = adone;

/**
 * Create a node of the given `type` using the specified regex or function.
 *
 * @param {string} `type`
 * @param {RegExp|Function} `regex` Pass the regex to use for capturing. Pass a function if you need access to the parser instance.
 * @returns {object} Returns the parser instance for chaining
 */
const capture = function (...args) {
    const [type, regex] = args;
    if (is.function(regex)) {
        return this.set(...args);
    }

    this.regex.set(type, regex);
    this.set(type, () => {
        const pos = this.position();
        const match = this.match(regex);
        if (match) {
            const node = pos(this.node(match[0], type));
            node.match = match;
            return node;
        }
    });
    return this;
};

/**
 * Adds a `.capture` method to a [snapdragon][] `Parser` instance. Wraps
 * the `.set` method to simplify the interface for creating parsers.
 */
export default function () {
    return function (snapdragon) {
        if (snapdragon.isSnapdragon) {
            snapdragon.parser.define("capture", capture);
            snapdragon.define("capture", function (...args) {
                return this.parser.capture(...args);
            });

        } else if (snapdragon.isParser) {
            snapdragon.define("capture", capture);

        } else {
            throw new Error("expected an instance of snapdragon or snapdragon.parser");
        }
    };
}
