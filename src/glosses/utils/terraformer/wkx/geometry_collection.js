module.exports = GeometryCollection;
const util = require("util");

const Types = require("./types");
const Geometry = require("./geometry");
const BinaryWriter = require("./binary_writer");

function GeometryCollection(geometries) {
    Geometry.call(this);

    this.geometries = geometries || [];

    if (this.geometries.length > 0) {
        this.hasZ = this.geometries[0].hasZ;
        this.hasM = this.geometries[0].hasM;
    }
}

util.inherits(GeometryCollection, Geometry);

GeometryCollection.Z = function (geometries) {
    const geometryCollection = new GeometryCollection(geometries);
    geometryCollection.hasZ = true;
    return geometryCollection;
};

GeometryCollection.M = function (geometries) {
    const geometryCollection = new GeometryCollection(geometries);
    geometryCollection.hasM = true;
    return geometryCollection;
};

GeometryCollection.ZM = function (geometries) {
    const geometryCollection = new GeometryCollection(geometries);
    geometryCollection.hasZ = true;
    geometryCollection.hasM = true;
    return geometryCollection;
};

GeometryCollection._parseWkt = function (value, options) {
    const geometryCollection = new GeometryCollection();
    geometryCollection.srid = options.srid;
    geometryCollection.hasZ = options.hasZ;
    geometryCollection.hasM = options.hasM;

    if (value.isMatch(["EMPTY"])) {
        return geometryCollection;
    }

    value.expectGroupStart();

    do {
        geometryCollection.geometries.push(Geometry.parse(value));
    } while (value.isMatch([","]));

    value.expectGroupEnd();

    return geometryCollection;
};

GeometryCollection._parseWkb = function (value, options) {
    const geometryCollection = new GeometryCollection();
    geometryCollection.srid = options.srid;
    geometryCollection.hasZ = options.hasZ;
    geometryCollection.hasM = options.hasM;

    const geometryCount = value.readUInt32();

    for (let i = 0; i < geometryCount; i++) {
        geometryCollection.geometries.push(Geometry.parse(value, options));
    }

    return geometryCollection;
};

GeometryCollection._parseTwkb = function (value, options) {
    const geometryCollection = new GeometryCollection();
    geometryCollection.hasZ = options.hasZ;
    geometryCollection.hasM = options.hasM;

    if (options.isEmpty) {
        return geometryCollection;
    }

    const geometryCount = value.readVarInt();

    for (let i = 0; i < geometryCount; i++) {
        geometryCollection.geometries.push(Geometry.parseTwkb(value));
    }

    return geometryCollection;
};

GeometryCollection._parseGeoJSON = function (value) {
    const geometryCollection = new GeometryCollection();

    for (let i = 0; i < value.geometries.length; i++) {
        geometryCollection.geometries.push(Geometry.parseGeoJSON(value.geometries[i]));
    }

    if (geometryCollection.geometries.length > 0) {
        geometryCollection.hasZ = geometryCollection.geometries[0].hasZ;
    }

    return geometryCollection;
};

GeometryCollection.prototype.toWkt = function () {
    if (this.geometries.length === 0) {
        return this._getWktType(Types.wkt.GeometryCollection, true);
    }

    let wkt = `${this._getWktType(Types.wkt.GeometryCollection, false)}(`;

    for (let i = 0; i < this.geometries.length; i++) {
        wkt += `${this.geometries[i].toWkt()},`;
    }

    wkt = wkt.slice(0, -1);
    wkt += ")";

    return wkt;
};

GeometryCollection.prototype.toWkb = function () {
    const wkb = new BinaryWriter(this._getWkbSize());

    wkb.writeInt8(1);

    this._writeWkbType(wkb, Types.wkb.GeometryCollection);
    wkb.writeUInt32LE(this.geometries.length);

    for (let i = 0; i < this.geometries.length; i++) {
        wkb.writeBuffer(this.geometries[i].toWkb({ srid: this.srid }));
    }

    return wkb.buffer;
};

GeometryCollection.prototype.toTwkb = function () {
    const twkb = new BinaryWriter(0, true);

    const precision = Geometry.getTwkbPrecision(5, 0, 0);
    const isEmpty = this.geometries.length === 0;

    this._writeTwkbHeader(twkb, Types.wkb.GeometryCollection, precision, isEmpty);

    if (this.geometries.length > 0) {
        twkb.writeVarInt(this.geometries.length);

        for (let i = 0; i < this.geometries.length; i++) {
            twkb.writeBuffer(this.geometries[i].toTwkb());
        }
    }

    return twkb.buffer;
};

GeometryCollection.prototype._getWkbSize = function () {
    let size = 1 + 4 + 4;

    for (let i = 0; i < this.geometries.length; i++) {
        size += this.geometries[i]._getWkbSize();
    }

    return size;
};

GeometryCollection.prototype.toGeoJSON = function (options) {
    const geoJSON = Geometry.prototype.toGeoJSON.call(this, options);
    geoJSON.type = Types.geoJSON.GeometryCollection;
    geoJSON.geometries = [];

    for (let i = 0; i < this.geometries.length; i++) {
        geoJSON.geometries.push(this.geometries[i].toGeoJSON());
    }

    return geoJSON;
};
