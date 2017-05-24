const { is } = adone;

const codeRegex = (capture) => capture ? /\u001b\[((?:\d*;){0,5}\d*)m/g : /\u001b\[(?:\d*;){0,5}\d*m/g;

const strlen = (str) => {
    const code = codeRegex();
    const stripped = (`${str}`).replace(code, "");
    const split = stripped.split("\n");
    return split.reduce((memo, s) => {
        return (adone.text.width(s) > memo) ? adone.text.width(s) : memo;
    }, 0);
};

const repeat = (str, times) => Array(times + 1).join(str);

const pad = (str, len, pad, dir) => {
    const length = strlen(str);
    if (len + 1 >= length) {
        const padlen = len - length;
        switch (dir) {
            case "right":
                str = repeat(pad, padlen) + str;
                break;

            case "center": {
                const right = Math.ceil((padlen) / 2);
                const left = padlen - right;
                str = repeat(pad, left) + str + repeat(pad, right);
                break;
            }
            default:
                str = str + repeat(pad, padlen);
                break;
        }
    }
    return str;
};

const codeCache = {};

const addToCodeCache = (name, on, off) => {
    on = `\u001b[${on}m`;
    off = `\u001b[${off}m`;
    codeCache[on] = { set: name, to: true };
    codeCache[off] = { set: name, to: false };
    codeCache[name] = { on, off };
};

//https://github.com/Marak/colors.js/blob/master/lib/styles.js
addToCodeCache("bold", 1, 22);
addToCodeCache("italics", 3, 23);
addToCodeCache("underline", 4, 24);
addToCodeCache("inverse", 7, 27);
addToCodeCache("strikethrough", 9, 29);


const updateState = (state, controlChars) => {
    const controlCode = controlChars[1] ? parseInt(controlChars[1].split(";")[0]) : 0;
    if ((controlCode >= 30 && controlCode <= 39)
        || (controlCode >= 90 && controlCode <= 97)
    ) {
        state.lastForegroundAdded = controlChars[0];
        return;
    }
    if ((controlCode >= 40 && controlCode <= 49)
        || (controlCode >= 100 && controlCode <= 107)
    ) {
        state.lastBackgroundAdded = controlChars[0];
        return;
    }
    if (controlCode === 0) {
        for (const i in state) {
            if (state.hasOwnProperty(i)) {
                delete state[i];
            }
        }
        return;
    }
    const info = codeCache[controlChars[0]];
    if (info) {
        state[info.set] = info.to;
    }
};

const readState = (line) => {
    const code = codeRegex(true);
    let controlChars = code.exec(line);
    const state = {};
    while (controlChars !== null) {
        updateState(state, controlChars);
        controlChars = code.exec(line);
    }
    return state;
};

const unwindState = (state, ret) => {
    const lastBackgroundAdded = state.lastBackgroundAdded;
    const lastForegroundAdded = state.lastForegroundAdded;

    delete state.lastBackgroundAdded;
    delete state.lastForegroundAdded;

    const keys = Object.keys(state);
    for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        const value = state[key];
        if (value) {
            ret += codeCache[key].off;
        }
    }

    if (lastBackgroundAdded && (lastBackgroundAdded !== "\u001b[49m")) {
        ret += "\u001b[49m";
    }
    if (lastForegroundAdded && (lastForegroundAdded !== "\u001b[39m")) {
        ret += "\u001b[39m";
    }

    return ret;
};

const rewindState = (state, ret) => {
    const lastBackgroundAdded = state.lastBackgroundAdded;
    const lastForegroundAdded = state.lastForegroundAdded;

    delete state.lastBackgroundAdded;
    delete state.lastForegroundAdded;

    const keys = Object.keys(state);
    for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        const value = state[key];
        if (value) {
            ret = codeCache[key].on + ret;
        }
    }

    if (lastBackgroundAdded && (lastBackgroundAdded !== "\u001b[49m")) {
        ret = lastBackgroundAdded + ret;
    }
    if (lastForegroundAdded && (lastForegroundAdded !== "\u001b[39m")) {
        ret = lastForegroundAdded + ret;
    }

    return ret;
};

const truncateWidth = (str, desiredLength) => {
    if (str.length === strlen(str)) {
        return str.substr(0, desiredLength);
    }

    while (strlen(str) > desiredLength) {
        str = str.slice(0, -1);
    }

    return str;
};

const truncateWidthWithAnsi = (str, desiredLength) => {
    const code = codeRegex(true);
    const split = str.split(codeRegex());
    let splitIndex = 0;
    let retLen = 0;
    let ret = "";
    let myArray;
    const state = {};

    while (retLen < desiredLength) {
        myArray = code.exec(str);
        let toAdd = split[splitIndex];
        splitIndex++;
        if (retLen + strlen(toAdd) > desiredLength) {
            toAdd = truncateWidth(toAdd, desiredLength - retLen);
        }
        ret += toAdd;
        retLen += strlen(toAdd);

        if (retLen < desiredLength) {
            if (!myArray) {
                break;
            }  // full-width chars may cause a whitespace which cannot be filled
            ret += myArray[0];
            updateState(state, myArray);
        }
    }

    return unwindState(state, ret);
};

const truncate = (str, desiredLength, truncateChar) => {
    truncateChar = truncateChar || "…";
    const lengthOfStr = strlen(str);
    if (lengthOfStr <= desiredLength) {
        return str;
    }
    desiredLength -= strlen(truncateChar);

    return truncateWidthWithAnsi(str, desiredLength) + truncateChar;
};

const wordWrap = (maxLength, input) => adone.text.wordwrap(input, maxLength, { join: false });

const multiLineWordWrap = (maxLength, input) => {
    const output = [];
    input = input.split("\n");
    for (let i = 0; i < input.length; i++) {
        output.push(...wordWrap(maxLength, input[i]));
    }
    return output;
};

const colorizeLines = (input) => {
    let state = {};
    const output = [];
    for (let i = 0; i < input.length; i++) {
        const line = rewindState(state, input[i]);
        state = readState(line);
        const temp = Object.assign({}, state);
        output.push(unwindState(temp, line));
    }
    return output;
};

export const util = {
    strlen,
    repeat,
    pad,
    truncate,
    wordWrap: multiLineWordWrap,
    colorizeLines
};


// HELPER FUNCTIONS
const setOption = (objA, objB, nameB, targetObj) => {
    let nameA = nameB.split("-");
    if (nameA.length > 1) {
        nameA[1] = nameA[1].charAt(0).toUpperCase() + nameA[1].substr(1);
        nameA = nameA.join("");
        targetObj[nameA] = objA[nameA] || objA[nameB] || objB[nameA] || objB[nameB];
    } else {
        targetObj[nameB] = objA[nameB] || objB[nameB];
    }
};

const findDimension = (dimensionTable, startingIndex, span) => {
    let ret = dimensionTable[startingIndex];
    for (let i = 1; i < span; i++) {
        ret += 1 + dimensionTable[startingIndex + i];
    }
    return ret;
};

const sumPlusOne = (a, b) => a + b + 1;

const CHAR_NAMES = [
    "top",
    "top-mid",
    "top-left",
    "top-right",
    "bottom",
    "bottom-mid",
    "bottom-left",
    "bottom-right",
    "left",
    "left-mid",
    "mid",
    "mid-mid",
    "right",
    "right-mid",
    "middle"
];

/**
 * A Cell that doesn't do anything. It just draws empty lines.
 * Used as a placeholder in column spanning.
 * @constructor
 */
export class ColSpanCell {
    draw() {
        return "";
    }

    init(tableOptions) {

    }

    mergeTableOptions() {

    }
}

/**
 * A placeholder Cell for a Cell that spans multiple rows.
 * It delegates rendering to the original cell, but adds the appropriate offset.
 * @param originalCell
 * @constructor
 */
export class RowSpanCell {
    constructor(originalCell) {
        this.originalCell = originalCell;
    }

    init(tableOptions) {
        const y = this.y;
        const originalY = this.originalCell.y;
        this.cellOffset = y - originalY;
        this.offset = findDimension(tableOptions.rowHeights, originalY, this.cellOffset);
    }

    draw(lineNum) {
        if (lineNum === "top") {
            return this.originalCell.draw(this.offset, this.cellOffset);
        }
        if (lineNum === "bottom") {
            return this.originalCell.draw("bottom");
        }
        return this.originalCell.draw(this.offset + 1 + lineNum);
    }

    mergeTableOptions() {

    }
}

/**
 * A representation of a cell within the table.
 * Implementations must have `init` and `draw` methods,
 * as well as `colSpan`, `rowSpan`, `desiredHeight` and `desiredWidth` properties.
 * @param options
 * @constructor
 */
export class Cell {
    constructor(options) {
        this.setOptions(options);
        /**
         * Each cell will have it's `x` and `y` values set by the `layout-manager` prior to
         * `init` being called;
         * @type {Number}
        */
        this.x = null;
        this.y = null;
    }

    setOptions(options) {
        if (is.string(options) || is.number(options) || is.boolean(options)) {
            options = { content: `${options}` };
        }
        options = options || {};
        this.options = options;
        const content = options.content;
        if (is.string(content) || is.number(content) || is.boolean(content)) {
            this.content = String(content);
        } else if (!content) {
            this.content = "";
        } else {
            throw new Error(`Content needs to be a primitive, got: ${typeof content}`);
        }
        this.colSpan = options.colSpan || 1;
        this.rowSpan = options.rowSpan || 1;
    }

    mergeTableOptions(tableOptions, cells) {
        this.cells = cells;

        const optionsChars = this.options.chars || {};
        const tableChars = tableOptions.chars;
        const chars = this.chars = {};
        CHAR_NAMES.forEach((name) => {
            setOption(optionsChars, tableChars, name, chars);
        });

        this.truncate = this.options.truncate || tableOptions.truncate;

        const style = this.options.style = this.options.style || {};
        const tableStyle = tableOptions.style;
        setOption(style, tableStyle, "padding-left", this);
        setOption(style, tableStyle, "padding-right", this);
        this.head = style.head || tableStyle.head;
        this.border = style.border || tableStyle.border;

        let fixedWidth = tableOptions.colWidths[this.x];
        if (tableOptions.wordWrap && fixedWidth) {
            fixedWidth -= this.paddingLeft + this.paddingRight;
            this.lines = util.colorizeLines(util.wordWrap(fixedWidth, this.content));
        } else {
            this.lines = util.colorizeLines(this.content.split("\n"));
        }

        this.desiredWidth = util.strlen(this.content) + this.paddingLeft + this.paddingRight;
        this.desiredHeight = this.lines.length;
    }

    /**
     * Initializes the Cells data structure.
     *
     * @param tableOptions - A fully populated set of tableOptions.
     * In addition to the standard default values, tableOptions must have fully populated the
     * `colWidths` and `rowWidths` arrays. Those arrays must have lengths equal to the number
     * of columns or rows (respectively) in this table, and each array item must be a Number.
     *
     */
    init(tableOptions) {
        const x = this.x;
        const y = this.y;
        this.widths = tableOptions.colWidths.slice(x, x + this.colSpan);
        this.heights = tableOptions.rowHeights.slice(y, y + this.rowSpan);
        this.width = this.widths.reduce(sumPlusOne, -1);
        this.height = this.heights.reduce(sumPlusOne, -1);

        this.hAlign = this.options.hAlign || tableOptions.colAligns[x];
        this.vAlign = this.options.vAlign || tableOptions.rowAligns[y];

        this.drawRight = x + this.colSpan === tableOptions.colWidths.length;
    }

    /**
     * Draws the given line of the cell.
     * This default implementation defers to methods `drawTop`, `drawBottom`, `drawLine` and `drawEmpty`.
     * @param lineNum - can be `top`, `bottom` or a numerical line number.
     * @param spanningCell - will be a number if being called from a RowSpanCell, and will represent how
     * many rows below it's being called from. Otherwise it's undefined.
     * @returns {String} The representation of this line.
     */
    draw(lineNum, spanningCell) {
        if (lineNum === "top") {
            return this.drawTop(this.drawRight);
        }
        if (lineNum === "bottom") {
            return this.drawBottom(this.drawRight);
        }
        const padLen = Math.max(this.height - this.lines.length, 0);
        let padTop;
        switch (this.vAlign) {
            case "center":
                padTop = Math.ceil(padLen / 2);
                break;
            case "bottom":
                padTop = padLen;
                break;
            default:
                padTop = 0;
        }
        if ((lineNum < padTop) || (lineNum >= (padTop + this.lines.length))) {
            return this.drawEmpty(this.drawRight, spanningCell);
        }
        const forceTruncation = (this.lines.length > this.height) && (lineNum + 1 >= this.height);
        return this.drawLine(lineNum - padTop, this.drawRight, forceTruncation, spanningCell);
    }

    /**
     * Renders the top line of the cell.
     * @param drawRight - true if this method should render the right edge of the cell.
     * @returns {String}
     */
    drawTop(drawRight) {
        const content = [];
        if (this.cells) {  //TODO: cells should always exist - some tests don't fill it in though
            this.widths.forEach((width, index) => {
                content.push(this._topLeftChar(index));
                content.push(util.repeat(this.chars[this.y === 0 ? "top" : "mid"], width));
            });
        } else {
            content.push(this._topLeftChar(0));
            content.push(util.repeat(this.chars[this.y === 0 ? "top" : "mid"], this.width));
        }
        if (drawRight) {
            content.push(this.chars[this.y === 0 ? "topRight" : "rightMid"]);
        }
        return this.wrapWithStyleColors("border", content.join(""));
    }

    _topLeftChar(offset) {
        const x = this.x + offset;
        let leftChar;
        if (this.y === 0) {
            leftChar = x === 0 ? "topLeft" : (offset === 0 ? "topMid" : "top");
        } else {
            if (x === 0) {
                leftChar = "leftMid";
            } else {
                leftChar = offset === 0 ? "midMid" : "bottomMid";
                if (this.cells) {  //TODO: cells should always exist - some tests don't fill it in though
                    const spanAbove = this.cells[this.y - 1][x] instanceof ColSpanCell;
                    if (spanAbove) {
                        leftChar = offset === 0 ? "topMid" : "mid";
                    }
                    if (offset === 0) {
                        let i = 1;
                        while (this.cells[this.y][x - i] instanceof ColSpanCell) {
                            i++;
                        }
                        if (this.cells[this.y][x - i] instanceof RowSpanCell) {
                            leftChar = "leftMid";
                        }
                    }
                }
            }
        }
        return this.chars[leftChar];
    }

    wrapWithStyleColors(styleProperty, content) {
        if (this[styleProperty] && this[styleProperty].length) {
            try {
                // adone.log(styleProperty, this[styleProperty]);
                let colors = adone.terminal;
                for (let i = this[styleProperty].length; --i >= 0; ) {
                    colors = colors[this[styleProperty][i]];
                }
                // adone.log(colors(content));
                return colors(content);
            } catch (e) {
                return content;
            }
        } else {
            return content;
        }
    }

    /**
     * Renders a line of text.
     * @param lineNum - Which line of text to render. This is not necessarily the line within the cell.
     * There may be top-padding above the first line of text.
     * @param drawRight - true if this method should render the right edge of the cell.
     * @param forceTruncationSymbol - `true` if the rendered text should end with the truncation symbol even
     * if the text fits. This is used when the cell is vertically truncated. If `false` the text should
     * only include the truncation symbol if the text will not fit horizontally within the cell width.
     * @param spanningCell - a number of if being called from a RowSpanCell. (how many rows below). otherwise undefined.
     * @returns {String}
     */
    drawLine(lineNum, drawRight, forceTruncationSymbol, spanningCell) {
        let left = this.chars[this.x === 0 ? "left" : "middle"];
        if (this.x && spanningCell && this.cells) {
            let cellLeft = this.cells[this.y + spanningCell][this.x - 1];
            while (cellLeft instanceof ColSpanCell) {
                cellLeft = this.cells[cellLeft.y][cellLeft.x - 1];
            }
            if (!(cellLeft instanceof RowSpanCell)) {
                left = this.chars.rightMid;
            }
        }
        const leftPadding = util.repeat(" ", this.paddingLeft);
        const right = (drawRight ? this.chars.right : "");
        const rightPadding = util.repeat(" ", this.paddingRight);
        let line = this.lines[lineNum];
        const len = this.width - (this.paddingLeft + this.paddingRight);
        if (forceTruncationSymbol) {
            line += this.truncate || "…";
        }
        let content = util.truncate(line, len, this.truncate);
        content = util.pad(content, len, " ", this.hAlign);
        content = leftPadding + content + rightPadding;
        return this.stylizeLine(left, content, right);
    }

    stylizeLine(left, content, right) {
        left = this.wrapWithStyleColors("border", left);
        right = this.wrapWithStyleColors("border", right);
        if (this.y === 0) {
            content = this.wrapWithStyleColors("head", content);
        }
        return left + content + right;
    }

    /**
     * Renders the bottom line of the cell.
     * @param drawRight - true if this method should render the right edge of the cell.
     * @returns {String}
     */
    drawBottom(drawRight) {
        const left = this.chars[this.x === 0 ? "bottomLeft" : "bottomMid"];
        const content = util.repeat(this.chars.bottom, this.width);
        const right = drawRight ? this.chars.bottomRight : "";
        return this.wrapWithStyleColors("border", left + content + right);
    }

    /**
     * Renders a blank line of text within the cell. Used for top and/or bottom padding.
     * @param drawRight - true if this method should render the right edge of the cell.
     * @param spanningCell - a number of if being called from a RowSpanCell. (how many rows below). otherwise undefined.
     * @returns {String}
     */
    drawEmpty(drawRight, spanningCell) {
        let left = this.chars[this.x === 0 ? "left" : "middle"];
        if (this.x && spanningCell && this.cells) {
            let cellLeft = this.cells[this.y + spanningCell][this.x - 1];
            while (cellLeft instanceof ColSpanCell) {
                cellLeft = this.cells[cellLeft.y][cellLeft.x - 1];
            }
            if (!(cellLeft instanceof RowSpanCell)) {
                left = this.chars.rightMid;
            }
        }
        const right = (drawRight ? this.chars.right : "");
        const content = util.repeat(" ", this.width);
        return this.stylizeLine(left, content, right);
    }

}

const cellsConflict = (cell1, cell2) => {
    const yMin1 = cell1.y;
    const yMax1 = cell1.y - 1 + (cell1.rowSpan || 1);
    const yMin2 = cell2.y;
    const yMax2 = cell2.y - 1 + (cell2.rowSpan || 1);
    const yConflict = !(yMin1 > yMax2 || yMin2 > yMax1);

    const xMin1 = cell1.x;
    const xMax1 = cell1.x - 1 + (cell1.colSpan || 1);
    const xMin2 = cell2.x;
    const xMax2 = cell2.x - 1 + (cell2.colSpan || 1);
    const xConflict = !(xMin1 > xMax2 || xMin2 > xMax1);

    return yConflict && xConflict;
};

const conflictExists = (rows, x, y) => {
    const iMax = Math.min(rows.length - 1, y);
    const cell = { x, y };
    for (let i = 0; i <= iMax; i++) {
        const row = rows[i];
        for (let j = 0; j < row.length; j++) {
            if (cellsConflict(cell, row[j])) {
                return true;
            }
        }
    }
    return false;
};

const allBlank = (rows, y, xMin, xMax) => {
    for (let x = xMin; x < xMax; x++) {
        if (conflictExists(rows, x, y)) {
            return false;
        }
    }
    return true;
};

const insertCell = (cell, row) => {
    let x = 0;
    while (x < row.length && (row[x].x < cell.x)) {
        x++;
    }
    row.splice(x, 0, cell);
};

const makeComputeWidths = (colSpan, desiredWidth, x, forcedMin) => {
    return (vals, table) => {
        const result = [];
        const spanners = [];
        table.forEach((row) => {
            row.forEach((cell) => {
                if ((cell[colSpan] || 1) > 1) {
                    spanners.push(cell);
                } else {
                    result[cell[x]] = Math.max(result[cell[x]] || 0, cell[desiredWidth] || 0, forcedMin);
                }
            });
        });

        vals.forEach((val, index) => {
            if (is.number(val)) {
                result[index] = val;
            }
        });

        for (let k = spanners.length - 1; k >= 0; k--) {
            const cell = spanners[k];
            const span = cell[colSpan];
            const col = cell[x];
            let existingWidth = result[col];
            let editableCols = is.number(vals[col]) ? 0 : 1;
            let i;
            for (i = 1; i < span; i++) {
                existingWidth += 1 + result[col + i];
                if (!is.number(vals[col + i])) {
                    editableCols++;
                }
            }
            if (cell[desiredWidth] > existingWidth) {
                i = 0;
                while (editableCols > 0 && cell[desiredWidth] > existingWidth) {
                    if (!is.number(vals[col + i])) {
                        const dif = Math.round((cell[desiredWidth] - existingWidth) / editableCols);
                        existingWidth += dif;
                        result[col + i] += dif;
                        editableCols--;
                    }
                    i++;
                }
            }
        }

        Object.assign(vals, result);
        for (let j = 0; j < vals.length; j++) {
            vals[j] = Math.max(forcedMin, vals[j] || 0);
        }
    };
};

const doDraw = (row, lineNum, result) => {
    const line = [];
    row.forEach((cell) => {
        line.push(cell.draw(lineNum));
    });
    const str = line.join("");
    if (str.length) {
        result.push(str);
    }
};

export class Table extends Array {
    constructor(options) {
        super();
        this.options = Table.applyOptions(options);
    }

    static get defaultOptions() {
        return {
            truncate: "…",
            colWidths: [],
            rowHeights: [],
            colAligns: [],
            rowAligns: [],
            head: [],
            chars: {
                top: "─",
                "top-mid": "┬",
                "top-left": "┌",
                "top-right": "┐",
                bottom: "─",
                "bottom-mid": "┴",
                "bottom-left": "└",
                "bottom-right": "┘",
                left: "│",
                "left-mid": "├",
                mid: "─",
                "mid-mid": "┼",
                right: "│",
                "right-mid": "┤",
                middle: "│"
            },
            style: {
                "padding-left": 1,
                "padding-right": 1,
                head: ["green"],
                border: ["grey"],
                compact: false
            }
        };
    }

    static applyOptions(options = {}) {
        const defaultOptions = Table.defaultOptions;
        const result = Object.assign({}, defaultOptions, options);
        result.chars = Object.assign({}, defaultOptions.chars, options.chars);
        result.style = Object.assign({}, defaultOptions.style, options.style);
        return result;
    }

    toString() {
        let array = this;
        const headersPresent = this.options.head && this.options.head.length;
        if (headersPresent) {
            array = [this.options.head];
            if (this.length) {
                array.push.apply(array, this);
            }
        } else {
            this.options.style.head = [];
        }

        const cells = Table.makeLayout(array);

        cells.forEach((row) => {
            row.forEach((cell) => {
                cell.mergeTableOptions(this.options, cells);
            });
        });

        Table.computeWidths(this.options.colWidths, cells);
        Table.computeHeights(this.options.rowHeights, cells);

        cells.forEach((row) => {
            row.forEach((cell) => {
                cell.init(this.options);
            });
        });

        const result = [];

        for (let rowIndex = 0; rowIndex < cells.length; rowIndex++) {
            const row = cells[rowIndex];
            const heightOfRow = this.options.rowHeights[rowIndex];

            if (rowIndex === 0 || !this.options.style.compact || (rowIndex === 1 && headersPresent)) {
                doDraw(row, "top", result);
            }

            for (let lineNum = 0; lineNum < heightOfRow; lineNum++) {
                doDraw(row, lineNum, result);
            }

            if (rowIndex + 1 === cells.length) {
                doDraw(row, "bottom", result);
            }
        }

        return result.join("\n");
    }

    get width() {
        const str = this.toString().split("\n");
        return str[0].length;
    }

    static layout(cells) {
        cells.forEach((row, rowIndex) => {
            row.forEach((cell, columnIndex) => {
                cell.y = rowIndex;
                cell.x = columnIndex;
                for (let y = rowIndex; y >= 0; y--) {
                    const row2 = cells[y];
                    const xMax = (y === rowIndex) ? columnIndex : row2.length;
                    for (let x = 0; x < xMax; x++) {
                        const cell2 = row2[x];
                        while (cellsConflict(cell, cell2)) {
                            cell.x++;
                        }
                    }
                }
            });
        });
    }

    static makeLayout(table) {
        const cells = table.map((row) => {
            if (!is.array(row)) {
                const key = Object.keys(row)[0];
                row = row[key];
                if (is.array(row)) {
                    row = row.slice();
                    row.unshift(key);
                } else {
                    row = [key, row];
                }
            }
            return row.map((cell) => {
                return new Cell(cell);
            });
        });

        Table.layout(cells);
        Table.fillIn(cells);
        Table.addRowSpanCells(cells);

        for (let rowIndex = cells.length - 1; rowIndex >= 0; rowIndex--) {
            const cellColumns = cells[rowIndex];
            for (let columnIndex = 0; columnIndex < cellColumns.length; columnIndex++) {
                const cell = cellColumns[columnIndex];
                for (let k = 1; k < cell.colSpan; k++) {
                    const colSpanCell = new ColSpanCell();
                    colSpanCell.x = cell.x + k;
                    colSpanCell.y = cell.y;
                    cellColumns.splice(columnIndex + 1, 0, colSpanCell);
                }
            }
        }

        return cells;
    }

    static maxWidth(table) {
        let mw = 0;
        table.forEach((row) => {
            row.forEach((cell) => {
                mw = Math.max(mw, cell.x + (cell.colSpan || 1));
            });
        });
        return mw;
    }

    static maxHeight(table) {
        return table.length;
    }

    static fillIn(table) {
        const hMax = Table.maxHeight(table);
        const wMax = Table.maxWidth(table);
        for (let y = 0; y < hMax; y++) {
            for (let x = 0; x < wMax; x++) {
                if (!conflictExists(table, x, y)) {
                    const opts = { x, y, colSpan: 1, rowSpan: 1 };
                    x++;
                    while (x < wMax && !conflictExists(table, x, y)) {
                        opts.colSpan++;
                        x++;
                    }
                    let y2 = y + 1;
                    while (y2 < hMax && allBlank(table, y2, opts.x, opts.x + opts.colSpan)) {
                        opts.rowSpan++;
                        y2++;
                    }

                    const cell = new Cell(opts);
                    cell.x = opts.x;
                    cell.y = opts.y;
                    insertCell(cell, table[y]);
                }
            }
        }
    }

    static addRowSpanCells(table) {
        table.forEach((row, rowIndex) => {
            row.forEach((cell) => {
                for (let i = 1; i < cell.rowSpan; i++) {
                    const rowSpanCell = new RowSpanCell(cell);
                    rowSpanCell.x = cell.x;
                    rowSpanCell.y = cell.y + i;
                    rowSpanCell.colSpan = cell.colSpan;
                    insertCell(rowSpanCell, table[rowIndex + i]);
                }
            });
        });
    }
}
Table.computeWidths = makeComputeWidths("colSpan", "desiredWidth", "x", 1);
Table.computeHeights = makeComputeWidths("rowSpan", "desiredHeight", "y", 1);

export class BorderlessTable extends Table {
    constructor({ colWidths = [], head = [], colAligns = [], style = {} } = {}) {
        super({
            head,
            colAligns,
            colWidths,
            chars: {
                top: "",
                "top-mid": "",
                "top-left": "",
                "top-right": "",
                bottom: "",
                "bottom-mid": "",
                "bottom-left": "",
                "bottom-right": "",
                left: "",
                "left-mid": "",
                mid: "",
                "mid-mid": "",
                right: "",
                "right-mid": "",
                middle: ""
            },
            style: Object.assign({
                "padding-left": 0,
                "padding-right": 0
            }, style)
        });
    }
}
