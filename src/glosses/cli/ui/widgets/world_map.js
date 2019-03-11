const {
    is,
    std
} = adone;
/**
 * based on: http://geeksretreat.wordpress.com/2012/04/26/html5s-canvas-lets-draw-the-world/
 */

const mapData = adone.lazify({
    world: std.path.join(adone.realm.getRootRealm().env.SHARE_PATH, "term/maps/world.json"),
    antartica: std.path.join(adone.realm.getRootRealm().env.SHARE_PATH, "term/maps/antartica.json"),
    us: std.path.join(adone.realm.getRootRealm().env.SHARE_PATH, "term/maps/us.json")
}, null, require);

class InnerMap {
    constructor(canvas, options = {}) {
        this.options = options;

        this.iCanvasStartXPos = 0;
        this.iCanvasStartYPos = 0;
        this.iCanvasHeight = this.options.height || 790;
        this.iCanvasWidth = this.options.width || 1580;
        this.iSpaceForLabel = is.undefined(this.options.labelSpace) ? 30 : this.options.labelSpace;
        this.iMapStartXPos = this.iCanvasStartXPos + this.iSpaceForLabel;
        this.iMapStartYPos = this.iCanvasStartYPos + this.iSpaceForLabel;
        this.iMapHeight = this.iCanvasHeight - (this.iSpaceForLabel * 2);
        this.iMapWidth = this.iCanvasWidth - (this.iSpaceForLabel * 2);

        this.canvas = canvas;
        if (canvas.getContext) {
            this.ctx = canvas.getContext("2d");
        } else {
            console.log("Canvas not supported!");
        }
    }

    draw() {
        this.ctx.clearRect(0, 0, this.options.width, this.options.height);

        // Draw the background
        if (!this.options.disableBackground) {
            this.drawBackground();
        }

        // Draw the map background
        if (!this.options.disableMapBackground) {
            this.drawMapBackground();
        }

        // Draw the map background
        if (!this.options.disableGraticule) {
            this.drawGraticule();
        }

        // Draw the land
        this.drawLandMass();

        // One-shot position request. (if supported)
        /*
        if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(this.plotPosition);
        }*/

    }

    drawBackground() {
        // Black background
        this.ctx.fillStyle = "rgb(0,0,0)";

        // Draw rectangle for the background
        this.ctx.fillRect(this.iCanvasStartXPos, this.iCanvasStartYPos, (this.iCanvasStartXPos + this.iCanvasWidth), this.iCanvasStartYPos + this.iCanvasHeight);

        this.ctx.stroke();
    }

    drawMapBackground() {
        // Ocean blue colour!
        this.ctx.fillStyle = "rgb(10, 133, 255)";

        // Draw rectangle for the map
        this.ctx.fillRect(this.iMapStartXPos, this.iMapStartYPos, this.iMapWidth, this.iMapHeight);
    }

    degreesOfLatitudeToScreenY(iDegreesOfLatitude) {
        const minLat = this.options.startLat || 0;
        const maxLat = this.options.endLat || 180;

        // Make the value positive, so we can calculate the percentage
        const iAdjustedDegreesOfLatitude = (Number(iDegreesOfLatitude)) + 90;
        let iDegreesOfLatitudeToScreenY = 0;

        if (iAdjustedDegreesOfLatitude < minLat || iAdjustedDegreesOfLatitude > maxLat) {
            return;
        }
        // Are we at the South pole?
        if (iAdjustedDegreesOfLatitude === minLat) {
            // Screen Y is the botton of the map (avoid divide by zero)
            iDegreesOfLatitudeToScreenY = this.iMapHeight + this.iMapStartYPos;
        } else if (iAdjustedDegreesOfLatitude === maxLat) {
            // Are we at the North pole (or beyond)?
            // Screen Y is the top of the map
            iDegreesOfLatitudeToScreenY = this.iMapStartYPos;
        } else {
            // Convert the latitude value to screen X      
            iDegreesOfLatitudeToScreenY = (this.iMapHeight - ((iAdjustedDegreesOfLatitude - minLat) * (this.iMapHeight / (maxLat - minLat))) + this.iMapStartYPos);
        }

        return iDegreesOfLatitudeToScreenY;
    }

    drawLongitudeLines(iDegreesBetweenGridLines) {
        const iNorthLatitude = 90;
        const iSouthLatitude = -90;
        let iDegreesScreenY = 0;
        let iLineOfLatitude;

        // Iterate around the latitude axis at the given interval
        for (iLineOfLatitude = iNorthLatitude; iLineOfLatitude >= iSouthLatitude; iLineOfLatitude -= iDegreesBetweenGridLines) {
            // Convert the latitude value and move the pen to the start of the line
            iDegreesScreenY = this.degreesOfLatitudeToScreenY(iLineOfLatitude, this.options);
            this.ctx.moveTo(this.iMapStartXPos, iDegreesScreenY);

            // Plot the line
            this.ctx.lineTo(this.iMapStartXPos + this.iMapWidth, iDegreesScreenY);

            // Put the label on the line
            this.ctx.fillText(iLineOfLatitude, this.iCanvasStartXPos + 5, iDegreesScreenY - 5);

            this.ctx.stroke();
        }
    }

    degreesOfLongitudeToScreenX(iDegreesOfLongitude) {
        const minLon = this.options.startLon || 0;
        const maxLon = this.options.endLon || 360;

        // Make the value positive, so we can calculate the percentage
        const iAdjustedDegreesOfLongitude = (Number(iDegreesOfLongitude)) + 180;
        let iDegreesOfLongitudeToScreenX = 0;

        if (iAdjustedDegreesOfLongitude < minLon || iAdjustedDegreesOfLongitude > maxLon) {
            return;
        }
        // Are we at the West -180 point?
        if (iAdjustedDegreesOfLongitude === minLon) {
            // Screen X is the left of the map (avoid divide by zero)
            iDegreesOfLongitudeToScreenX = this.iMapStartXPos;
        } else if (iAdjustedDegreesOfLongitude === maxLon) {
            // If the longitude crosses the 180 line fix it (doesn't translat to screen well)
            iDegreesOfLongitudeToScreenX = this.iMapStartXPos + this.iMapWidth;
        } else {
            // Convert the longitude value to screen X
            iDegreesOfLongitudeToScreenX = (this.iMapStartXPos + ((iAdjustedDegreesOfLongitude - minLon) * (this.iMapWidth / (maxLon - minLon))));
        }

        return iDegreesOfLongitudeToScreenX;
    }

    degToRad(angle) {
        // Degrees to radians
        return ((angle * Math.PI) / 180);
    }

    radToDeg(angle) {
        // Radians to degree
        return ((angle * 180) / Math.PI);
    }

    drawLatitudeLines(iDegreesBetweenGridLines) {
        const iMinLongitude = -180;
        const iMaxLongitude = 180;
        let iLineOfLongitude;
        let iDegreesScreenX;

        // Iterate around the longitude axis at the given interval
        for (iLineOfLongitude = iMinLongitude; iLineOfLongitude <= iMaxLongitude; iLineOfLongitude += iDegreesBetweenGridLines) {
            // Convert the longitude value and move the pen to the start of the line
            iDegreesScreenX = this.degreesOfLongitudeToScreenX(iLineOfLongitude);

            //iDegreesScreenX = iRadius * (degToRad(iLineOfLongitude) - (degToRad(iLineOfLongitude) * iCentralMeridian));

            this.ctx.moveTo(iDegreesScreenX, this.iMapStartYPos);

            // Plot the line
            this.ctx.lineTo(iDegreesScreenX, this.iMapStartYPos + this.iMapHeight);

            // Put the label on the line
            this.ctx.fillText(iLineOfLongitude, iDegreesScreenX - 10, this.iCanvasStartYPos + 10);

            this.ctx.stroke();
        }
    }

    drawGraticule() {
        // Set distance between lines
        const iDegreesetweenLatGridLines = 10;
        const iDegreesBetweenLonGridLines = 10;

        // Style
        this.ctx.lineWidth = 0.2;
        this.ctx.strokeStyle = "rgba(0, 0, 0, 0.1)";
        this.ctx.fillStyle = "rgb(255,255,255)";

        // Font styling
        this.ctx.font = "italic 10px sans-serif";
        this.ctx.textBaseline = "top";

        this.drawLatitudeLines(iDegreesetweenLatGridLines);
        this.drawLongitudeLines(iDegreesBetweenLonGridLines, this.options);
    }

    getMapData(region) {
        if (!region) {
            let worldMap = mapData.world;
            if (!this.options.excludeAntartica) {
                worldMap = Object.assign({}, worldMap); // clone
                for (let i = 0; i < mapData.antartica.shapes.length; i++) {
                    worldMap.shapes.push(mapData.antartica.shapes[i]);
                }
            }

            return worldMap;
        }
        return mapData[region];
    }

    addMarker(options) {
        const x = this.degreesOfLongitudeToScreenX(options.lon);
        const y = this.degreesOfLatitudeToScreenY(options.lat);

        this.ctx.font = "20pt Calibri";
        this.ctx.fillStyle = options.color || "red";
        this.ctx.fillText(options.char || "X", x, y);
    }

    drawLandMass() {
        const landMass = this.getMapData(this.options.region);
        let shape;
        let iLat;
        let iLon;
        let iShapeCounter;
        let iPointCouner;

        // A lighter shade of green
        this.ctx.fillStyle = this.options.shapeColor || "rgb(0,204,0)";
        if (this.options.shapeColor) {
            this.ctx.strokeStyle = this.options.shapeColor;
        }

        // Iterate around the shapes and draw
        for (iShapeCounter = 0; iShapeCounter < landMass.shapes.length; iShapeCounter++) {

            shape = landMass.shapes[iShapeCounter];

            this.ctx.beginPath();

            // Draw each point with the shape
            for (iPointCouner = 0; iPointCouner < shape.length; iPointCouner++) {

                iLon = shape[iPointCouner].lat;
                iLat = shape[iPointCouner].lon;

                // Before plotting convert the lat/Lon to screen coordinates
                this.ctx.lineTo(this.degreesOfLongitudeToScreenX(iLat),
                    this.degreesOfLatitudeToScreenY(iLon));
            }

            // Fill the path green
            if (!this.options.disableFill) {
                this.ctx.fill();
            }
            this.ctx.stroke();

        }

    }

    // plotPosition(position) {
    //     this.ctx.beginPath();

    //     // Draw a arc that represent the geo-location of the request
    //     this.ctx.arc(
    //         this.degreesOfLongitudeToScreenX(position.coords.longitude),
    //         this.degreesOfLatitudeToScreenY(position.coords.latitude),
    //         5,
    //         0,
    //         2 * Math.PI,
    //         false
    //     );

    //     // Point style
    //     this.ctx.fillStyle = 'rgb(255,255,0)';
    //     this.ctx.fill();
    //     this.ctx.lineWidth = 3;
    //     this.ctx.strokeStyle = "black";
    //     this.ctx.stroke();
    // }
}

export default class WorldMap extends adone.cli.ui.widget.Canvas {
    constructor(options = {}) {
        super(options, adone.cli.ui.canvas.Canvas1);
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

            this.innerMap = new InnerMap(this._canvas, opts);
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
            throw new Error("error: canvas context does not exist. addMarker() for maps must be called after the map has been added to the screen via screen.append()");
        }

        this.innerMap.addMarker(options);
    }

    getOptionsPrototype() {
        return {
            startLon: 10,
            endLon: 10,
            startLat: 10,
            endLat: 10,
            region: "us",
            markers: [
                { lon: "-79.0000", lat: "37.5000", color: "red", char: "X" },
                { lon: "79.0000", lat: "37.5000", color: "blue", char: "O" }
            ]
        };
    }

    clearMarkers() {
        this.innerMap.draw();
    }
}
WorldMap.prototype.type = "map";
