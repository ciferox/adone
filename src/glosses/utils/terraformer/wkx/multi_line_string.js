module.exports = MultiLineString;

const util = require("util");

const Types = require("./types");
const Geometry = require("./geometry");
const Point = require("./point");
const LineString = require("./line_string");
const BinaryWriter = require("./binary_writer");

function MultiLineString(lineStrings) {
    Geometry.call(this);

    this.lineStrings = lineStrings || [];

    if (this.lineStrings.length > 0) {
        this.hasZ = this.lineStrings[0].hasZ;
        this.hasM = this.lineStrings[0].hasM;
    }
}

util.inherits(MultiLineString, Geometry);

MultiLineString.Z = function (lineStrings) {
    const multiLineString = new MultiLineString(lineStrings);
    multiLineString.hasZ = true;
    return multiLineString;
};

MultiLineString.M = function (lineStrings) {
    const multiLineString = new MultiLineString(lineStrings);
    multiLineString.hasM = true;
    return multiLineString;
};

MultiLineString.ZM = function (lineStrings) {
    const multiLineString = new MultiLineString(lineStrings);
    multiLineString.hasZ = true;
    multiLineString.hasM = true;
    return multiLineString;
};

MultiLineString._parseWkt = function (value, options) {
    const multiLineString = new MultiLineString();
    multiLineString.srid = options.srid;
    multiLineString.hasZ = options.hasZ;
    multiLineString.hasM = options.hasM;

    if (value.isMatch(["EMPTY"])) {
        return multiLineString;
    }

    value.expectGroupStart();

    do {
        value.expectGroupStart();
        multiLineString.lineStrings.push(new LineString(value.matchCoordinates(options)));
        value.expectGroupEnd();
    } while (value.isMatch([","]));

    value.expectGroupEnd();

    return multiLineString;
};

MultiLineString._parseWkb = function (value, options) {
    const multiLineString = new MultiLineString();
    multiLineString.srid = options.srid;
    multiLineString.hasZ = options.hasZ;
    multiLineString.hasM = options.hasM;

    const lineStringCount = value.readUInt32();

    for (let i = 0; i < lineStringCount; i++) {
        multiLineString.lineStrings.push(Geometry.parse(value, options));
    }

    return multiLineString;
};

MultiLineString._parseTwkb = function (value, options) {
    const multiLineString = new MultiLineString();
    multiLineString.hasZ = options.hasZ;
    multiLineString.hasM = options.hasM;

    if (options.isEmpty) {
        return multiLineString;
    }

    const previousPoint = new Point(0, 0, options.hasZ ? 0 : undefined, options.hasM ? 0 : undefined);
    const lineStringCount = value.readVarInt();

    for (let i = 0; i < lineStringCount; i++) {
        const lineString = new LineString();
        lineString.hasZ = options.hasZ;
        lineString.hasM = options.hasM;

        const pointCount = value.readVarInt();

        for (let j = 0; j < pointCount; j++) {
            lineString.points.push(Point._readTwkbPoint(value, options, previousPoint));
        }

        multiLineString.lineStrings.push(lineString);
    }

    return multiLineString;
};

MultiLineString._parseGeoJSON = function (value) {
    const multiLineString = new MultiLineString();

    if (value.coordinates.length > 0 && value.coordinates[0].length > 0) {
        multiLineString.hasZ = value.coordinates[0][0].length > 2;
    }

    for (let i = 0; i < value.coordinates.length; i++) {
        multiLineString.lineStrings.push(LineString._parseGeoJSON({ coordinates: value.coordinates[i] }));
    }

    return multiLineString;
};

MultiLineString.prototype.toWkt = function () {
    if (this.lineStrings.length === 0) {
        return this._getWktType(Types.wkt.MultiLineString, true);
    }

    let wkt = `${this._getWktType(Types.wkt.MultiLineString, false)}(`;

    for (let i = 0; i < this.lineStrings.length; i++) {
        wkt += `${this.lineStrings[i]._toInnerWkt()},`;
    }

    wkt = wkt.slice(0, -1);
    wkt += ")";

    return wkt;
};

MultiLineString.prototype.toWkb = function () {
    const wkb = new BinaryWriter(this._getWkbSize());

    wkb.writeInt8(1);

    this._writeWkbType(wkb, Types.wkb.MultiLineString);
    wkb.writeUInt32LE(this.lineStrings.length);

    for (let i = 0; i < this.lineStrings.length; i++) {
        wkb.writeBuffer(this.lineStrings[i].toWkb({ srid: this.srid }));
    }

    return wkb.buffer;
};

MultiLineString.prototype.toTwkb = function () {
    const twkb = new BinaryWriter(0, true);

    const precision = Geometry.getTwkbPrecision(5, 0, 0);
    const isEmpty = this.lineStrings.length === 0;

    this._writeTwkbHeader(twkb, Types.wkb.MultiLineString, precision, isEmpty);

    if (this.lineStrings.length > 0) {
        twkb.writeVarInt(this.lineStrings.length);

        const previousPoint = new Point(0, 0, 0, 0);
        for (let i = 0; i < this.lineStrings.length; i++) {
            twkb.writeVarInt(this.lineStrings[i].points.length);

            for (let j = 0; j < this.lineStrings[i].points.length; j++) {
                this.lineStrings[i].points[j]._writeTwkbPoint(twkb, precision, previousPoint);
            }
        }
    }

    return twkb.buffer;
};

MultiLineString.prototype._getWkbSize = function () {
    let size = 1 + 4 + 4;

    for (let i = 0; i < this.lineStrings.length; i++) {
        size += this.lineStrings[i]._getWkbSize();
    }

    return size;
};

MultiLineString.prototype.toGeoJSON = function (options) {
    const geoJSON = Geometry.prototype.toGeoJSON.call(this, options);
    geoJSON.type = Types.geoJSON.MultiLineString;
    geoJSON.coordinates = [];

    for (let i = 0; i < this.lineStrings.length; i++) {
        geoJSON.coordinates.push(this.lineStrings[i].toGeoJSON().coordinates);
    }

    return geoJSON;
};
