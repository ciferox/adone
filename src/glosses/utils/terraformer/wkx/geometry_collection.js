const {
    util: {
        terraformer: {
            WKX
        }
    }
} = adone;

export default class GeometryCollection extends WKX.Geometry {
    constructor(geometries) {
        super();
        this.geometries = geometries || [];

        if (this.geometries.length > 0) {
            this.hasZ = this.geometries[0].hasZ;
            this.hasM = this.geometries[0].hasM;
        }
    }

    static Z(geometries) {
        const geometryCollection = new GeometryCollection(geometries);
        geometryCollection.hasZ = true;
        return geometryCollection;
    }

    static M(geometries) {
        const geometryCollection = new GeometryCollection(geometries);
        geometryCollection.hasM = true;
        return geometryCollection;
    }

    static ZM(geometries) {
        const geometryCollection = new GeometryCollection(geometries);
        geometryCollection.hasZ = true;
        geometryCollection.hasM = true;
        return geometryCollection;
    }

    static _parseWkt(value, options) {
        const geometryCollection = new GeometryCollection();
        geometryCollection.srid = options.srid;
        geometryCollection.hasZ = options.hasZ;
        geometryCollection.hasM = options.hasM;

        if (value.isMatch(["EMPTY"])) {
            return geometryCollection;
        }

        value.expectGroupStart();

        do {
            geometryCollection.geometries.push(WKX.Geometry.parse(value));
        } while (value.isMatch([","]));

        value.expectGroupEnd();

        return geometryCollection;
    }

    static _parseWkb(value, options) {
        const geometryCollection = new GeometryCollection();
        geometryCollection.srid = options.srid;
        geometryCollection.hasZ = options.hasZ;
        geometryCollection.hasM = options.hasM;

        const geometryCount = value.readUInt32();

        for (let i = 0; i < geometryCount; i++) {
            geometryCollection.geometries.push(WKX.Geometry.parse(value, options));
        }

        return geometryCollection;
    }

    static _parseTwkb(value, options) {
        const geometryCollection = new GeometryCollection();
        geometryCollection.hasZ = options.hasZ;
        geometryCollection.hasM = options.hasM;

        if (options.isEmpty) {
            return geometryCollection;
        }

        const geometryCount = value.readVarInt();

        for (let i = 0; i < geometryCount; i++) {
            geometryCollection.geometries.push(WKX.Geometry.parseTwkb(value));
        }

        return geometryCollection;
    }

    static _parseGeoJSON(value) {
        const geometryCollection = new GeometryCollection();

        for (let i = 0; i < value.geometries.length; i++) {
            geometryCollection.geometries.push(WKX.Geometry.parseGeoJSON(value.geometries[i]));
        }

        if (geometryCollection.geometries.length > 0) {
            geometryCollection.hasZ = geometryCollection.geometries[0].hasZ;
        }

        return geometryCollection;
    }

    toWkt() {
        if (this.geometries.length === 0) {
            return this._getWktType(WKX.Types.wkt.GeometryCollection, true);
        }

        let wkt = `${this._getWktType(WKX.Types.wkt.GeometryCollection, false)}(`;

        for (let i = 0; i < this.geometries.length; i++) {
            wkt += `${this.geometries[i].toWkt()},`;
        }

        wkt = wkt.slice(0, -1);
        wkt += ")";

        return wkt;
    }

    toWkb() {
        const wkb = new WKX.BinaryWriter(this._getWkbSize());

        wkb.writeInt8(1);

        this._writeWkbType(wkb, WKX.Types.wkb.GeometryCollection);
        wkb.writeUInt32LE(this.geometries.length);

        for (let i = 0; i < this.geometries.length; i++) {
            wkb.writeBuffer(this.geometries[i].toWkb({ srid: this.srid }));
        }

        return wkb.buffer;
    }

    toTwkb() {
        const twkb = new WKX.BinaryWriter(0, true);

        const precision = WKX.Geometry.getTwkbPrecision(5, 0, 0);
        const isEmpty = this.geometries.length === 0;

        this._writeTwkbHeader(twkb, WKX.Types.wkb.GeometryCollection, precision, isEmpty);

        if (this.geometries.length > 0) {
            twkb.writeVarInt(this.geometries.length);

            for (let i = 0; i < this.geometries.length; i++) {
                twkb.writeBuffer(this.geometries[i].toTwkb());
            }
        }

        return twkb.buffer;
    }

    _getWkbSize() {
        let size = 1 + 4 + 4;

        for (let i = 0; i < this.geometries.length; i++) {
            size += this.geometries[i]._getWkbSize();
        }

        return size;
    }

    toGeoJSON(options) {
        const geoJSON = WKX.Geometry.prototype.toGeoJSON.call(this, options);
        geoJSON.type = WKX.Types.geoJSON.GeometryCollection;
        geoJSON.geometries = [];

        for (let i = 0; i < this.geometries.length; i++) {
            geoJSON.geometries.push(this.geometries[i].toGeoJSON());
        }

        return geoJSON;
    }
}
