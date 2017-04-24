const { diff: { _: { Diff, helper: { generateOptions } } } } = adone;

export const lineDiff = new Diff();

lineDiff.tokenize = function (value) {
    const retLines = [];
    const linesAndNewlines = value.split(/(\n|\r\n)/);

    // Ignore the final empty token that occurs if the string ends with a new line
    if (!linesAndNewlines[linesAndNewlines.length - 1]) {
        linesAndNewlines.pop();
    }

    // Merge the content and line separators into single tokens
    for (let i = 0; i < linesAndNewlines.length; i++) {
        let line = linesAndNewlines[i];

        if (i % 2 && !this.options.newlineIsToken) {
            retLines[retLines.length - 1] += line;
        } else {
            if (this.options.ignoreWhitespace) {
                line = line.trim();
            }
            retLines.push(line);
        }
    }

    return retLines;
};

export const diffLines = (oldStr, newStr, callback) => lineDiff.diff(oldStr, newStr, callback);

export const diffTrimmedLines = (oldStr, newStr, callback) => {
    const options = generateOptions(callback, { ignoreWhitespace: true });
    return lineDiff.diff(oldStr, newStr, options);
};
