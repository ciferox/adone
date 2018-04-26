const {
    util: {
        terraformer: {
            WKX
        }
    }
} = adone;

export default class Polygon extends WKX.Geometry {
    constructor(exteriorRing, interiorRings, srid) {
        super();
        this.exteriorRing = exteriorRing || [];
        this.interiorRings = interiorRings || [];
        this.srid = srid;

        if (this.exteriorRing.length > 0) {
            this.hasZ = this.exteriorRing[0].hasZ;
            this.hasM = this.exteriorRing[0].hasM;
        }
    }

    static Z(exteriorRing, interiorRings, srid) {
        const polygon = new Polygon(exteriorRing, interiorRings, srid);
        polygon.hasZ = true;
        return polygon;
    }

    static M(exteriorRing, interiorRings, srid) {
        const polygon = new Polygon(exteriorRing, interiorRings, srid);
        polygon.hasM = true;
        return polygon;
    }

    static ZM(exteriorRing, interiorRings, srid) {
        const polygon = new Polygon(exteriorRing, interiorRings, srid);
        polygon.hasZ = true;
        polygon.hasM = true;
        return polygon;
    }

    static _parseWkt(value, options) {
        const polygon = new Polygon();
        polygon.srid = options.srid;
        polygon.hasZ = options.hasZ;
        polygon.hasM = options.hasM;

        if (value.isMatch(["EMPTY"])) {
            return polygon;
        }

        value.expectGroupStart();

        value.expectGroupStart();
        polygon.exteriorRing.push.apply(polygon.exteriorRing, value.matchCoordinates(options));
        value.expectGroupEnd();

        while (value.isMatch([","])) {
            value.expectGroupStart();
            polygon.interiorRings.push(value.matchCoordinates(options));
            value.expectGroupEnd();
        }

        value.expectGroupEnd();

        return polygon;
    }

    static _parseWkb(value, options) {
        const polygon = new Polygon();
        polygon.srid = options.srid;
        polygon.hasZ = options.hasZ;
        polygon.hasM = options.hasM;

        const ringCount = value.readUInt32();

        if (ringCount > 0) {
            const exteriorRingCount = value.readUInt32();

            for (let i = 0; i < exteriorRingCount; i++) {
                polygon.exteriorRing.push(WKX.Point._readWkbPoint(value, options));
            }

            for (let i = 1; i < ringCount; i++) {
                const interiorRing = [];

                const interiorRingCount = value.readUInt32();

                for (let j = 0; j < interiorRingCount; j++) {
                    interiorRing.push(WKX.Point._readWkbPoint(value, options));
                }

                polygon.interiorRings.push(interiorRing);
            }
        }

        return polygon;
    }

    static _parseTwkb(value, options) {
        const polygon = new Polygon();
        polygon.hasZ = options.hasZ;
        polygon.hasM = options.hasM;

        if (options.isEmpty) {
            return polygon;
        }

        const previousPoint = new WKX.Point(0, 0, options.hasZ ? 0 : undefined, options.hasM ? 0 : undefined);
        const ringCount = value.readVarInt();
        const exteriorRingCount = value.readVarInt();

        for (let i = 0; i < exteriorRingCount; i++) {
            polygon.exteriorRing.push(WKX.Point._readTwkbPoint(value, options, previousPoint));
        }

        for (let i = 1; i < ringCount; i++) {
            const interiorRing = [];

            const interiorRingCount = value.readVarInt();

            for (let j = 0; j < interiorRingCount; j++) {
                interiorRing.push(WKX.Point._readTwkbPoint(value, options, previousPoint));
            }

            polygon.interiorRings.push(interiorRing);
        }

        return polygon;
    }

    static _parseGeoJSON(value) {
        const polygon = new Polygon();

        if (value.coordinates.length > 0 && value.coordinates[0].length > 0) {
            polygon.hasZ = value.coordinates[0][0].length > 2;
        }

        for (let i = 0; i < value.coordinates.length; i++) {
            if (i > 0) {
                polygon.interiorRings.push([]);
            }

            for (let j = 0; j < value.coordinates[i].length; j++) {
                if (i === 0) {
                    polygon.exteriorRing.push(WKX.Point._readGeoJSONPoint(value.coordinates[i][j]));
                } else {
                    polygon.interiorRings[i - 1].push(WKX.Point._readGeoJSONPoint(value.coordinates[i][j]));
                }
            }
        }

        return polygon;
    }

    toWkt() {
        if (this.exteriorRing.length === 0) {
            return this._getWktType(WKX.Types.wkt.Polygon, true);
        }

        return this._getWktType(WKX.Types.wkt.Polygon, false) + this._toInnerWkt();
    }

    _toInnerWkt() {
        let innerWkt = "((";

        for (let i = 0; i < this.exteriorRing.length; i++) {
            innerWkt += `${this._getWktCoordinate(this.exteriorRing[i])},`;
        }

        innerWkt = innerWkt.slice(0, -1);
        innerWkt += ")";

        for (let i = 0; i < this.interiorRings.length; i++) {
            innerWkt += ",(";

            for (let j = 0; j < this.interiorRings[i].length; j++) {
                innerWkt += `${this._getWktCoordinate(this.interiorRings[i][j])},`;
            }

            innerWkt = innerWkt.slice(0, -1);
            innerWkt += ")";
        }

        innerWkt += ")";

        return innerWkt;
    }

    toWkb(parentOptions) {
        const wkb = new WKX.BinaryWriter(this._getWkbSize());

        wkb.writeInt8(1);

        this._writeWkbType(wkb, WKX.Types.wkb.Polygon, parentOptions);

        if (this.exteriorRing.length > 0) {
            wkb.writeUInt32LE(1 + this.interiorRings.length);
            wkb.writeUInt32LE(this.exteriorRing.length);
        } else {
            wkb.writeUInt32LE(0);
        }

        for (let i = 0; i < this.exteriorRing.length; i++) {
            this.exteriorRing[i]._writeWkbPoint(wkb);
        }

        for (let i = 0; i < this.interiorRings.length; i++) {
            wkb.writeUInt32LE(this.interiorRings[i].length);

            for (let j = 0; j < this.interiorRings[i].length; j++) {
                this.interiorRings[i][j]._writeWkbPoint(wkb);
            }
        }

        return wkb.buffer;
    }

    toTwkb() {
        const twkb = new WKX.BinaryWriter(0, true);

        const precision = WKX.Geometry.getTwkbPrecision(5, 0, 0);
        const isEmpty = this.exteriorRing.length === 0;

        this._writeTwkbHeader(twkb, WKX.Types.wkb.Polygon, precision, isEmpty);

        if (this.exteriorRing.length > 0) {
            twkb.writeVarInt(1 + this.interiorRings.length);

            twkb.writeVarInt(this.exteriorRing.length);

            const previousPoint = new WKX.Point(0, 0, 0, 0);
            for (let i = 0; i < this.exteriorRing.length; i++) {
                this.exteriorRing[i]._writeTwkbPoint(twkb, precision, previousPoint);
            }

            for (let i = 0; i < this.interiorRings.length; i++) {
                twkb.writeVarInt(this.interiorRings[i].length);

                for (let j = 0; j < this.interiorRings[i].length; j++) {
                    this.interiorRings[i][j]._writeTwkbPoint(twkb, precision, previousPoint);
                }
            }
        }

        return twkb.buffer;
    }

    _getWkbSize() {
        let coordinateSize = 16;

        if (this.hasZ) {
            coordinateSize += 8;
        }
        if (this.hasM) {
            coordinateSize += 8;
        }

        let size = 1 + 4 + 4;

        if (this.exteriorRing.length > 0) {
            size += 4 + (this.exteriorRing.length * coordinateSize);
        }

        for (let i = 0; i < this.interiorRings.length; i++) {
            size += 4 + (this.interiorRings[i].length * coordinateSize);
        }

        return size;
    }

    toGeoJSON(options) {
        const geoJSON = WKX.Geometry.prototype.toGeoJSON.call(this, options);
        geoJSON.type = WKX.Types.geoJSON.Polygon;
        geoJSON.coordinates = [];

        if (this.exteriorRing.length > 0) {
            const exteriorRing = [];

            for (let i = 0; i < this.exteriorRing.length; i++) {
                if (this.hasZ) {
                    exteriorRing.push([this.exteriorRing[i].x, this.exteriorRing[i].y, this.exteriorRing[i].z]);
                } else {
                    exteriorRing.push([this.exteriorRing[i].x, this.exteriorRing[i].y]);
                }
            }

            geoJSON.coordinates.push(exteriorRing);
        }

        for (let j = 0; j < this.interiorRings.length; j++) {
            const interiorRing = [];

            for (let k = 0; k < this.interiorRings[j].length; k++) {
                if (this.hasZ) {
                    interiorRing.push([this.interiorRings[j][k].x, this.interiorRings[j][k].y, this.interiorRings[j][k].z]);
                } else {
                    interiorRing.push([this.interiorRings[j][k].x, this.interiorRings[j][k].y]);
                }
            }

            geoJSON.coordinates.push(interiorRing);
        }

        return geoJSON;
    }
}
