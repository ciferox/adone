// import adone from "adone";

const screen = new adone.terminal.Screen();
const gauge = new adone.terminal.widget.Gauge({ label: "Progress" });

screen.append(gauge);

gauge.setPercent(25);

screen.render();
