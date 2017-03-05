// import adone from "adone";

const screen = new adone.terminal.Screen();
const grid = new adone.terminal.GridLayout({ rows: 2, cols: 2, hideBorder: true, screen });
const gauge1 = grid.set(0, 0, 1, 1, adone.terminal.widget.Gauge, { showLabel: false, stack: [{ percent: 30, stroke: "green" }, { percent: 30, stroke: "magenta" }, { percent: 40, stroke: "cyan" }] });

screen.render();
