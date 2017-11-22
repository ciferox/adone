module.exports = LineString;

const util = require("util");

const Geometry = require("./geometry");
const Types = require("./types");
const Point = require("./point");
const BinaryWriter = require("./binary_writer");

function LineString(points) {
    Geometry.call(this);

    this.points = points || [];

    if (this.points.length > 0) {
        this.hasZ = this.points[0].hasZ;
        this.hasM = this.points[0].hasM;
    }
}

util.inherits(LineString, Geometry);

LineString.Z = function (points) {
    const lineString = new LineString(points);
    lineString.hasZ = true;
    return lineString;
};

LineString.M = function (points) {
    const lineString = new LineString(points);
    lineString.hasM = true;
    return lineString;
};

LineString.ZM = function (points) {
    const lineString = new LineString(points);
    lineString.hasZ = true;
    lineString.hasM = true;
    return lineString;
};

LineString._parseWkt = function (value, options) {
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
};

LineString._parseWkb = function (value, options) {
    const lineString = new LineString();
    lineString.srid = options.srid;
    lineString.hasZ = options.hasZ;
    lineString.hasM = options.hasM;

    const pointCount = value.readUInt32();

    for (let i = 0; i < pointCount; i++) {
        lineString.points.push(Point._readWkbPoint(value, options));
    }

    return lineString;
};

LineString._parseTwkb = function (value, options) {
    const lineString = new LineString();
    lineString.hasZ = options.hasZ;
    lineString.hasM = options.hasM;

    if (options.isEmpty) {
        return lineString;
    }

    const previousPoint = new Point(0, 0, options.hasZ ? 0 : undefined, options.hasM ? 0 : undefined);
    const pointCount = value.readVarInt();

    for (let i = 0; i < pointCount; i++) {
        lineString.points.push(Point._readTwkbPoint(value, options, previousPoint));
    }

    return lineString;
};

LineString._parseGeoJSON = function (value) {
    const lineString = new LineString();

    if (value.coordinates.length > 0) {
        lineString.hasZ = value.coordinates[0].length > 2;
    }

    for (let i = 0; i < value.coordinates.length; i++) {
        lineString.points.push(Point._readGeoJSONPoint(value.coordinates[i]));
    }

    return lineString;
};

LineString.prototype.toWkt = function () {
    if (this.points.length === 0) {
        return this._getWktType(Types.wkt.LineString, true);
    }

    return this._getWktType(Types.wkt.LineString, false) + this._toInnerWkt();
};

LineString.prototype._toInnerWkt = function () {
    let innerWkt = "(";

    for (let i = 0; i < this.points.length; i++) {
        innerWkt += `${this._getWktCoordinate(this.points[i])},`;
    }

    innerWkt = innerWkt.slice(0, -1);
    innerWkt += ")";

    return innerWkt;
};

LineString.prototype.toWkb = function (parentOptions) {
    const wkb = new BinaryWriter(this._getWkbSize());

    wkb.writeInt8(1);

    this._writeWkbType(wkb, Types.wkb.LineString, parentOptions);
    wkb.writeUInt32LE(this.points.length);

    for (let i = 0; i < this.points.length; i++) {
        this.points[i]._writeWkbPoint(wkb);
    }

    return wkb.buffer;
};

LineString.prototype.toTwkb = function () {
    const twkb = new BinaryWriter(0, true);

    const precision = Geometry.getTwkbPrecision(5, 0, 0);
    const isEmpty = this.points.length === 0;

    this._writeTwkbHeader(twkb, Types.wkb.LineString, precision, isEmpty);

    if (this.points.length > 0) {
        twkb.writeVarInt(this.points.length);

        const previousPoint = new Point(0, 0, 0, 0);
        for (let i = 0; i < this.points.length; i++) {
            this.points[i]._writeTwkbPoint(twkb, precision, previousPoint);
        }
    }

    return twkb.buffer;
};

LineString.prototype._getWkbSize = function () {
    let coordinateSize = 16;

    if (this.hasZ) {
        coordinateSize += 8;
    }
    if (this.hasM) {
        coordinateSize += 8;
    }

    return 1 + 4 + 4 + (this.points.length * coordinateSize);
};

LineString.prototype.toGeoJSON = function (options) {
    const geoJSON = Geometry.prototype.toGeoJSON.call(this, options);
    geoJSON.type = Types.geoJSON.LineString;
    geoJSON.coordinates = [];

    for (let i = 0; i < this.points.length; i++) {
        if (this.hasZ) {
            geoJSON.coordinates.push([this.points[i].x, this.points[i].y, this.points[i].z]);
        } else {
            geoJSON.coordinates.push([this.points[i].x, this.points[i].y]);
        }
    }

    return geoJSON;
};
