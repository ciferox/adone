// import adone from "adone";

const screen = new adone.terminal.Screen();
const grid = new adone.terminal.GridLayout({ rows: 12, cols: 12, hideBorder: true, screen });
const map = grid.set(0, 0, 4, 4, adone.terminal.widget.Map, {});
const box = grid.set(4, 4, 4, 4, adone.terminal.widget.Element, { content: "My Element" });

screen.render();
