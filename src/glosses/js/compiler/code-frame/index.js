// @flow

/**
 * RegExp to test for newlines in terminal.
 */

const NEWLINE = /\r\n|[\n\r\u2028\u2029]/;

/**
 * RegExp to test for what seems to be a JSX tag name.
 */

/**
 * Create a code frame, adding line numbers, code highlighting, and pointing to a given position.
 */

export default function (
    rawLines: string,
    lineNumber: number,
    colNumber: ?number,
    opts: Object = {},
): string {
    colNumber = Math.max(colNumber, 0);

    const linesAbove = opts.linesAbove || 2;
    const linesBelow = opts.linesBelow || 3;

    const lines = rawLines.split(NEWLINE);
    let start = Math.max(lineNumber - (linesAbove + 1), 0);
    let end = Math.min(lines.length, lineNumber + linesBelow);

    if (!lineNumber && !colNumber) {
        start = 0;
        end = lines.length;
    }

    const numberMaxWidth = String(end).length;

    const frame = lines.slice(start, end).map((line, index) => {
        const number = start + 1 + index;
        const paddedNumber = ` ${number}`.slice(-numberMaxWidth);
        const gutter = ` ${paddedNumber} | `;
        if (number === lineNumber) {
            let markerLine = "";
            if (colNumber) {
                const markerSpacing = line.slice(0, colNumber - 1).replace(/[^\t]/g, " ");
                markerLine = [
                    "\n ",
                    gutter.replace(/\d/g, " "),
                    markerSpacing,
                    "^"
                ].join("");
            }
            return [
                ">",
                gutter,
                line,
                markerLine
            ].join("");
        } else {
            return ` ${gutter}${line}`;
        }
    }).join("\n");

    return frame;
}
