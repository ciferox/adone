module.exports = MultiPoint;

const util = require("util");

const Types = require("./types");
const Geometry = require("./geometry");
const Point = require("./point");
const BinaryWriter = require("./binary_writer");

function MultiPoint(points) {
    Geometry.call(this);

    this.points = points || [];

    if (this.points.length > 0) {
        this.hasZ = this.points[0].hasZ;
        this.hasM = this.points[0].hasM;
    }
}

util.inherits(MultiPoint, Geometry);

MultiPoint.Z = function (points) {
    const multiPoint = new MultiPoint(points);
    multiPoint.hasZ = true;
    return multiPoint;
};

MultiPoint.M = function (points) {
    const multiPoint = new MultiPoint(points);
    multiPoint.hasM = true;
    return multiPoint;
};

MultiPoint.ZM = function (points) {
    const multiPoint = new MultiPoint(points);
    multiPoint.hasZ = true;
    multiPoint.hasM = true;
    return multiPoint;
};

MultiPoint._parseWkt = function (value, options) {
    const multiPoint = new MultiPoint();
    multiPoint.srid = options.srid;
    multiPoint.hasZ = options.hasZ;
    multiPoint.hasM = options.hasM;

    if (value.isMatch(["EMPTY"])) {
        return multiPoint;
    }

    value.expectGroupStart();
    multiPoint.points.push.apply(multiPoint.points, value.matchCoordinates(options));
    value.expectGroupEnd();

    return multiPoint;
};

MultiPoint._parseWkb = function (value, options) {
    const multiPoint = new MultiPoint();
    multiPoint.srid = options.srid;
    multiPoint.hasZ = options.hasZ;
    multiPoint.hasM = options.hasM;

    const pointCount = value.readUInt32();

    for (let i = 0; i < pointCount; i++) {
        multiPoint.points.push(Geometry.parse(value, options));
    }

    return multiPoint;
};

MultiPoint._parseTwkb = function (value, options) {
    const multiPoint = new MultiPoint();
    multiPoint.hasZ = options.hasZ;
    multiPoint.hasM = options.hasM;

    if (options.isEmpty) {
        return multiPoint;
    }

    const previousPoint = new Point(0, 0, options.hasZ ? 0 : undefined, options.hasM ? 0 : undefined);
    const pointCount = value.readVarInt();

    for (let i = 0; i < pointCount; i++) {
        multiPoint.points.push(Point._readTwkbPoint(value, options, previousPoint));
    }

    return multiPoint;
};

MultiPoint._parseGeoJSON = function (value) {
    const multiPoint = new MultiPoint();

    if (value.coordinates.length > 0) {
        multiPoint.hasZ = value.coordinates[0].length > 2;
    }

    for (let i = 0; i < value.coordinates.length; i++) {
        multiPoint.points.push(Point._parseGeoJSON({ coordinates: value.coordinates[i] }));
    }

    return multiPoint;
};

MultiPoint.prototype.toWkt = function () {
    if (this.points.length === 0) {
        return this._getWktType(Types.wkt.MultiPoint, true);
    }

    let wkt = `${this._getWktType(Types.wkt.MultiPoint, false)}(`;

    for (let i = 0; i < this.points.length; i++) {
        wkt += `${this._getWktCoordinate(this.points[i])},`;
    }

    wkt = wkt.slice(0, -1);
    wkt += ")";

    return wkt;
};

MultiPoint.prototype.toWkb = function () {
    const wkb = new BinaryWriter(this._getWkbSize());

    wkb.writeInt8(1);

    this._writeWkbType(wkb, Types.wkb.MultiPoint);
    wkb.writeUInt32LE(this.points.length);

    for (let i = 0; i < this.points.length; i++) {
        wkb.writeBuffer(this.points[i].toWkb({ srid: this.srid }));
    }

    return wkb.buffer;
};

MultiPoint.prototype.toTwkb = function () {
    const twkb = new BinaryWriter(0, true);

    const precision = Geometry.getTwkbPrecision(5, 0, 0);
    const isEmpty = this.points.length === 0;

    this._writeTwkbHeader(twkb, Types.wkb.MultiPoint, precision, isEmpty);

    if (this.points.length > 0) {
        twkb.writeVarInt(this.points.length);

        const previousPoint = new Point(0, 0, 0, 0);
        for (let i = 0; i < this.points.length; i++) {
            this.points[i]._writeTwkbPoint(twkb, precision, previousPoint);
        }
    }

    return twkb.buffer;
};

MultiPoint.prototype._getWkbSize = function () {
    let coordinateSize = 16;

    if (this.hasZ) {
        coordinateSize += 8;
    }
    if (this.hasM) {
        coordinateSize += 8;
    }

    coordinateSize += 5;

    return 1 + 4 + 4 + (this.points.length * coordinateSize);
};

MultiPoint.prototype.toGeoJSON = function (options) {
    const geoJSON = Geometry.prototype.toGeoJSON.call(this, options);
    geoJSON.type = Types.geoJSON.MultiPoint;
    geoJSON.coordinates = [];

    for (let i = 0; i < this.points.length; i++) {
        geoJSON.coordinates.push(this.points[i].toGeoJSON().coordinates);
    }

    return geoJSON;
};
