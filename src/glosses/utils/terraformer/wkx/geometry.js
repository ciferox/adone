const {
    util: {
        terraformer: {
            WKX
        }
    },
    is
} = adone;

export default class Geometry {
    constructor() {
        this.srid = undefined;
        this.hasZ = false;
        this.hasM = false;
    }

    static parse(value, options) {
        const valueType = typeof value;

        if (valueType === "string" || value instanceof WKX.WktParser) {
            return Geometry._parseWkt(value);
        } else if (is.buffer(value) || value instanceof WKX.BinaryReader) {
            return Geometry._parseWkb(value, options);
        }
        throw new Error("first argument must be a string or Buffer");
    }

    static _parseWkt(value) {
        let wktParser;
        let srid;

        if (value instanceof WKX.WktParser) {
            wktParser = value;
        } else {
            wktParser = new WKX.WktParser(value);
        }

        const match = wktParser.matchRegex([/^SRID=(\d+);/]);
        if (match) {
            srid = parseInt(match[1], 10);
        }

        const geometryType = wktParser.matchType();
        const dimension = wktParser.matchDimension();

        const options = {
            srid,
            hasZ: dimension.hasZ,
            hasM: dimension.hasM
        };

        switch (geometryType) {
            case WKX.Types.wkt.Point:
                return WKX.Point._parseWkt(wktParser, options);
            case WKX.Types.wkt.LineString:
                return WKX.LineString._parseWkt(wktParser, options);
            case WKX.Types.wkt.Polygon:
                return WKX.Polygon._parseWkt(wktParser, options);
            case WKX.Types.wkt.MultiPoint:
                return WKX.MultiPoint._parseWkt(wktParser, options);
            case WKX.Types.wkt.MultiLineString:
                return WKX.MultiLineString._parseWkt(wktParser, options);
            case WKX.Types.wkt.MultiPolygon:
                return WKX.MultiPolygon._parseWkt(wktParser, options);
            case WKX.Types.wkt.GeometryCollection:
                return WKX.GeometryCollection._parseWkt(wktParser, options);
        }
    }

    static _parseWkb(value, parentOptions) {
        let binaryReader;
        let geometryType;
        const options = {};

        if (value instanceof WKX.BinaryReader) {
            binaryReader = value;
        } else {
            binaryReader = new WKX.BinaryReader(value);
        }

        binaryReader.isBigEndian = !binaryReader.readInt8();

        const wkbType = binaryReader.readUInt32();

        options.hasSrid = (wkbType & 0x20000000) === 0x20000000;
        options.isEwkb = (wkbType & 0x20000000) || (wkbType & 0x40000000) || (wkbType & 0x80000000);

        if (options.hasSrid) {
            options.srid = binaryReader.readUInt32();
        }

        options.hasZ = false;
        options.hasM = false;

        if (!options.isEwkb && (!parentOptions || !parentOptions.isEwkb)) {
            if (wkbType >= 1000 && wkbType < 2000) {
                options.hasZ = true;
                geometryType = wkbType - 1000;
            } else if (wkbType >= 2000 && wkbType < 3000) {
                options.hasM = true;
                geometryType = wkbType - 2000;
            } else if (wkbType >= 3000 && wkbType < 4000) {
                options.hasZ = true;
                options.hasM = true;
                geometryType = wkbType - 3000;
            } else {
                geometryType = wkbType;
            }
        } else {
            if (wkbType & 0x80000000) {
                options.hasZ = true;
            }
            if (wkbType & 0x40000000) {
                options.hasM = true;
            }

            geometryType = wkbType & 0xF;
        }

        switch (geometryType) {
            case WKX.Types.wkb.Point:
                return WKX.Point._parseWkb(binaryReader, options);
            case WKX.Types.wkb.LineString:
                return WKX.LineString._parseWkb(binaryReader, options);
            case WKX.Types.wkb.Polygon:
                return WKX.Polygon._parseWkb(binaryReader, options);
            case WKX.Types.wkb.MultiPoint:
                return WKX.MultiPoint._parseWkb(binaryReader, options);
            case WKX.Types.wkb.MultiLineString:
                return WKX.MultiLineString._parseWkb(binaryReader, options);
            case WKX.Types.wkb.MultiPolygon:
                return WKX.MultiPolygon._parseWkb(binaryReader, options);
            case WKX.Types.wkb.GeometryCollection:
                return WKX.GeometryCollection._parseWkb(binaryReader, options);
            default:
                throw new Error(`GeometryType ${geometryType} not supported`);
        }
    }

    static parseTwkb(value) {
        let binaryReader;
        const options = {};

        if (value instanceof WKX.BinaryReader) {
            binaryReader = value;
        } else {
            binaryReader = new WKX.BinaryReader(value);
        }

        const type = binaryReader.readUInt8();
        const metadataHeader = binaryReader.readUInt8();

        const geometryType = type & 0x0F;
        options.precision = WKX.ZigZag.decode(type >> 4);
        options.precisionFactor = Math.pow(10, options.precision);

        options.hasBoundingBox = metadataHeader >> 0 & 1;
        options.hasSizeAttribute = metadataHeader >> 1 & 1;
        options.hasIdList = metadataHeader >> 2 & 1;
        options.hasExtendedPrecision = metadataHeader >> 3 & 1;
        options.isEmpty = metadataHeader >> 4 & 1;

        if (options.hasExtendedPrecision) {
            const extendedPrecision = binaryReader.readUInt8();
            options.hasZ = (extendedPrecision & 0x01) === 0x01;
            options.hasM = (extendedPrecision & 0x02) === 0x02;

            options.zPrecision = WKX.ZigZag.decode((extendedPrecision & 0x1C) >> 2);
            options.zPrecisionFactor = Math.pow(10, options.zPrecision);

            options.mPrecision = WKX.ZigZag.decode((extendedPrecision & 0xE0) >> 5);
            options.mPrecisionFactor = Math.pow(10, options.mPrecision);
        } else {
            options.hasZ = false;
            options.hasM = false;
        }

        if (options.hasSizeAttribute) {
            binaryReader.readVarInt();
        }
        if (options.hasBoundingBox) {
            let dimensions = 2;

            if (options.hasZ) {
                dimensions++;
            }
            if (options.hasM) {
                dimensions++;
            }

            for (let i = 0; i < dimensions; i++) {
                binaryReader.readVarInt();
                binaryReader.readVarInt();
            }
        }

        switch (geometryType) {
            case WKX.Types.wkb.Point:
                return WKX.Point._parseTwkb(binaryReader, options);
            case WKX.Types.wkb.LineString:
                return WKX.LineString._parseTwkb(binaryReader, options);
            case WKX.Types.wkb.Polygon:
                return WKX.Polygon._parseTwkb(binaryReader, options);
            case WKX.Types.wkb.MultiPoint:
                return WKX.MultiPoint._parseTwkb(binaryReader, options);
            case WKX.Types.wkb.MultiLineString:
                return WKX.MultiLineString._parseTwkb(binaryReader, options);
            case WKX.Types.wkb.MultiPolygon:
                return WKX.MultiPolygon._parseTwkb(binaryReader, options);
            case WKX.Types.wkb.GeometryCollection:
                return WKX.GeometryCollection._parseTwkb(binaryReader, options);
            default:
                throw new Error(`GeometryType ${geometryType} not supported`);
        }
    }

    static parseGeoJSON(value) {
        return this._parseGeoJSON(value);
    }

    static _parseGeoJSON(value, isSubGeometry) {
        let geometry;

        switch (value.type) {
            case WKX.Types.geoJSON.Point:
                geometry = WKX.Point._parseGeoJSON(value); break;
            case WKX.Types.geoJSON.LineString:
                geometry = WKX.LineString._parseGeoJSON(value); break;
            case WKX.Types.geoJSON.Polygon:
                geometry = WKX.Polygon._parseGeoJSON(value); break;
            case WKX.Types.geoJSON.MultiPoint:
                geometry = WKX.MultiPoint._parseGeoJSON(value); break;
            case WKX.Types.geoJSON.MultiLineString:
                geometry = WKX.MultiLineString._parseGeoJSON(value); break;
            case WKX.Types.geoJSON.MultiPolygon:
                geometry = WKX.MultiPolygon._parseGeoJSON(value); break;
            case WKX.Types.geoJSON.GeometryCollection:
                geometry = WKX.GeometryCollection._parseGeoJSON(value); break;
            default:
                throw new Error(`GeometryType ${value.type} not supported`);
        }

        if (value.crs && value.crs.type && value.crs.type === "name" && value.crs.properties && value.crs.properties.name) {
            const crs = value.crs.properties.name;

            if (crs.indexOf("EPSG:") === 0) {
                geometry.srid = parseInt(crs.substring(5));
            } else if (crs.indexOf("urn:ogc:def:crs:EPSG::") === 0) {
                geometry.srid = parseInt(crs.substring(22));
            } else {
                throw new Error(`Unsupported crs: ${crs}`);
            }
        } else if (!isSubGeometry) {
            geometry.srid = 4326;
        }

        return geometry;
    }

    toEwkt() {
        return `SRID=${this.srid};${this.toWkt()}`;
    }

    toEwkb() {
        const ewkb = new WKX.BinaryWriter(this._getWkbSize() + 4);
        const wkb = this.toWkb();

        ewkb.writeInt8(1);
        ewkb.writeUInt32LE(wkb.slice(1, 5).readUInt32LE(0) | 0x20000000, true);
        ewkb.writeUInt32LE(this.srid);

        ewkb.writeBuffer(wkb.slice(5));

        return ewkb.buffer;
    }

    _getWktType(wktType, isEmpty) {
        let wkt = wktType;

        if (this.hasZ && this.hasM) {
            wkt += " ZM ";
        } else if (this.hasZ) {
            wkt += " Z ";
        } else if (this.hasM) {
            wkt += " M ";
        }

        if (isEmpty && !this.hasZ && !this.hasM) {
            wkt += " ";
        }

        if (isEmpty) {
            wkt += "EMPTY";
        }

        return wkt;
    }

    _getWktCoordinate(point) {
        let coordinates = `${point.x} ${point.y}`;

        if (this.hasZ) {
            coordinates += ` ${point.z}`;
        }
        if (this.hasM) {
            coordinates += ` ${point.m}`;
        }

        return coordinates;
    }

    _writeWkbType(wkb, geometryType, parentOptions) {
        let dimensionType = 0;

        if (is.undefined(this.srid) && (!parentOptions || is.undefined(parentOptions.srid))) {
            if (this.hasZ && this.hasM) {
                dimensionType += 3000;
            } else if (this.hasZ) {
                dimensionType += 1000;
            } else if (this.hasM) {
                dimensionType += 2000;
            }
        } else {
            if (this.hasZ) {
                dimensionType |= 0x80000000;
            }
            if (this.hasM) {
                dimensionType |= 0x40000000;
            }
        }

        wkb.writeUInt32LE(dimensionType + geometryType, true);
    }

    static getTwkbPrecision(xyPrecision, zPrecision, mPrecision) {
        return {
            xy: xyPrecision,
            z: zPrecision,
            m: mPrecision,
            xyFactor: Math.pow(10, xyPrecision),
            zFactor: Math.pow(10, zPrecision),
            mFactor: Math.pow(10, mPrecision)
        };
    }

    _writeTwkbHeader(twkb, geometryType, precision, isEmpty) {
        const type = (WKX.ZigZag.encode(precision.xy) << 4) + geometryType;
        let metadataHeader = (this.hasZ || this.hasM) << 3;
        metadataHeader += isEmpty << 4;

        twkb.writeUInt8(type);
        twkb.writeUInt8(metadataHeader);

        if (this.hasZ || this.hasM) {
            let extendedPrecision = 0;
            if (this.hasZ) {
                extendedPrecision |= 0x1;
            }
            if (this.hasM) {
                extendedPrecision |= 0x2;
            }

            twkb.writeUInt8(extendedPrecision);
        }
    }

    toGeoJSON(options) {
        const geoJSON = {};

        if (this.srid) {
            if (options) {
                if (options.shortCrs) {
                    geoJSON.crs = {
                        type: "name",
                        properties: {
                            name: `EPSG:${this.srid}`
                        }
                    };
                } else if (options.longCrs) {
                    geoJSON.crs = {
                        type: "name",
                        properties: {
                            name: `urn:ogc:def:crs:EPSG::${this.srid}`
                        }
                    };
                }
            }
        }

        return geoJSON;
    }
}
