const {
    util: {
        terraformer: {
            WKX
        }
    }
} = adone;

export default class LineString extends WKX.Geometry {
    constructor(points, srid) {
        super();
        this.points = points || [];
        this.srid = srid;

        if (this.points.length > 0) {
            this.hasZ = this.points[0].hasZ;
            this.hasM = this.points[0].hasM;
        }
    }

    static Z(points, srid) {
        const lineString = new LineString(points, srid);
        lineString.hasZ = true;
        return lineString;
    }

    static M(points, srid) {
        const lineString = new LineString(points, srid);
        lineString.hasM = true;
        return lineString;
    }

    static ZM(points, srid) {
        const lineString = new LineString(points, srid);
        lineString.hasZ = true;
        lineString.hasM = true;
        return lineString;
    }

    static _parseWkt(value, options) {
        const lineString = new LineString();
        lineString.srid = options.srid;
        lineString.hasZ = options.hasZ;
        lineString.hasM = options.hasM;

        if (value.isMatch(["EMPTY"])) {
            return lineString;
        }

        value.expectGroupStart();
        lineString.points.push.apply(lineString.points, value.matchCoordinates(options));
        value.expectGroupEnd();

        return lineString;
    }

    static _parseWkb(value, options) {
        const lineString = new LineString();
        lineString.srid = options.srid;
        lineString.hasZ = options.hasZ;
        lineString.hasM = options.hasM;

        const pointCount = value.readUInt32();

        for (let i = 0; i < pointCount; i++) {
            lineString.points.push(WKX.Point._readWkbPoint(value, options));
        }

        return lineString;
    }

    static _parseTwkb(value, options) {
        const lineString = new LineString();
        lineString.hasZ = options.hasZ;
        lineString.hasM = options.hasM;

        if (options.isEmpty) {
            return lineString;
        }

        const previousPoint = new WKX.Point(0, 0, options.hasZ ? 0 : undefined, options.hasM ? 0 : undefined);
        const pointCount = value.readVarInt();

        for (let i = 0; i < pointCount; i++) {
            lineString.points.push(WKX.Point._readTwkbPoint(value, options, previousPoint));
        }

        return lineString;
    }

    static _parseGeoJSON(value) {
        const lineString = new LineString();

        if (value.coordinates.length > 0) {
            lineString.hasZ = value.coordinates[0].length > 2;
        }

        for (let i = 0; i < value.coordinates.length; i++) {
            lineString.points.push(WKX.Point._readGeoJSONPoint(value.coordinates[i]));
        }

        return lineString;
    }

    toWkt() {
        if (this.points.length === 0) {
            return this._getWktType(WKX.Types.wkt.LineString, true);
        }

        return this._getWktType(WKX.Types.wkt.LineString, false) + this._toInnerWkt();
    }

    _toInnerWkt() {
        let innerWkt = "(";

        for (let i = 0; i < this.points.length; i++) {
            innerWkt += `${this._getWktCoordinate(this.points[i])},`;
        }

        innerWkt = innerWkt.slice(0, -1);
        innerWkt += ")";

        return innerWkt;
    }

    toWkb(parentOptions) {
        const wkb = new WKX.BinaryWriter(this._getWkbSize());

        wkb.writeInt8(1);

        this._writeWkbType(wkb, WKX.Types.wkb.LineString, parentOptions);
        wkb.writeUInt32LE(this.points.length);

        for (let i = 0; i < this.points.length; i++) {
            this.points[i]._writeWkbPoint(wkb);
        }

        return wkb.buffer;
    }

    toTwkb() {
        const twkb = new WKX.BinaryWriter(0, true);

        const precision = WKX.Geometry.getTwkbPrecision(5, 0, 0);
        const isEmpty = this.points.length === 0;

        this._writeTwkbHeader(twkb, WKX.Types.wkb.LineString, precision, isEmpty);

        if (this.points.length > 0) {
            twkb.writeVarInt(this.points.length);

            const previousPoint = new WKX.Point(0, 0, 0, 0);
            for (let i = 0; i < this.points.length; i++) {
                this.points[i]._writeTwkbPoint(twkb, precision, previousPoint);
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

        return 1 + 4 + 4 + (this.points.length * coordinateSize);
    }

    toGeoJSON(options) {
        const geoJSON = WKX.Geometry.prototype.toGeoJSON.call(this, options);
        geoJSON.type = WKX.Types.geoJSON.LineString;
        geoJSON.coordinates = [];

        for (let i = 0; i < this.points.length; i++) {
            if (this.hasZ) {
                geoJSON.coordinates.push([this.points[i].x, this.points[i].y, this.points[i].z]);
            } else {
                geoJSON.coordinates.push([this.points[i].x, this.points[i].y]);
            }
        }

        return geoJSON;
    }
}
