// import adone from "adone";

const screen = new adone.cui.Screen();
const map = new adone.cui.widget.Map({ label: "World Map" });

screen.append(map);

map.addMarker({ lon: "-79.0000", lat: "37.5000", color: "red", char: "X" });

screen.render();
