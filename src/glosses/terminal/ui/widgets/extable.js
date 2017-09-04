
const { is } = adone;

export default class ExTable extends adone.terminal.ui.widget.Element {
    constructor(options = { }) {
        if (is.array(options.columnSpacing)) {
            throw "Error: columnSpacing cannot be an array.\r\n" +
            "Note: From release 2.0.0 use property columnWidth instead of columnSpacing.\r\n" +
            "Please refere to the README or to https://github.com/yaronn/blessed-contrib/issues/39";
        }

        if (!options.columnWidth) {
            throw "Error: A table must get columnWidth as a property. Please refer to the README.";
        }

        options.columnSpacing = options.columnSpacing == null ? 10 : options.columnSpacing;
        options.bold = true;
        options.selectedFg = options.selectedFg || "white";
        options.selectedBg = options.selectedBg || "blue";
        options.fg = options.fg || "green";
        options.bg = options.bg || "";
        options.interactive = is.undefined(options.interactive) ? true : options.interactive;
        super(options);

        this.rows = new adone.terminal.ui.widget.List({
            //height: 0,
            top: 2,
            width: 0,
            left: 1,
            style: {
                selected: {
                    fg: options.selectedFg,
                    bg: options.selectedBg
                },
                item: {
                    fg: options.fg,
                    bg: options.bg
                }
            },
            keys: options.keys,
            tags: true,
            interactive: options.interactive,
            screen: this.screen
        });

        this.append(this.rows);

        this.on("attach", () => {
            if (this.options.data) {
                this.setData(this.options.data);
            }
        });
    }

    focus() {
        this.rows.focus();
    }

    render() {
        if (this.screen.focused == this.rows) { 
            this.rows.focus(); 
        }

        this.rows.width = this.width - 3;
        this.rows.height = this.height - 4;
        super.render();
    }

    setData(table) {
        const self = this;
        const dataToString = function (d) {
            let str = "";
            d.forEach((r, i) => {
                const colsize = self.options.columnWidth[i];
                const strip = adone.text.ansi.stripEscapeCodes(r.toString());
                const ansiLen = r.toString().length - strip.length;
                r = r.toString().substring(0, colsize + ansiLen); //compensate for ansi len
                let spaceLength = colsize - strip.length + self.options.columnSpacing;
                if (spaceLength < 0) {
                    spaceLength = 0;
                }
                const spaces = new Array(spaceLength).join(" ");
                str += r + spaces;
            });
            return str;
        };

        const formatted = [];

        table.data.forEach((d) => {
            const str = dataToString(d);
            formatted.push(str);
        });
        this.setContent(dataToString(table.headers));
        this.rows.setItems(formatted);
    }

    getOptionsPrototype() {
        return {
            keys: true,
            fg: "white",
            interactive: false,
            label: "Active Processes",
            width: "30%",
            height: "30%",
            border: { type: "line", fg: "cyan" },
            columnSpacing: 10,
            columnWidth: [16, 12],
            data: {
                headers: ["col1", "col2"],
                data: [["a", "b"],
                     ["5", "u"],
                     ["x", "16.1"]]
            }
        };
    }
}
ExTable.prototype.type = "extable";
