const { is, util, terminal } = adone;

export default (data, { noHeader = false, borderless = false, model, style } = {}) => {
    const head = [];
    const colAligns = [];
    const map = {};

    let col = 0;
    for (const m of model) {
        !noHeader && head.push(m.header);
        colAligns.push(is.string(m.align) ? m.align : "");
        map[m.id] = adone.vendor.lodash.omit(m, "id");
        map[m.id].col = col++;
    }

    let TableClass;
    if (borderless) {
        TableClass = adone.text.table.BorderlessTable;
    } else {
        TableClass = adone.text.table.Table;
    }

    const table = new TableClass({
        head,
        colAligns,
        style
    });

    for (const item of data) {
        const row = new Array(model.length);
        for (const [key, val] of Object.entries(item)) {
            if (is.plainObject(map[key])) {
                const m = map[key];
                const style = m.style;
                const styleType = util.typeOf(style);
                const formatType = util.typeOf(m.format);
                let str;
                switch (formatType) {
                    case "string": str = adone.sprintf(m.format, val); break;
                    case "function": str = m.format(val); break;
                    default: str = val;
                }
                switch (styleType) {
                    case "string": str = `${style}${str}{/}`; break;
                    case "function": str = `${style(val)}${str}{/}`; break;
                }
                row[m.col] = terminal.parse(str);
            }
        }
        table.push(row);
    }

    return table.toString();
};
