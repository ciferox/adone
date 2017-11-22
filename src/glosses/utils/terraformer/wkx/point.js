module.exports = Point;
const { is } = adone;
const util = require("util");

const Geometry = require("./geometry");
const Types = require("./types");
const BinaryWriter = require("./binary_writer");
const ZigZag = require("./zig_zag");

function Point(x, y, z, m) {
    Geometry.call(this);

    this.x = x;
    this.y = y;
    this.z = z;
    this.m = m;

    this.hasZ = !is.undefined(this.z);
    this.hasM = !is.undefined(this.m);
}

util.inherits(Point, Geometry);

Point.Z = function (x, y, z) {
    const point = new Point(x, y, z);
    point.hasZ = true;
    return point;
};

Point.M = function (x, y, m) {
    const point = new Point(x, y, undefined, m);
    point.hasM = true;
    return point;
};

Point.ZM = function (x, y, z, m) {
    const point = new Point(x, y, z, m);
    point.hasZ = true;
    point.hasM = true;
    return point;
};

Point._parseWkt = function (value, options) {
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
};

Point._parseWkb = function (value, options) {
    const point = Point._readWkbPoint(value, options);
    point.srid = options.srid;
    return point;
};

Point._readWkbPoint = function (value, options) {
    return new Point(value.readDouble(), value.readDouble(),
        options.hasZ ? value.readDouble() : undefined,
        options.hasM ? value.readDouble() : undefined);
};

Point._parseTwkb = function (value, options) {
    const point = new Point();
    point.hasZ = options.hasZ;
    point.hasM = options.hasM;

    if (options.isEmpty) {
        return point;
    }

    point.x = ZigZag.decode(value.readVarInt()) / options.precisionFactor;
    point.y = ZigZag.decode(value.readVarInt()) / options.precisionFactor;
    point.z = options.hasZ ? ZigZag.decode(value.readVarInt()) / options.zPrecisionFactor : undefined;
    point.m = options.hasM ? ZigZag.decode(value.readVarInt()) / options.mPrecisionFactor : undefined;

    return point;
};

Point._readTwkbPoint = function (value, options, previousPoint) {
    previousPoint.x += ZigZag.decode(value.readVarInt()) / options.precisionFactor;
    previousPoint.y += ZigZag.decode(value.readVarInt()) / options.precisionFactor;

    if (options.hasZ) {
        previousPoint.z += ZigZag.decode(value.readVarInt()) / options.zPrecisionFactor;
    }
    if (options.hasM) {
        previousPoint.m += ZigZag.decode(value.readVarInt()) / options.mPrecisionFactor;
    }

    return new Point(previousPoint.x, previousPoint.y, previousPoint.z, previousPoint.m);
};

Point._parseGeoJSON = function (value) {
    return Point._readGeoJSONPoint(value.coordinates);
};

Point._readGeoJSONPoint = function (coordinates) {
    if (coordinates.length === 0) {
        return new Point();
    }

    if (coordinates.length > 2) {
        return new Point(coordinates[0], coordinates[1], coordinates[2]);
    }

    return new Point(coordinates[0], coordinates[1]);
};

Point.prototype.toWkt = function () {
    if (is.undefined(this.x) && is.undefined(this.y) &&
        is.undefined(this.z) && is.undefined(this.m)) {
        return this._getWktType(Types.wkt.Point, true);
    }

    return `${this._getWktType(Types.wkt.Point, false)}(${this._getWktCoordinate(this)})`;
};

Point.prototype.toWkb = function (parentOptions) {
    const wkb = new BinaryWriter(this._getWkbSize());

    wkb.writeInt8(1);
    this._writeWkbType(wkb, Types.wkb.Point, parentOptions);

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
};

Point.prototype._writeWkbPoint = function (wkb) {
    wkb.writeDoubleLE(this.x);
    wkb.writeDoubleLE(this.y);

    if (this.hasZ) {
        wkb.writeDoubleLE(this.z);
    }
    if (this.hasM) {
        wkb.writeDoubleLE(this.m);
    }
};

Point.prototype.toTwkb = function () {
    const twkb = new BinaryWriter(0, true);

    const precision = Geometry.getTwkbPrecision(5, 0, 0);
    const isEmpty = is.undefined(this.x) && is.undefined(this.y);

    this._writeTwkbHeader(twkb, Types.wkb.Point, precision, isEmpty);

    if (!isEmpty) {
        this._writeTwkbPoint(twkb, precision, new Point(0, 0, 0, 0));
    }

    return twkb.buffer;
};

Point.prototype._writeTwkbPoint = function (twkb, precision, previousPoint) {
    const x = this.x * precision.xyFactor;
    const y = this.y * precision.xyFactor;
    const z = this.z * precision.zFactor;
    const m = this.m * precision.mFactor;

    twkb.writeVarInt(ZigZag.encode(x - previousPoint.x));
    twkb.writeVarInt(ZigZag.encode(y - previousPoint.y));
    if (this.hasZ) {
        twkb.writeVarInt(ZigZag.encode(z - previousPoint.z));
    }
    if (this.hasM) {
        twkb.writeVarInt(ZigZag.encode(m - previousPoint.m));
    }

    previousPoint.x = x;
    previousPoint.y = y;
    previousPoint.z = z;
    previousPoint.m = m;
};

Point.prototype._getWkbSize = function () {
    let size = 1 + 4 + 8 + 8;

    if (this.hasZ) {
        size += 8;
    }
    if (this.hasM) {
        size += 8;
    }

    return size;
};

Point.prototype.toGeoJSON = function (options) {
    const geoJSON = Geometry.prototype.toGeoJSON.call(this, options);
    geoJSON.type = Types.geoJSON.Point;

    if (is.undefined(this.x) && is.undefined(this.y)) {
        geoJSON.coordinates = [];
    } else if (!is.undefined(this.z)) {
        geoJSON.coordinates = [this.x, this.y, this.z];
    } else {
        geoJSON.coordinates = [this.x, this.y];
    }

    return geoJSON;
};
