describe("util", "terraformer", "wkx", () => {
    const { WKX } = adone.util.terraformer;
    const { Geometry, Point } = WKX;

    describe("parseGeoJSON", () => {

        it("includes short CRS", () => {
            const point = new Point(1, 2);
            point.srid = 4326;

            assert.deepEqual(Geometry.parseGeoJSON({
                type: "Point",
                crs: {
                    type: "name",
                    properties: {
                        name: "EPSG:4326"
                    }
                },
                coordinates: [1, 2]
            }), point);
        });
        it("includes long CRS", () => {
            const point = new Point(1, 2);
            point.srid = 4326;

            assert.deepEqual(Geometry.parseGeoJSON({
                type: "Point",
                crs: {
                    type: "name",
                    properties: {
                        name: "urn:ogc:def:crs:EPSG::4326"
                    }
                },
                coordinates: [1, 2]
            }), point);
        });
        it("includes invalid CRS", () => {
            assert.throws(() => {
                Geometry.parseGeoJSON({
                    type: "Point",
                    crs: {
                        type: "name",
                        properties: {
                            name: "TEST"
                        }
                    },
                    coordinates: [1, 2]
                });
            }, /Unsupported crs: TEST/);
        });
    });
    describe("toGeoJSON", () => {
        it("include short CRS", () => {
            const point = new Point(1, 2);
            point.srid = 4326;

            assert.deepEqual(point.toGeoJSON({ shortCrs: true }), {
                type: "Point",
                crs: {
                    type: "name",
                    properties: {
                        name: "EPSG:4326"
                    }
                },
                coordinates: [1, 2]
            });
        });
        it("include long CRS", () => {
            const point = new Point(1, 2);
            point.srid = 4326;

            assert.deepEqual(point.toGeoJSON({ longCrs: true }), {
                type: "Point",
                crs: {
                    type: "name",
                    properties: {
                        name: "urn:ogc:def:crs:EPSG::4326"
                    }
                },
                coordinates: [1, 2]
            });
        });
        it("geometry with SRID - without options", () => {
            const point = new Point(1, 2);
            point.srid = 4326;

            assert.deepEqual(point.toGeoJSON(), {
                type: "Point",
                coordinates: [1, 2]
            });
        });
        it("geometry with SRID - with empty options", () => {
            const point = new Point(1, 2);
            point.srid = 4326;

            assert.deepEqual(point.toGeoJSON({}), {
                type: "Point",
                coordinates: [1, 2]
            });
        });
    });
});
