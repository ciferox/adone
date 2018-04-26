const {
    util: {
        terraformer: {
            WKX
        }
    },
    is
} = adone;

export default class Point extends WKX.Geometry {
    constructor(x, y, z, m, srid) {
        super();
        this.x = x;
        this.y = y;
        this.z = z;
        this.m = m;
        this.srid = srid;

        this.hasZ = !is.undefined(this.z);
        this.hasM = !is.undefined(this.m);
    }

    static Z(x, y, z, srid) {
        const point = new Point(x, y, z, srid);
        point.hasZ = true;
        return point;
    }

    static M(x, y, m, srid) {
        const point = new Point(x, y, undefined, m, srid);
        point.hasM = true;
        return point;
    }

    static ZM(x, y, z, m, srid) {
        const point = new Point(x, y, z, m, srid);
        point.hasZ = true;
        point.hasM = true;
        return point;
    }

    static _parseWkt(value, options) {
        const point = new Point();
        point.srid = options.srid;
        point.hasZ = options.hasZ;
        point.hasM = options.hasM;

        if (value.isMatch(["EMPTY"])) {
            return point;
        }

        value.expectGroupStart();

        const coordinate = value.matchCoordinate(options);

        point.x = coordinate.x;
        point.y = coordinate.y;
        point.z = coordinate.z;
        point.m = coordinate.m;

        value.expectGroupEnd();

        return point;
    }

    static _parseWkb(value, options) {
        const point = Point._readWkbPoint(value, options);
        point.srid = options.srid;
        return point;
    }

    static _readWkbPoint(value, options) {
        return new Point(value.readDouble(), value.readDouble(),
            options.hasZ ? value.readDouble() : undefined,
            options.hasM ? value.readDouble() : undefined);
    }

    static _parseTwkb(value, options) {
        const point = new Point();
        point.hasZ = options.hasZ;
        point.hasM = options.hasM;

        if (options.isEmpty) {
            return point;
        }

        point.x = WKX.ZigZag.decode(value.readVarInt()) / options.precisionFactor;
        point.y = WKX.ZigZag.decode(value.readVarInt()) / options.precisionFactor;
        point.z = options.hasZ ? WKX.ZigZag.decode(value.readVarInt()) / options.zPrecisionFactor : undefined;
        point.m = options.hasM ? WKX.ZigZag.decode(value.readVarInt()) / options.mPrecisionFactor : undefined;

        return point;
    }

    static _readTwkbPoint(value, options, previousPoint) {
        previousPoint.x += WKX.ZigZag.decode(value.readVarInt()) / options.precisionFactor;
        previousPoint.y += WKX.ZigZag.decode(value.readVarInt()) / options.precisionFactor;

        if (options.hasZ) {
            previousPoint.z += WKX.ZigZag.decode(value.readVarInt()) / options.zPrecisionFactor;
        }
        if (options.hasM) {
            previousPoint.m += WKX.ZigZag.decode(value.readVarInt()) / options.mPrecisionFactor;
        }

        return new Point(previousPoint.x, previousPoint.y, previousPoint.z, previousPoint.m);
    }

    static _parseGeoJSON(value) {
        return Point._readGeoJSONPoint(value.coordinates);
    }

    static _readGeoJSONPoint(coordinates) {
        if (coordinates.length === 0) {
            return new Point();
        }

        if (coordinates.length > 2) {
            return new Point(coordinates[0], coordinates[1], coordinates[2]);
        }

        return new Point(coordinates[0], coordinates[1]);
    }

    toWkt() {
        if (is.undefined(this.x) && is.undefined(this.y) &&
            is.undefined(this.z) && is.undefined(this.m)) {
            return this._getWktType(WKX.Types.wkt.Point, true);
        }

        return `${this._getWktType(WKX.Types.wkt.Point, false)}(${this._getWktCoordinate(this)})`;
    }

    toWkb(parentOptions) {
        const wkb = new WKX.BinaryWriter(this._getWkbSize());

        wkb.writeInt8(1);
        this._writeWkbType(wkb, WKX.Types.wkb.Point, parentOptions);

        if (is.undefined(this.x) && is.undefined(this.y)) {
            wkb.writeDoubleLE(NaN);
            wkb.writeDoubleLE(NaN);

            if (this.hasZ) {
                wkb.writeDoubleLE(NaN);
            }
            if (this.hasM) {
                wkb.writeDoubleLE(NaN);
            }
        } else {
            this._writeWkbPoint(wkb);
        }

        return wkb.buffer;
    }

    _writeWkbPoint(wkb) {
        wkb.writeDoubleLE(this.x);
        wkb.writeDoubleLE(this.y);

        if (this.hasZ) {
            wkb.writeDoubleLE(this.z);
        }
        if (this.hasM) {
            wkb.writeDoubleLE(this.m);
        }
    }

    toTwkb() {
        const twkb = new WKX.BinaryWriter(0, true);

        const precision = WKX.Geometry.getTwkbPrecision(5, 0, 0);
        const isEmpty = is.undefined(this.x) && is.undefined(this.y);

        this._writeTwkbHeader(twkb, WKX.Types.wkb.Point, precision, isEmpty);

        if (!isEmpty) {
            this._writeTwkbPoint(twkb, precision, new Point(0, 0, 0, 0));
        }

        return twkb.buffer;
    }

    _writeTwkbPoint(twkb, precision, previousPoint) {
        const x = this.x * precision.xyFactor;
        const y = this.y * precision.xyFactor;
        const z = this.z * precision.zFactor;
        const m = this.m * precision.mFactor;

        twkb.writeVarInt(WKX.ZigZag.encode(x - previousPoint.x));
        twkb.writeVarInt(WKX.ZigZag.encode(y - previousPoint.y));
        if (this.hasZ) {
            twkb.writeVarInt(WKX.ZigZag.encode(z - previousPoint.z));
        }
        if (this.hasM) {
            twkb.writeVarInt(WKX.ZigZag.encode(m - previousPoint.m));
        }

        previousPoint.x = x;
        previousPoint.y = y;
        previousPoint.z = z;
        previousPoint.m = m;
    }

    _getWkbSize() {
        let size = 1 + 4 + 8 + 8;

        if (this.hasZ) {
            size += 8;
        }
        if (this.hasM) {
            size += 8;
        }

        return size;
    }

    toGeoJSON(options) {
        const geoJSON = WKX.Geometry.prototype.toGeoJSON.call(this, options);
        geoJSON.type = WKX.Types.geoJSON.Point;

        if (is.undefined(this.x) && is.undefined(this.y)) {
            geoJSON.coordinates = [];
        } else if (!is.undefined(this.z)) {
            geoJSON.coordinates = [this.x, this.y, this.z];
        } else {
            geoJSON.coordinates = [this.x, this.y];
        }

        return geoJSON;
    }
}
