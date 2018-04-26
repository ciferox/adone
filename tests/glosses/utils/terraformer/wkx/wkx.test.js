const { WKX } = adone.util.terraformer;

// some declaration are required for eval...
/* eslint-disable */
const {
    Geometry,
    Point,
    MultiPoint,
    LineString,
    Polygon,
    MultiLineString,
    MultiPolygon,
    GeometryCollection
} = WKX;
/* eslint-enable */

const tests = {
    "2D": require("./testdata.json"),
    Z: require("./testdataZ.json"),
    M: require("./testdataM.json"),
    ZM: require("./testdataZM.json")
};

const assertParseWkt = (data) => {
    assert.deepEqual(Geometry.parse(data.wkt), eval(data.geometry));
};

const assertParseWkb = (data) => {
    let geometry = data.wkbGeometry ? data.wkbGeometry : data.geometry;
    geometry = eval(geometry);
    geometry.srid = undefined;
    assert.deepEqual(Geometry.parse(Buffer.from(data.wkb, "hex")), geometry);
};

const assertParseWkbXdr = (data) => {
    let geometry = data.wkbGeometry ? data.wkbGeometry : data.geometry;
    geometry = eval(geometry);
    geometry.srid = undefined;
    assert.deepEqual(Geometry.parse(Buffer.from(data.wkbXdr, "hex")), geometry);
};

const assertParseEwkt = (data) => {
    const geometry = eval(data.geometry);
    geometry.srid = 4326;
    assert.deepEqual(Geometry.parse(`SRID=4326;${data.wkt}`), geometry);
};

const assertParseEwkb = (data) => {
    let geometry = data.wkbGeometry ? data.wkbGeometry : data.geometry;
    geometry = eval(geometry);
    geometry.srid = 4326;
    assert.deepEqual(Geometry.parse(Buffer.from(data.ewkb, "hex")), geometry);
};

const assertParseEwkbXdr = (data) => {
    let geometry = data.wkbGeometry ? data.wkbGeometry : data.geometry;
    geometry = eval(geometry);
    geometry.srid = 4326;
    assert.deepEqual(Geometry.parse(Buffer.from(data.ewkbXdr, "hex")), geometry);
};

const assertParseEwkbNoSrid = (data) => {
    let geometry = data.wkbGeometry ? data.wkbGeometry : data.geometry;
    geometry = eval(geometry);
    assert.deepEqual(Geometry.parse(Buffer.from(data.ewkbNoSrid, "hex")), geometry);
};

const assertParseEwkbXdrNoSrid = (data) => {
    let geometry = data.wkbGeometry ? data.wkbGeometry : data.geometry;
    geometry = eval(geometry);
    assert.deepEqual(Geometry.parse(Buffer.from(data.ewkbXdrNoSrid, "hex")), geometry);
};

const assertParseTwkb = (data) => {
    const geometry = eval(data.geometry);
    geometry.srid = undefined;
    assert.deepEqual(Geometry.parseTwkb(Buffer.from(data.twkb, "hex")), geometry);
};

const assertParseGeoJSON = (data) => {
    let geometry = data.geoJSONGeometry ? data.geoJSONGeometry : data.geometry;
    geometry = eval(geometry);
    geometry.srid = 4326;
    assert.deepEqual(Geometry.parseGeoJSON(data.geoJSON), geometry);
};

const assertToWkt = (data) => {
    assert.equal(eval(data.geometry).toWkt(), data.wkt);
};

const assertToWkb = (data) => {
    assert.equal(eval(data.geometry).toWkb().toString("hex"), data.wkb);
};

const assertToEwkt = (data) => {
    const geometry = eval(data.geometry);
    geometry.srid = 4326;
    assert.equal(geometry.toEwkt(), `SRID=4326;${data.wkt}`);
};

const assertToEwkb = (data) => {
    const geometry = eval(data.geometry);
    geometry.srid = 4326;
    assert.equal(geometry.toEwkb().toString("hex"), data.ewkb);
};

const assertToTwkb = (data) => {
    assert.equal(eval(data.geometry).toTwkb().toString("hex"), data.twkb);
};

const assertToGeoJSON = (data) => {
    assert.deepEqual(eval(data.geometry).toGeoJSON(), data.geoJSON);
};

describe("util", "terraformer", "wkx", () => {
    describe("Geometry", () => {
        it("parse(wkt) - coordinate", () => {
            assert.deepEqual(Geometry.parse("POINT(1 2)"), new Point(1, 2));
            assert.deepEqual(Geometry.parse("POINT(1.2 3.4)"), new Point(1.2, 3.4));
            assert.deepEqual(Geometry.parse("POINT(1 3.4)"), new Point(1, 3.4));
            assert.deepEqual(Geometry.parse("POINT(1.2 3)"), new Point(1.2, 3));

            assert.deepEqual(Geometry.parse("POINT(-1 -2)"), new Point(-1, -2));
            assert.deepEqual(Geometry.parse("POINT(-1 2)"), new Point(-1, 2));
            assert.deepEqual(Geometry.parse("POINT(1 -2)"), new Point(1, -2));

            assert.deepEqual(Geometry.parse("POINT(-1.2 -3.4)"), new Point(-1.2, -3.4));
            assert.deepEqual(Geometry.parse("POINT(-1.2 3.4)"), new Point(-1.2, 3.4));
            assert.deepEqual(Geometry.parse("POINT(1.2 -3.4)"), new Point(1.2, -3.4));

            assert.deepEqual(Geometry.parse("MULTIPOINT(1 2,3 4)"),
                new MultiPoint([new Point(1, 2), new Point(3, 4)]));
            assert.deepEqual(Geometry.parse("MULTIPOINT(1 2, 3 4)"),
                new MultiPoint([new Point(1, 2), new Point(3, 4)]));
            assert.deepEqual(Geometry.parse("MULTIPOINT((1 2),(3 4))"),
                new MultiPoint([new Point(1, 2), new Point(3, 4)]));
            assert.deepEqual(Geometry.parse("MULTIPOINT((1 2), (3 4))"),
                new MultiPoint([new Point(1, 2), new Point(3, 4)]));
        });
        it("parse() - invalid input", () => {
            assert.throws(Geometry.parse, /first argument must be a string or Buffer/);
            assert.throws(() => {
                Geometry.parse("TEST");
            }, /Expected geometry type/);
            assert.throws(() => {
                Geometry.parse("POINT)");
            }, /Expected group start/);
            assert.throws(() => {
                Geometry.parse("POINT(1 2");
            }, /Expected group end/);
            assert.throws(() => {
                Geometry.parse("POINT(1)");
            }, /Expected coordinates/);
            assert.throws(() => {
                Geometry.parse("TEST");
            }, /Expected geometry type/);
            assert.throws(() => {
                Geometry.parse(Buffer.from("010800000000000000", "hex"));
            }, /GeometryType 8 not supported/);
            assert.throws(() => {
                Geometry.parseTwkb(Buffer.from("a800c09a0c80b518", "hex"));
            }, /GeometryType 8 not supported/);
            assert.throws(() => {
                Geometry.parseGeoJSON({ type: "TEST" });
            }, /GeometryType TEST not supported/);
        });
    });

    const createTest = (testKey, testData) => {
        describe(testKey, () => {
            it("parse(wkt)", () => {
                assertParseWkt(testData[testKey]);
            });
            it("parse(wkb)", () => {
                assertParseWkb(testData[testKey]);
            });
            it("parse(wkb xdr)", () => {
                assertParseWkbXdr(testData[testKey]);
            });
            it("parse(ewkt)", () => {
                assertParseEwkt(testData[testKey]);
            });
            it("parse(ewkb)", () => {
                assertParseEwkb(testData[testKey]);
            });
            it("parse(ewkb xdr)", () => {
                assertParseEwkbXdr(testData[testKey]);
            });
            it("parse(ewkb no srid)", () => {
                assertParseEwkbNoSrid(testData[testKey]);
            });
            it("parse(ewkb xdr no srid)", () => {
                assertParseEwkbXdrNoSrid(testData[testKey]);
            });
            it("parseTwkb()", () => {
                assertParseTwkb(testData[testKey]);
            });
            it("parseGeoJSON()", () => {
                assertParseGeoJSON(testData[testKey]);
            });
            it("toWkt()", () => {
                assertToWkt(testData[testKey]);
            });
            it("toWkb()", () => {
                assertToWkb(testData[testKey]);
            });
            it("toEwkt()", () => {
                assertToEwkt(testData[testKey]);
            });
            it("toEwkb()", () => {
                assertToEwkb(testData[testKey]);
            });
            it("toTwkb()", () => {
                assertToTwkb(testData[testKey]);
            });
            it("toGeoJSON()", () => {
                assertToGeoJSON(testData[testKey]);
            });
        });
    };

    const createTests = (testKey, testData) => {
        describe(testKey, () => {
            for (const testDataKey in testData) {
                createTest(testDataKey, testData);
            }
        });
    };

    for (const testKey in tests) {
        createTests(testKey, tests[testKey]);
    }
});
