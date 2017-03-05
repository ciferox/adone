// import adone from "adone";

const screen = new adone.terminal.Screen();
const map = new adone.terminal.widget.Map({ label: "World Map" });

screen.append(map);

map.addMarker({ lon: "-79.0000", lat: "37.5000", color: "red", char: "X" });

screen.render();
