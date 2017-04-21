// import adone from "adone";

const screen = new adone.cui.Screen();
const gauge = new adone.cui.widget.Gauge({ label: "Progress" });

screen.append(gauge);

gauge.setPercent(25);

screen.render();
