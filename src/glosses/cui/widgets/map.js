
const InnerMap = require("./_map");

export default class Map extends adone.cui.widget.Canvas {
    constructor(options = { }) {
        super(options);
        this.on("attach", () => {
            options.style = options.style || {};
            const opts = {
                excludeAntartica: true,
                disableBackground: true,
                disableMapBackground: true,
                disableGraticule: true,
                disableFill: true,
                width: this.ctx._canvas.width,
                height: this.ctx._canvas.height,
                shapeColor: options.style.shapeColor || "green"
            };

            opts.startLon = options.startLon || undefined;
            opts.endLon = options.endLon || undefined;
            opts.startLat = options.startLat || undefined;
            opts.endLat = options.endLat || undefined;
            opts.region = options.region || undefined;
            opts.labelSpace = options.labelSpace || 5;
        
            this.ctx.strokeStyle = options.style.stroke || "green";
            this.ctx.fillStyle = options.style.fill || "green";

            this.innerMap = new InnerMap(opts, this._canvas);
            this.innerMap.draw();

            if (this.options.markers) {
                for (const m in this.options.markers) {
                    this.addMarker(this.options.markers[m]);
                }
            }
        });   
    }

    calcSize() {
        this.canvasSize = { width: this.width * 2 - 12, height: this.height * 4 };
    }

    addMarker(options) {
        if (!this.innerMap) {
            throw "error: canvas context does not exist. addMarker() for maps must be called after the map has been added to the screen via screen.append()";
        }

        this.innerMap.addMarker(options);
    }

    getOptionsPrototype() {
        return { startLon: 10,
            endLon: 10,
            startLat: 10,
            endLat: 10,
            region: "us",
            markers:
            [{ lon: "-79.0000", lat: "37.5000", color: "red", char: "X" },
                  { lon: "79.0000", lat: "37.5000", color: "blue", char: "O" }
            ]
        };
    }

    clearMarkers() {
        this.innerMap.draw();
    }
}
Map.prototype.type = "map";
