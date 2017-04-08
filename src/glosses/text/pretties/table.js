const { is, util, terminal, x } = adone;

const percentRegexp = /^(\d{1,3}(?:.\d+)?)%$/;

const coercePercent = (percent, total) => {
    const match = percent.match(percentRegexp);
    if (is.null(match)) {
        throw new x.InvalidArgument(`Invalid percent value: ${percent}`);
    }
    const value = parseFloat(match[1]);
    if (value > 100) {
        throw new x.InvalidArgument(`Invalid percent value: ${percent}`);
    }
    return Math.floor(value / 100 * total);
};

export default function prettyTable(data, {
    noHeader = false,
    borderless = false,
    model,
    style = {},
    width = null
} = {}) {
    // normalize width
    // dont touch if it is a number
    // if it is a string then
    // assume it is a percent value and calculate relative width to the terminal
    let tableWidth = null;
    if (!is.null(width)) {
        if (is.string(width)) {
            let bordersWidth = 0;
            if (!borderless) {
                // todo: custom chars?
                bordersWidth += 1 + 1;  // left + right border
                bordersWidth += model.length - 1;  // between cells
            }
            const maxWidth = terminal.cols - bordersWidth;
            tableWidth = coercePercent(width, maxWidth);
        } else if (is.number(width)) {
            tableWidth = width;
        }
    }

    const head = [];
    const colAligns = [];
    const map = {};

    let col = 0;
    for (const m of model) {
        !noHeader && head.push(m.header);
        colAligns.push(is.string(m.align) ? m.align : null);
        map[m.id] = adone.vendor.lodash.omit(m, "id");
        map[m.id].col = col++;

        if (m.maxWidth) {
            if (is.number(m.maxWidth)) {
                map[m.id].maxWidth = m.maxWidth;
            }
        }

        if (m.wordwrap) {
            map[m.id].wordwrap = is.string(m.wordwrap) ? m.wordwrap : "soft";
        }
    }

    // calculate cols widths

    let predefinedWidthCols = 0;
    let remainingWidth = tableWidth;

    for (const m of model) {
        let colWidth = null;
        if (is.number(m.width)) {
            colWidth = m.width;
        } else if (!is.null(tableWidth)) {
            if (is.string(m.width)) {
                colWidth = coercePercent(m.width, tableWidth);
            }
        }
        map[m.id].colWidth = colWidth;

        if (!is.null(colWidth) && !is.null(tableWidth)) {
            ++predefinedWidthCols;
            remainingWidth -= colWidth;
        }
    }

    if (!is.null(tableWidth)) {
        const colSize = Math.floor(remainingWidth / (model.length - predefinedWidthCols));

        for (const m of model) {
            if (!is.null(map[m.id].colWidth)) {
                continue;
            }
            map[m.id].colWidth = colSize;
        }
    }

    const colWidths = model.map(({ id }) => map[id].colWidth);

    let TableClass;
    if (borderless) {
        TableClass = adone.text.table.BorderlessTable;
    } else {
        TableClass = adone.text.table.Table;
    }

    const table = new TableClass({ head, colAligns, colWidths, style });

    const padLeft = table.options.style["padding-left"];
    const padRight = table.options.style["padding-right"];

    for (const item of data) {
        const row = new Array(model.length).fill(null);
        for (const [key, val] of Object.entries(item)) {
            if (is.plainObject(map[key])) {
                const m = map[key];
                const style = m.style;
                const styleType = util.typeOf(style);
                const formatType = util.typeOf(m.format);
                let str;
                switch (formatType) {
                    case "string": {
                        str = adone.sprintf(m.format, val);
                        break;
                    }
                    case "function": {
                        str = m.format(val);
                        break;
                    }
                    default: {
                        str = val;
                    }
                }
                switch (styleType) {
                    case "string": {
                        str = `${style}${str}{/}`;
                        break;
                    }
                    case "function": {
                        str = `${style(val)}${str}{/}`;
                        break;
                    }
                }

                str = terminal.parse(str);

                if (m.wordwrap && !is.null(m.colWidth)) {
                    str = str.toString();
                    const maxLen = m.colWidth - padLeft - padRight;
                    if (m.colWidth && str.length > maxLen) {
                        str = adone.text.wordwrap(str, maxLen, { mode: m.wordwrap });
                    }
                }

                row[m.col] = str;
            }
        }
        table.push(row);
    }

    return table.toString();
}
