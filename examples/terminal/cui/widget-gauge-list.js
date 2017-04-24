// import adone from "adone";

const screen = new adone.cui.Screen();
const grid = new adone.cui.GridLayout({ rows: 2, cols: 2, hideBorder: true, screen });
const gaugeList = grid.set(0, 0, 1, 2, adone.cui.widget.GaugeList, {
    gaugeSpacing: 0,
    gaugeHeight: 1,
    gauges:
    [{ showLabel: false, stack: [{ percent: 30, stroke: "green" }, { percent: 30, stroke: "magenta" }, { percent: 40, stroke: "cyan" }] }
        , { showLabel: false, stack: [{ percent: 40, stroke: "yellow" }, { percent: 20, stroke: "magenta" }, { percent: 40, stroke: "green" }] }
        , { showLabel: false, stack: [{ percent: 50, stroke: "red" }, { percent: 10, stroke: "magenta" }, { percent: 40, stroke: "cyan" }] }]
});

screen.render();

screen.key(["escape", "q", "C-c"], function (ch, key) {
    return process.exit(0);
});
