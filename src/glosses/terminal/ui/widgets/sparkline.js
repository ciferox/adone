import adone from "adone";

const ticks = ["▁", "▂", "▃", "▄", "▅", "▆", "▇", "█"];

const sparkline = function (numbers, options) {
    options = options || {};
    const max = typeof options.max === "number" ? options.max : Math.max.apply(null, numbers);
    const min = typeof options.min === "number" ? options.min : Math.min.apply(null, numbers);
    const results = [];
    let f = ~~(((max - min) << 8) / (ticks.length - 1));
    if (f < 1) f = 1;

    for (let i = 0; i < numbers.length; i++) {
        results.push(ticks[~~(((numbers[i] - min) << 8) / f)]);
    }

    return results.join("");
};

export default class SparkLine extends adone.terminal.widget.Element {
    constructor(options = {}) {
        options.bufferLength = options.bufferLength || 30;
        options.style = options.style || {};
        options.style.titleFg = options.style.titleFg || "white";
        super(options);

        this.on("attach", () => {
            if (this.options.data) {
                this.setData(this.options.data.titles, this.options.data.data);
            }
        });
    }

    setData(titles, datasets) {
        var res = "\r\n";
        for (var i = 0; i < titles.length; i++) {
            res += "{bold}{" + this.options.style.titleFg + "-fg}" + titles[i] + ":{/" + this.options.style.titleFg + "-fg}{/bold}\r\n";
            res += sparkline(datasets[i].slice(0, this.width - 2)) + "\r\n\r\n";
        }

        this.setContent(res);
    }

    getOptionsPrototype() {
        return {
            label: "SparkLine",
            tags: true,
            border: { type: "line", fg: "cyan" },
            width: "50%",
            height: "50%",
            style: { fg: "blue" },
            data: {
                titles: ["Sparkline1", "Sparkline2"],
                data: [[10, 20, 30, 20, 50, 70, 60, 30, 35, 38]
                    , [40, 10, 40, 50, 20, 30, 20, 20, 19, 40]]
            }
        };
    }
}
SparkLine.prototype.type = "sparkline";