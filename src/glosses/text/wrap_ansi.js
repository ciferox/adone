const {
    text: { width: textWidth, stripAnsi },
    cli: { esc }
} = adone;

const ESCAPES = new Set([
    "\u001B",
    "\u009B"
]);

const END_CODE = 39;

const wrapAnsi = (code) => `${ESCAPES.values().next().value}[${code}m`;

// Calculate the length of words split on ' ', ignoring
// the extra characters added by ansi escape codes
const wordLengths = (str) => str.split(" ").map((s) => textWidth(s));

// Wrap a long word across multiple rows
// Ansi escape codes do not count towards length
const wrapWord = (rows, word, cols) => {
    const arr = Array.from(word);

    let insideEscape = false;
    let visible = textWidth(stripAnsi(rows[rows.length - 1]));

    for (const [i, char] of arr.entries()) {
        const charLength = textWidth(char);

        if (visible + charLength <= cols) {
            rows[rows.length - 1] += char;
        } else {
            rows.push(char);
            visible = 0;
        }

        if (ESCAPES.has(char)) {
            insideEscape = true;
        } else if (insideEscape && char === "m") {
            insideEscape = false;
            continue;
        }

        if (insideEscape) {
            continue;
        }

        visible += charLength;

        if (visible === cols && i < arr.length - 1) {
            rows.push("");
            visible = 0;
        }
    }

    // It's possible that the last row we copy over is only
    // ansi escape characters, handle this edge-case
    if (!visible && rows[rows.length - 1].length > 0 && rows.length > 1) {
        rows[rows.length - 2] += rows.pop();
    }
};

// The wrap-ansi module can be invoked
// in either 'hard' or 'soft' wrap mode
//
// 'hard' will never allow a string to take up more
// than cols characters
//
// 'soft' allows long words to expand past the column length
const exec = (str, cols, { trim = true, wordWrap = true, hard = false } = {}) => {
    if (str.trim() === "") {
        return trim === false ? str : str.trim();
    }

    let pre = "";
    let ret = "";
    let escapeCode;

    const lengths = wordLengths(str);
    const words = str.split(" ");
    const rows = [""];

    // adone.logTrace(words);

    for (const [i, word] of Array.from(words).entries()) {
        rows[rows.length - 1] = trim === false ? rows[rows.length - 1] : rows[rows.length - 1].trim();
        let rowLength = textWidth(rows[rows.length - 1]);

        if (rowLength || word === "") {
            if (rowLength === cols && wordWrap === false) {
                // If we start with a new word but the current row length equals the length of the columns, add a new row
                rows.push("");
                rowLength = 0;
            }

            rows[rows.length - 1] += " ";
            rowLength++;
        }

        // In 'hard' wrap mode, the length of a line is
        // never allowed to extend past 'cols'
        if (lengths[i] > cols && hard) {
            if (rowLength) {
                rows.push("");
            }
            wrapWord(rows, word, cols);
            continue;
        }

        if (rowLength + lengths[i] > cols && rowLength > 0) {
            if (wordWrap === false && rowLength < cols) {
                wrapWord(rows, word, cols);
                continue;
            }

            rows.push("");
        }

        if (rowLength + lengths[i] > cols && wordWrap === false) {
            wrapWord(rows, word, cols);
            continue;
        }

        rows[rows.length - 1] += word;
    }

    pre = rows.map((r) => trim === false ? r : r.trim()).join("\n");

    for (const [i, char] of Array.from(pre).entries()) {
        ret += char;

        if (ESCAPES.has(char)) {
            const code = parseFloat(/\d[^m]*/.exec(pre.slice(i, i + 4)));
            escapeCode = code === END_CODE ? null : code;
        }

        const code = esc.codes.get(Number(escapeCode));

        if (escapeCode && code) {
            if (pre[i + 1] === "\n") {
                ret += wrapAnsi(code);
            } else if (char === "\n") {
                ret += wrapAnsi(escapeCode);
            }
        }
    }

    return ret;
};

// For each newline, invoke the method separately
export default (str, cols, { join = true, ...options } = {}) => {
    const parts = String(str).normalize().split("\n").map((line) => exec(line, cols, options));

    // Resplit parts and remove empty line at the end.
    const lines = [];

    for (const part of parts) {
        const subLines = part.split("\n");
        lines.push(...subLines);
    }

    return join ? lines.join("\n") : lines;
};
