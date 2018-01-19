const {
    util: {
        terraformer: {
            WKX
        }
    }
} = adone;

export default class MultiPolygon extends WKX.Geometry {
    constructor(polygons) {
        super();
        this.polygons = polygons || [];

        if (this.polygons.length > 0) {
            this.hasZ = this.polygons[0].hasZ;
            this.hasM = this.polygons[0].hasM;
        }
    }

    static Z(polygons) {
        const multiPolygon = new MultiPolygon(polygons);
        multiPolygon.hasZ = true;
        return multiPolygon;
    }

    static M(polygons) {
        const multiPolygon = new MultiPolygon(polygons);
        multiPolygon.hasM = true;
        return multiPolygon;
    }

    static ZM(polygons) {
        const multiPolygon = new MultiPolygon(polygons);
        multiPolygon.hasZ = true;
        multiPolygon.hasM = true;
        return multiPolygon;
    }

    static _parseWkt(value, options) {
        const multiPolygon = new MultiPolygon();
        multiPolygon.srid = options.srid;
        multiPolygon.hasZ = options.hasZ;
        multiPolygon.hasM = options.hasM;

        if (value.isMatch(["EMPTY"])) {
            return multiPolygon;
        }

        value.expectGroupStart();

        do {
            value.expectGroupStart();

            const exteriorRing = [];
            const interiorRings = [];

            value.expectGroupStart();
            exteriorRing.push.apply(exteriorRing, value.matchCoordinates(options));
            value.expectGroupEnd();

            while (value.isMatch([","])) {
                value.expectGroupStart();
                interiorRings.push(value.matchCoordinates(options));
                value.expectGroupEnd();
            }

            multiPolygon.polygons.push(new WKX.Polygon(exteriorRing, interiorRings));

            value.expectGroupEnd();

        } while (value.isMatch([","]));

        value.expectGroupEnd();

        return multiPolygon;
    }

    static _parseWkb(value, options) {
        const multiPolygon = new MultiPolygon();
        multiPolygon.srid = options.srid;
        multiPolygon.hasZ = options.hasZ;
        multiPolygon.hasM = options.hasM;

        const polygonCount = value.readUInt32();

        for (let i = 0; i < polygonCount; i++) {
            multiPolygon.polygons.push(WKX.Geometry.parse(value, options));
        }

        return multiPolygon;
    }

    static _parseTwkb(value, options) {
        const multiPolygon = new MultiPolygon();
        multiPolygon.hasZ = options.hasZ;
        multiPolygon.hasM = options.hasM;

        if (options.isEmpty) {
            return multiPolygon;
        }

        const previousPoint = new WKX.Point(0, 0, options.hasZ ? 0 : undefined, options.hasM ? 0 : undefined);
        const polygonCount = value.readVarInt();

        for (let i = 0; i < polygonCount; i++) {
            const polygon = new WKX.Polygon();
            polygon.hasZ = options.hasZ;
            polygon.hasM = options.hasM;

            const ringCount = value.readVarInt();
            const exteriorRingCount = value.readVarInt();

            for (let j = 0; j < exteriorRingCount; j++) {
                polygon.exteriorRing.push(WKX.Point._readTwkbPoint(value, options, previousPoint));
            }

            for (let j = 1; j < ringCount; j++) {
                const interiorRing = [];

                const interiorRingCount = value.readVarInt();

                for (let k = 0; k < interiorRingCount; k++) {
                    interiorRing.push(WKX.Point._readTwkbPoint(value, options, previousPoint));
                }

                polygon.interiorRings.push(interiorRing);
            }

            multiPolygon.polygons.push(polygon);
        }

        return multiPolygon;
    }

    static _parseGeoJSON(value) {
        const multiPolygon = new MultiPolygon();

        if (value.coordinates.length > 0 && value.coordinates[0].length > 0 && value.coordinates[0][0].length > 0) {
            multiPolygon.hasZ = value.coordinates[0][0][0].length > 2;
        }

        for (let i = 0; i < value.coordinates.length; i++) {
            multiPolygon.polygons.push(WKX.Polygon._parseGeoJSON({ coordinates: value.coordinates[i] }));
        }

        return multiPolygon;
    }

    toWkt() {
        if (this.polygons.length === 0) {
            return this._getWktType(WKX.Types.wkt.MultiPolygon, true);
        }

        let wkt = `${this._getWktType(WKX.Types.wkt.MultiPolygon, false)}(`;

        for (let i = 0; i < this.polygons.length; i++) {
            wkt += `${this.polygons[i]._toInnerWkt()},`;
        }

        wkt = wkt.slice(0, -1);
        wkt += ")";

        return wkt;
    }

    toWkb() {
        const wkb = new WKX.BinaryWriter(this._getWkbSize());

        wkb.writeInt8(1);

        this._writeWkbType(wkb, WKX.Types.wkb.MultiPolygon);
        wkb.writeUInt32LE(this.polygons.length);

        for (let i = 0; i < this.polygons.length; i++) {
            wkb.writeBuffer(this.polygons[i].toWkb({ srid: this.srid }));
        }

        return wkb.buffer;
    }

    toTwkb() {
        const twkb = new WKX.BinaryWriter(0, true);

        const precision = WKX.Geometry.getTwkbPrecision(5, 0, 0);
        const isEmpty = this.polygons.length === 0;

        this._writeTwkbHeader(twkb, WKX.Types.wkb.MultiPolygon, precision, isEmpty);

        if (this.polygons.length > 0) {
            twkb.writeVarInt(this.polygons.length);

            const previousPoint = new WKX.Point(0, 0, 0, 0);
            for (let i = 0; i < this.polygons.length; i++) {
                twkb.writeVarInt(1 + this.polygons[i].interiorRings.length);

                twkb.writeVarInt(this.polygons[i].exteriorRing.length);

                for (let j = 0; j < this.polygons[i].exteriorRing.length; j++) {
                    this.polygons[i].exteriorRing[j]._writeTwkbPoint(twkb, precision, previousPoint);
                }

                for (let j = 0; j < this.polygons[i].interiorRings.length; j++) {
                    twkb.writeVarInt(this.polygons[i].interiorRings[j].length);

                    for (let k = 0; k < this.polygons[i].interiorRings[j].length; k++) {
                        this.polygons[i].interiorRings[j][k]._writeTwkbPoint(twkb, precision, previousPoint);
                    }
                }
            }
        }

        return twkb.buffer;
    }

    _getWkbSize() {
        let size = 1 + 4 + 4;

        for (let i = 0; i < this.polygons.length; i++) {
            size += this.polygons[i]._getWkbSize();
        }

        return size;
    }

    toGeoJSON(options) {
        const geoJSON = WKX.Geometry.prototype.toGeoJSON.call(this, options);
        geoJSON.type = WKX.Types.geoJSON.MultiPolygon;
        geoJSON.coordinates = [];

        for (let i = 0; i < this.polygons.length; i++) {
            geoJSON.coordinates.push(this.polygons[i].toGeoJSON().coordinates);
        }

        return geoJSON;
    }
}
