import adone from "adone";
const { vendor: { lodash: _ }, terminal } = adone;

/**
 * The paginator keep trakcs of a pointer index in a list and return
 * a subset of the choices if the list is too long.
 */
export default class Paginator {
    constructor() {
        this.pointer = 0;
        this.lastIndex = 0;
    }

    paginate(output, active, pageSize) {
        pageSize = pageSize || 7;
        const middleOfList = Math.floor(pageSize / 2);
        const lines = output.split("\n");

    // Make sure there's enough lines to paginate
        if (lines.length <= pageSize) {
            return output;
        }

    // Move the pointer only when the user go down and limit it to the middle of the list
        if (this.pointer < middleOfList && this.lastIndex < active && active - this.lastIndex < pageSize) {
            this.pointer = Math.min(middleOfList, this.pointer + active - this.lastIndex);
        }
        this.lastIndex = active;

    // Duplicate the lines so it give an infinite list look
        const infinite = _.flatten([lines, lines, lines]);
        const topIndex = Math.max(0, active + lines.length - this.pointer);

        const section = infinite.splice(topIndex, pageSize).join("\n");
        return `${section}\n${terminal.style.dim("(Move up and down to reveal more choices)")}`;
    }
}
