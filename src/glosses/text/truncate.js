const {
    is,
    text: { width: textWidth, sliceAnsi }
} = adone;

export default (input, columns, { ellipsis = "…", position = "end", term = false } = {}) => {
    if (!is.string(input)) {
        throw new TypeError(`Expected \`input\` to be a string, got ${typeof input}`);
    }

    if (!is.number(columns)) {
        throw new TypeError(`Expected \`columns\` to be a number, got ${typeof columns}`);
    }

    if (columns < 1) {
        return "";
    }

    if (columns === 1) {
        return input.length === 1 ? input : ellipsis;
    }

    const length = textWidth(input);
    if (length <= columns) {
        return input;
    }

    if (position === "start") {
        return ellipsis + sliceAnsi(input, length - columns + ellipsis.length, length, { term });
    } else if (position === "middle") {
        const half = Math.floor(columns / 2);
        const halfEllipsis = Math.floor(ellipsis.length / 2);
        return sliceAnsi(input, 0, half - halfEllipsis, { term }) + ellipsis + sliceAnsi(input, length - (columns - half) + halfEllipsis + 1, length, { term });
    } else if (position === "end") {
        return sliceAnsi(input, 0, columns - ellipsis.length, { term }) + ellipsis;
    }

    throw new Error(`Expected \`options.position\` to be either \`start\`, \`middle\` or \`end\`, got ${position}`);
};
