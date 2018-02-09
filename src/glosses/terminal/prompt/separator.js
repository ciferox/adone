/**
 * Separator object
 * Used to space/separate choices group
 * @constructor
 * @param {String} line   Separation line content (facultative)
 */
export default class Separator {
    constructor(terminal, line) {
        this.type = "separator";
        this.line = adone.terminal.chalk.dim(line || new Array(15).join(adone.text.unicode.symbol.line));
    }

    /**
     * Helper function returning false if object is a separator
     * @param  {Object} obj object to test against
     * @return {Boolean}    `false` if object is a separator
     */
    static exclude(obj) {
        return obj.type !== "separator";
    }

    /**
     * Stringify separator
     * @return {String} the separator display string
     */
    toString() {
        return this.line;
    }
}
