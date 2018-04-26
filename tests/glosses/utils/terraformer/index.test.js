import GeoJSON from "./geo_json_helpers";

const Terraformer = adone.util.terraformer;


describe("util", "terraformer", () => {
    describe("Primitives", () => {
        it("should create a Point from GeoJSON", () => {
            const point = Terraformer.fromGeoJSON(GeoJSON.points[1]);

            expect(point).to.be.instanceof(Terraformer.Point);
            expect(point.coordinates).to.be.equal(GeoJSON.points[1].coordinates);
        });

        it("should create a MultiPoint from GeoJSON", () => {
            const multiPoint = Terraformer.fromGeoJSON(GeoJSON.multiPoints[1]);

            expect(multiPoint).to.be.instanceof(Terraformer.MultiPoint);
            expect(multiPoint.coordinates).to.be.equal(GeoJSON.multiPoints[1].coordinates);
        });

        it("should create a LineString from GeoJSON", () => {
            const lineString = Terraformer.fromGeoJSON(GeoJSON.lineStrings[3]);

            expect(lineString).to.be.instanceof(Terraformer.LineString);
            expect(lineString.coordinates).to.be.equal(GeoJSON.lineStrings[3].coordinates);
        });

        it("should create a MultiLineString from GeoJSON", () => {
            const multiLineString = Terraformer.fromGeoJSON(GeoJSON.multiLineStrings[1]);

            expect(multiLineString).to.be.instanceof(Terraformer.MultiLineString);
            expect(multiLineString.coordinates).to.be.equal(GeoJSON.multiLineStrings[1].coordinates);
        });

        it("should create a Polygon from GeoJSON", () => {
            const polygon = Terraformer.fromGeoJSON(GeoJSON.polygons[2]);
            expect(polygon).to.be.instanceof(Terraformer.Polygon);
            expect(polygon.coordinates).to.be.equal(GeoJSON.polygons[2].coordinates);
        });

        it("should create a MultiPolygon from GeoJSON", () => {
            const multiPolygon = Terraformer.fromGeoJSON(GeoJSON.multiPolygons[1]);
            expect(multiPolygon).to.be.instanceof(Terraformer.MultiPolygon);
            expect(multiPolygon.coordinates).to.be.equal(GeoJSON.multiPolygons[1].coordinates);
        });

        it("should create a Feature from GeoJSON", () => {
            const feature = Terraformer.fromGeoJSON(GeoJSON.features[0]);
            expect(feature).to.be.instanceof(Terraformer.Feature);
            expect(feature.geometry.coordinates).to.be.equal(GeoJSON.features[0].geometry.coordinates);
            expect(feature.geometry.type).to.be.equal("Polygon");
        });

        it("should create a Feature from GeoJSON with null geometry and properties", () => {
            const feature = Terraformer.fromGeoJSON({
                type: "Feature",
                geometry: null,
                properties: null
            });

            expect(feature).to.be.instanceof(Terraformer.Feature);
            expect(feature.geometry).to.be.equal(null);
            expect(feature.properties).to.be.equal(null);
            expect(feature.type).to.be.equal("Feature");
        });

        it("should create a FeatureCollection from GeoJSON", () => {
            const featureCollection = Terraformer.fromGeoJSON(GeoJSON.featureCollections[0]);

            expect(featureCollection).to.be.instanceof(Terraformer.FeatureCollection);
            expect(featureCollection.features[0].geometry.coordinates).to.be.equal(featureCollection.features[0].geometry.coordinates);
            expect(featureCollection.features[0].geometry.type).to.be.equal("Polygon");
        });

        it("should create a GeometryCollection from GeoJSON", () => {
            const geometryCollection = Terraformer.fromGeoJSON(GeoJSON.geometryCollections[0]);

            expect(geometryCollection).to.be.instanceof(Terraformer.GeometryCollection);
            expect(geometryCollection.geometries.length).to.be.equal(2);
        });

        describe("Helper Methods", () => {
            it("should convert a Primitive to Web Mercator", () => {
                const point = Terraformer.fromGeoJSON(GeoJSON.points[2]);

                const mercator = point.toMercator();

                expect(mercator.coordinates).to.be.deep.equal([11131949.079327168, 0]);
                expect(mercator.crs).to.be.equal(Terraformer.MercatorCRS);
            });

            it("should convert a Primitive to Geographic coordinates", () => {
                const point = Terraformer.fromGeoJSON({
                    type: "Point",
                    coordinates: [11354588.06, 222684.20]
                });

                const mercator = point.toGeographic();

                expect(mercator.coordinates[0]).to.be.closeTo(101.99999999179026, 10);
                expect(mercator.coordinates[1]).to.be.closeTo(1.9999999236399357, 10);
            });

            it("should convert a Primitive to JSON", () => {
                const geometryCollection = Terraformer.fromGeoJSON(GeoJSON.geometryCollections[0]);
                const json = geometryCollection.toJSON();
                expect(json.bbox).to.be.ok();
                expect(json.type).to.be.ok();
                expect(json.geometries).to.be.ok();
                expect(json.length).not.to.be.ok();
            });

            it("should convert a Circle Primitive to JSON", () => {
                const circle = new Terraformer.Circle([-122.6764, 45.5165], 100);
                const json = circle.toJSON();
                expect(json.bbox).to.be.ok();
                expect(json.type).to.be.equal("Feature");
                expect(json.geometry).to.be.ok();
                expect(json.geometry.coordinates).to.be.ok();
                expect(json.geometry.bbox).not.to.be.ok();
                expect(json.center).not.to.be.ok();
                expect(json.steps).not.to.be.ok();
                expect(json.radius).not.to.be.ok();
                expect(json.properties.center).to.be.ok();
                expect(json.properties.steps).to.be.ok();
                expect(json.properties.radius).to.be.ok();
            });
        });

        describe("Point", () => {
            let point;

            beforeEach(() => {
                point = new Terraformer.Point(45, 60);
            });

            it("should create a Point from a 'x' and 'y'", () => {
                expect(point.coordinates).to.be.deep.equal([45, 60]);
            });

            it("should create a Point from a GeoJSON Position", () => {
                const point = new Terraformer.Point([45, 60]);
                expect(point.coordinates).to.be.deep.equal([45, 60]);
            });

            it("should throw an error when called invalid data", () => {
                expect(() => {
                    point = new Terraformer.Point(GeoJSON.multiPoints[1]);
                }).to.throw("Terraformer: invalid input for Terraformer.Point");
            });

            it("should calculate bounds", () => {
                expect(point.bbox()).to.be.deep.equal([45, 60, 45, 60]);
            });

            it("should calculate convex hull", () => {
                expect(point.convexHull()).to.be.equal(null);
            });

            it("should calculate convex hull using Tools", () => {
                expect(Terraformer.Tools.convexHull([point.coordinates])).to.be.deep.equal([[45, 60]]);
            });

            it("should be able to tell a non-convex polygon using Tools", () => {
                expect(Terraformer.Tools.isConvex(GeoJSON.polygons[1].coordinates[0])).to.be.equal(false);
            });

            it("should be able to tell a convex polygon using Tools", () => {
                expect(Terraformer.Tools.isConvex(GeoJSON.polygons[0].coordinates[0])).to.be.equal(true);
            });

            it("should calculate envelope", () => {
                expect(point.envelope()).to.be.deep.equal({ x: 45, y: 60, w: 0, h: 0 });
            });
        });

        describe("MultiPoint", () => {
            let multiPoint;

            beforeEach(() => {
                multiPoint = new Terraformer.MultiPoint([[100, 0], [-45, 122]]);
            });

            it("should create a MultiPoint from an array of GeoJSON Positions", () => {
                expect(multiPoint.coordinates).to.be.deep.equal([[100, 0], [-45, 122]]);
                expect(multiPoint.type).to.be.equal("MultiPoint");
            });

            it("should throw an error when called invalid data", () => {
                expect(() => {
                    multiPoint = new Terraformer.MultiPoint(GeoJSON.points[1]);
                }).to.throw("Terraformer: invalid input for Terraformer.MultiPoint");
            });

            it("should be able to add a point", () => {
                multiPoint.addPoint([80, -60]);
                expect(multiPoint.coordinates).to.be.deep.equal([[100, 0], [-45, 122], [80, -60]]);
            });

            it("should be able to insert a point", () => {
                multiPoint.insertPoint([80, -60], 1);
                expect(multiPoint.coordinates).to.be.deep.equal([[100, 0], [80, -60], [-45, 122]]);
            });

            it("should be able to remove a point by index", () => {
                multiPoint.removePoint(1);
                expect(multiPoint.coordinates).to.be.deep.equal([[100, 0]]);
            });

            it("should be able to remove a point by position", () => {
                multiPoint.removePoint([-45, 122]);
                expect(multiPoint.coordinates).to.be.deep.equal([[100, 0]]);
            });

            it("should be able to itterate over all points", () => {
                const s = spy();
                multiPoint.forEach(s);
                expect(s.callCount).to.be.equal(multiPoint.coordinates.length);
                expect(s).to.have.been.calledWith([100, 0], 0, multiPoint.coordinates);
                expect(s).to.have.been.calledWith([-45, 122], 1, multiPoint.coordinates);
            });

            it("should calculate bounds", () => {
                expect(multiPoint.bbox()).to.be.deep.equal([-45, 0, 100, 122]);
            });

            it("should calculate convex hull", () => {
                multiPoint.addPoint([80, -60]);
                expect(multiPoint.convexHull().type).to.be.equal("Polygon");
                expect(multiPoint.convexHull().coordinates).to.be.deep.equal([[[100, 0], [-45, 122], [80, -60], [100, 0]]]);
            });

            it("should return null when a convex hull cannot return a valid Polygon", () => {
                expect(multiPoint.convexHull()).to.be.equal(null);
            });

            it("should calculate envelope", () => {
                expect(multiPoint.envelope()).to.be.deep.equal({ x: -45, y: 0, w: 145, h: 122 });
            });

            it("should get a point as a Primitive", () => {
                expect(multiPoint.get(0)).to.be.instanceof(Terraformer.Point);
                expect(multiPoint.get(0).coordinates).to.be.deep.equal([100, 0]);
            });
        });

        describe("LineString", () => {
            let lineString;

            beforeEach(() => {
                lineString = new Terraformer.LineString([[100, 0], [-45, 122]]);
            });

            it("should create a Line from an array of GeoJSON Positions", () => {
                expect(lineString.type).to.be.equal("LineString");
                expect(lineString.coordinates).to.be.deep.equal([[100, 0], [-45, 122]]);
            });

            it("should throw an error when called invalid data", () => {
                expect(() => {
                    new Terraformer.LineString(GeoJSON.features[1]).toThrow();
                }).to.throw("Terraformer: invalid input for Terraformer.LineString");
            });

            it("should be able to add a vertex", () => {
                lineString.addVertex([80, -60]);
                expect(lineString.coordinates).to.be.deep.equal([[100, 0], [-45, 122], [80, -60]]);
            });

            it("should be able to insert a vertex", () => {
                lineString.insertVertex([80, -60], 1);
                expect(lineString.coordinates).to.be.deep.equal([[100, 0], [80, -60], [-45, 122]]);
            });

            it("should be able to remove a vertex by index", () => {
                lineString.removeVertex(1);
                expect(lineString.coordinates).to.be.deep.equal([[100, 0]]);
            });

            it("should calculate bounds", () => {
                expect(lineString.bbox()).to.be.deep.equal([-45, 0, 100, 122]);
            });

            it("should calculate convex hull", () => {
                lineString.addVertex([80, -60]);
                expect(lineString.convexHull().type).to.be.equal("Polygon");
                expect(lineString.convexHull().coordinates).to.be.deep.equal([
                    [[100, 0], [-45, 122], [80, -60], [100, 0]]
                ]);
            });

            it("should return null when a convex hull cannot return a valid Polygon", () => {
                expect(lineString.convexHull()).to.be.equal(null);
            });

            it("should calculate envelope", () => {
                expect(lineString.envelope()).to.be.deep.equal({ x: -45, y: 0, w: 145, h: 122 });
            });
        });

        describe("MultiLineString", () => {
            let multiLineString;

            beforeEach(() => {
                multiLineString = new Terraformer.MultiLineString([
                    [[-105, 40], [-110, 45], [-115, 55]],
                    [[-100, 40], [-105, 45], [-110, 55]]
                ]);
            });

            it("should create a MultiLineString from an array of GeoJSON LineStrings", () => {
                expect(multiLineString.type).to.be.equal("MultiLineString");
                expect(multiLineString.coordinates).to.be.deep.equal([
                    [[-105, 40], [-110, 45], [-115, 55]],
                    [[-100, 40], [-105, 45], [-110, 55]]
                ]);
            });

            it("should throw an error when called invalid data", () => {
                expect(() => {
                    new Terraformer.MultiLineString(GeoJSON.features[1]).toThrow();
                }).to.throw("Terraformer: invalid input for Terraformer.MultiLineString");
            });

            it("should have a getter for length", () => {
                expect(multiLineString.coordinates.length).to.be.equal(2);
            });

            it("should calculate bounds", () => {
                expect(multiLineString.bbox()).to.be.deep.equal([-115, 40, -100, 55]);
            });

            it("should calculate convex hull", () => {
                expect(multiLineString.convexHull().type).to.be.equal("Polygon");
                expect(multiLineString.convexHull().coordinates).to.be.deep.equal([
                    [[-100, 40], [-110, 55], [-115, 55], [-110, 45], [-105, 40], [-100, 40]]
                ]);
            });

            it("should calculate envelope", () => {
                expect(multiLineString.envelope()).to.be.deep.equal({ x: -115, y: 40, w: 15, h: 15 });
            });

            it("should get a line as a Primitive", () => {
                expect(multiLineString.get(0)).to.be.instanceof(Terraformer.LineString);
                expect(multiLineString.get(0).coordinates).to.be.deep.equal([[-105, 40], [-110, 45], [-115, 55]]);
            });

            it("should work with forEach correctly", () => {
                let count = 0;
                multiLineString.forEach(() => {
                    count++;
                });

                expect(count).to.be.equal(2);
            });

        });

        describe("Polygon", () => {
            let polygon;
            let polygonWithHoles;

            beforeEach(() => {
                polygon = new Terraformer.Polygon([[[100.0, 0.0], [101.0, 0.0], [101.0, 1.0], [100.0, 1.0], [100.0, 0.0]]]);
                polygonWithHoles = new Terraformer.Polygon([
                    [[100.0, 0.0], [101.0, 0.0], [101.0, 1.0], [100.0, 1.0], [100.0, 0.0]],
                    [[100.2, 0.2], [100.8, 0.2], [100.8, 0.8], [100.2, 0.8], [100.2, 0.2]]
                ]);
            });

            it("should create a Polygon from an array of GeoJSON Positions", () => {
                expect(polygon.type).to.be.equal("Polygon");
                expect(polygon.coordinates).to.be.deep.equal([[[100.0, 0.0], [101.0, 0.0], [101.0, 1.0], [100.0, 1.0], [100.0, 0.0]]]);
            });

            it("should throw an error when called invalid data", () => {
                expect(() => {
                    polygon = new Terraformer.Polygon(GeoJSON.features[1]);
                }).to.throw("Terraformer: invalid input for Terraformer.Polygon");
            });

            it("should be able to add a vertex", () => {
                polygon.addVertex([45, 100]);
                expect(polygon.coordinates).to.be.deep.equal([[[100.0, 0.0], [101.0, 0.0], [101.0, 1.0], [100.0, 1.0], [45, 100], [100.0, 0.0]]]);
            });

            it("should be able to insert a vertex", () => {
                polygon.insertVertex([45, 100], 1);
                expect(polygon.coordinates).to.be.deep.equal([[[100.0, 0.0], [45, 100], [101.0, 0.0], [101.0, 1.0], [100.0, 1.0], [100.0, 0.0]]]);
            });

            it("should be able to remove a vertex by index", () => {
                polygon.removeVertex(0);
                expect(polygon.coordinates).to.be.deep.equal([[[101.0, 0.0], [101.0, 1.0], [100.0, 1.0], [100.0, 0.0]]]);
            });

            it("should calculate bounds", () => {
                expect(polygon.bbox()).to.be.deep.equal([100, 0, 101, 1]);
            });

            it("should calculate convex hull", () => {
                expect(polygon.convexHull().coordinates).to.be.deep.equal([
                    [[101, 1], [100, 1], [100, 0], [101, 0], [101, 1]]
                ]);
                expect(polygon.convexHull().type).to.be.equal("Polygon");
            });

            it("should calculate envelope", () => {
                expect(polygon.envelope()).to.be.deep.equal({ x: 100.0, y: 0, w: 1, h: 1 });
            });

            it("should report hole presence properly", () => {
                expect(polygon.hasHoles()).to.be.equal(false);
                expect(polygonWithHoles.hasHoles()).to.be.equal(true);
            });

            it("should return an array of polygons of each hole", () => {
                const hole = new Terraformer.Polygon([[[100.2, 0.2], [100.8, 0.2], [100.8, 0.8], [100.2, 0.8], [100.2, 0.2]]]);
                expect(polygonWithHoles.holes()).to.be.deep.equal([hole]);
            });
        });

        describe("MultiPolygon", () => {
            let multiPolygon;
            let mp;

            beforeEach(() => {
                multiPolygon = new Terraformer.MultiPolygon(GeoJSON.multiPolygons[0].coordinates);
            });

            it("should create a MultiPolygon from an array of GeoJSON Polygons", () => {
                expect(multiPolygon.type).to.be.equal("MultiPolygon");
                expect(multiPolygon.coordinates).to.be.equal(GeoJSON.multiPolygons[0].coordinates);
            });

            it("should return true when a MultiPolygon intersects another", () => {
                mp = new Terraformer.MultiPolygon([
                    [
                        [[102.0, 2.0], [103.0, 2.0], [103.0, 3.0], [102.0, 3.0], [102.0, 2.0]]
                    ],
                    [
                        [[100.0, 0.0], [102.0, 0.0], [102.0, 1.0], [100.0, 1.0], [100.0, 0.0]]
                    ]
                ]);

                expect(multiPolygon.intersects(mp)).to.be.equal(true);
            });

            it("should throw an error when called invalid data", () => {
                expect(() => {
                    multiPolygon = new Terraformer.MultiPolygon(GeoJSON.multiPoints[0]);
                }).to.throw("Terraformer: invalid input for Terraformer.MultiPolygon");
            });

            it("should have a getter for length", () => {
                expect(multiPolygon.coordinates.length).to.be.equal(2);
            });

            it("should calculate bounds", () => {
                expect(multiPolygon.bbox()).to.be.deep.equal([100, 0, 103, 3]);
            });

            it("should calculate convex hull", () => {
                expect(mp.convexHull().coordinates).to.be.deep.equal([
                    [[103, 3],
                        [102, 3],
                        [100, 1],
                        [100, 0],
                        [102, 0],
                        [103, 2],
                        [103, 3]]
                ]);
                expect(multiPolygon.convexHull().type).to.be.equal("Polygon");
            });

            it("should calculate envelope", () => {
                expect(multiPolygon.envelope()).to.be.deep.equal({ x: 100, y: 0, w: 3, h: 3 });
            });

            it("should get a polygon as a Primitive", () => {
                expect(multiPolygon.get(0)).to.be.instanceof(Terraformer.Polygon);
                expect(multiPolygon.get(0).coordinates).to.be.equal(GeoJSON.multiPolygons[0].coordinates[0]);
            });

            it("should work with forEach correctly", () => {
                let count = 0;
                multiPolygon.forEach(() => {
                    count++;
                });

                expect(count).to.be.equal(2);
            });

            it("should be able to be closed", () => {
                const unclosed = new Terraformer.MultiPolygon({
                    type: "MultiPolygon",
                    coordinates: [
                        [
                            [[102.0, 2.0], [103.0, 2.0], [103.0, 3.0], [102.0, 3.0]],
                            [[102.2, 2.2], [102.8, 2.2], [102.8, 2.8], [102.2, 2.8]]
                        ],
                        [
                            [[100.0, 0.0], [101.0, 0.0], [101.0, 1.0], [100.0, 1.0]],
                            [[100.2, 0.2], [100.8, 0.2], [100.8, 0.8], [100.2, 0.8]]
                        ]
                    ]
                });

                unclosed.close();

                unclosed.forEach((poly) => {
                    expect(poly[0].length).to.be.equal(5);
                    expect(poly[0][0][0]).to.be.equal(poly[0][poly[0].length - 1][0]);
                    expect(poly[0][0][1]).to.be.equal(poly[0][poly[0].length - 1][1]);
                });

            });

        });

        describe("Circle", () => {
            let circle;

            beforeEach(() => {
                circle = new Terraformer.Circle([-122, 45], 1000, 128);
            });

            it("should create a Circle Feature from a GeoJSON Position and a radius", () => {
                expect(circle.type).to.be.equal("Feature");
                expect(circle.geometry.type).to.be.equal("Polygon");
                expect(circle.geometry.coordinates[0].length).to.be.equal(129); // 128 + 1 to close the circle
            });

            it("should throw an error when called invalid data", () => {
                expect(() => {
                    circle = new Terraformer.Circle();
                }).to.throw("Terraformer: missing parameter for Terraformer.Circle");
            });

            it("should form a closed polygon", () => {
                expect(circle.geometry.coordinates[0][0][0]).to.be.equal(circle.geometry.coordinates[0][circle.geometry.coordinates[0].length - 1][0]);
                expect(circle.geometry.coordinates[0][0][1]).to.be.equal(circle.geometry.coordinates[0][circle.geometry.coordinates[0].length - 1][1]);
            });

            it("should have a getter for steps", () => {
                expect(circle.steps()).to.be.equal(128);
            });

            it("should have a setter for steps", () => {
                circle.steps(64);
                expect(circle.properties.steps).to.be.equal(64);
            });

            it("should have a getter for radius", () => {
                expect(circle.radius()).to.be.equal(1000);
            });

            it("should have a setter for radius", () => {
                circle.radius(500);
                expect(circle.properties.radius).to.be.equal(500);
            });

            it("should have a getter for center", () => {
                expect(circle.center()).to.be.deep.equal([-122, 45]);
            });

            it("should have a setter for center", () => {
                circle.center([80, 50]);
                expect(circle.properties.center).to.be.deep.equal([80, 50]);
            });

            it("should calculate bounds", () => {
                expect(circle.bbox()[0]).to.be.closeTo(-122.0089831528, 10);
                expect(circle.bbox()[1]).to.be.closeTo(44.9936475996, 10);
                expect(circle.bbox()[2]).to.be.closeTo(-121.9910168472, 10);
                expect(circle.bbox()[3]).to.be.closeTo(45.0063516962, 10);

            });

            it("should calculate envelope", () => {
                expect(circle.envelope().x).to.be.closeTo(-122.0089831528, 10);
                expect(circle.envelope().y).to.be.closeTo(44.9936475996, 10);
                expect(circle.envelope().w).to.be.closeTo(0.0179663057, 10);
                expect(circle.envelope().h).to.be.closeTo(0.0127040966, 10);
            });

        });

        describe("Feature", () => {
            let feature;

            beforeEach(() => {
                feature = new Terraformer.Feature(GeoJSON.polygons[0]);
            });

            it("should create a Feature from a GeoJSON Geometry", () => {
                expect(feature.type).to.be.equal("Feature");
                expect(feature.geometry.type).to.be.equal("Polygon");
                expect(feature.geometry.coordinates).to.be.equal(GeoJSON.polygons[0].coordinates);
            });

            it("should throw an error when called invalid data", () => {
                expect(() => {
                    new Terraformer.Feature({
                        type: "Polygon"
                    }).to.throw("Terraformer: invalid input for Terraformer.Feature");
                });
            });

            it("should calculate bounds", () => {
                expect(feature.bbox()).to.be.deep.equal([21.79, 33.75, 56.95, 71.01]);
            });

            it("should calculate envelope", () => {
                expect(feature.envelope()).to.be.deep.equal({ x: 21.79, y: 33.75, w: 35.160000000000004, h: 37.260000000000005 });
            });

            it("should calculate convex hull", () => {
                expect(feature.convexHull().type).to.be.equal("Polygon");
                expect(feature.convexHull().coordinates).to.be.deep.equal([
                    [[56.95, 33.75], [41.83, 71.01], [21.79, 36.56], [56.95, 33.75]]
                ]);
            });

        });

        describe("FeatureCollection", () => {
            let featureCollection;

            beforeEach(() => {
                featureCollection = new Terraformer.FeatureCollection([
                    GeoJSON.features[0], GeoJSON.features[1]
                ]);
            });

            it("should create a FeatureCollection from an array of GeoJSON Features", () => {
                expect(featureCollection.features.length).to.be.equal(2);
                expect(featureCollection.features[0]).to.be.equal(GeoJSON.features[0]);
                expect(featureCollection.features[1]).to.be.equal(GeoJSON.features[1]);
            });

            it("should throw an error when called invalid data", () => {
                expect(() => {
                    new Terraformer.FeatureCollection({
                        type: "Polygon"
                    }).to.throw("Terraformer: invalid input for Terraformer.FeatureCollection");
                });
            });

            it("should calculate bounds", () => {
                expect(featureCollection.bbox()).to.be.deep.equal([-104.99404, 33.75, 56.95, 71.01] );
            });

            it("should calculate envelope", () => {
                expect(featureCollection.envelope()).to.be.deep.equal({ x: -104.99404, y: 33.75, w: 161.94404, h: 37.260000000000005 });
            });

            it("should get a Feature as a Primitive", () => {
                expect(featureCollection.get("foo")).to.be.instanceof(Terraformer.Feature);
                expect(featureCollection.get("foo").geometry.coordinates).to.be.equal(GeoJSON.features[0].geometry.coordinates);
            });
        });

        describe("GeometryCollection", () => {
            let geometryCollection;

            beforeEach(() => {
                geometryCollection = new Terraformer.GeometryCollection([GeoJSON.polygons[0], GeoJSON.polygons[1]]);
            });

            it("should create a GeometryCollection from an array of GeoJSON Geometries", () => {
                expect(geometryCollection.geometries.length).to.be.equal(2);
                expect(geometryCollection.geometries[0]).to.be.equal(GeoJSON.polygons[0]);
                expect(geometryCollection.geometries[1]).to.be.equal(GeoJSON.polygons[1]);
            });

            it("should throw an error when called invalid data", () => {
                expect(() => {
                    new Terraformer.GeometryCollection({
                        type: "Polygon"
                    }).to.throw("Terraformer: invalid input for Terraformer.GeometryCollection");
                });
            });

            it("should calculate bounds", () => {
                expect(geometryCollection.bbox()).to.be.deep.equal([-84.32281494140625, 33.73804486328907, 56.95, 71.01]);
            });

            it("should calculate envelope", () => {
                expect(geometryCollection.envelope()).to.be.deep.equal({ x: -84.32281494140625, y: 33.73804486328907, w: 141.27281494140624, h: 37.271955136710936 });
            });

            it("should get a Geometry as a Primitive", () => {
                expect(geometryCollection.get(0)).to.be.instanceof(Terraformer.Polygon);
                expect(geometryCollection.get(0).coordinates).to.be.equal(GeoJSON.polygons[0].coordinates);
            });

            it("should work with forEach correctly", () => {
                let count = 0;
                geometryCollection.forEach(() => {
                    count++;
                });

                expect(count).to.be.equal(2);
            });

        });
    });

    describe("Intersection", () => {
        let multiLineString;

        describe("MultiLineString", () => {
            beforeEach(() => {
                multiLineString = new Terraformer.MultiLineString([[[0, 0], [10, 10]], [[5, 5], [15, 15]]]);
            });

            it("should correctly figure out intersection with a LineString", () => {
                expect(multiLineString.intersects(new Terraformer.LineString([[0, 10], [15, 5]]))).to.be.equal(true);
            });

            it("should correctly figure out intersection with a MultiLineString", () => {
                expect(multiLineString.intersects(new Terraformer.MultiLineString([[[0, 10], [15, 5]]]))).to.be.equal(true);
            });

            it("should correctly figure out intersection with a Polygon", () => {
                expect(multiLineString.intersects(new Terraformer.Polygon([[[0, 5], [10, 5], [10, 0], [0, 0]]]))).to.be.equal(true);
            });

            it("should correctly figure out intersection with a MultiPolygon", () => {
                expect(multiLineString.intersects(new Terraformer.MultiPolygon([[[[0, 5], [10, 5], [10, 0], [0, 0]]]]))).to.be.equal(true);
            });
        });

        describe("Polygon", () => {
            let polygon;

            beforeEach(() => {
                polygon = new Terraformer.Polygon([[[0, 0], [10, 0], [10, 5], [0, 5]]]);
            });

            it("should correctly figure out intersection of the same object", () => {
                expect(polygon.intersects(polygon)).to.be.equal(true);
            });

            it("should correctly figure out intersection with a Polygon", () => {
                expect(polygon.intersects(new Terraformer.Polygon([[[1, 1], [11, 1], [11, 6], [1, 6]]]))).to.be.equal(true);
            });

            it("should correctly figure out intersection with a MultiPolygon", () => {
                expect(polygon.intersects(new Terraformer.MultiPolygon([[[[1, 1], [11, 1], [11, 6], [1, 6]]]]))).to.be.equal(true);
            });

            it("should correctly figure out intersection with a Polygon", () => {
                expect(polygon.intersects(new Terraformer.Polygon([[[1, 1], [11, 1], [11, 6], [1, 6]]]))).to.be.equal(true);
            });

            it("should correctly figure out intersection with a MultiLineString", () => {
                expect(polygon.intersects(new Terraformer.MultiLineString([[[1, 1], [11, 1], [11, 6], [1, 6]]]))).to.be.equal(true);
            });

            it("should correctly figure out intersection with a LineString", () => {
                expect(polygon.intersects(new Terraformer.LineString([[1, 1], [11, 1], [11, 6], [1, 6]]))).to.be.equal(true);
            });

            it("should correctly figure out intersection with a MultiPolygon", () => {
                expect(polygon.intersects(new Terraformer.MultiPolygon([[[[1, 1], [11, 1], [11, 6], [1, 6]]]]))).to.be.equal(true);
            });

            it("should correctly figure out intersection with a MultiPolygon in reverse", () => {
                const mp = new Terraformer.MultiPolygon([[[[1, 1], [11, 1], [11, 6], [1, 6]]]]);
                expect(mp.intersects(polygon)).to.be.equal(true);
            });

        });

        describe("MultiPolygon", () => {
            let multiPolygon;

            beforeEach(() => {
                multiPolygon = new Terraformer.MultiPolygon([[[[48.5, -122.5], [50, -123], [48.5, -122.5]]]]);
            });

            it("should return false if two MultiPolygons do not intersect", () => {
                const mp = new Terraformer.MultiPolygon([[[[1, 2], [3, 4], [5, 6]]]]);
                expect(multiPolygon.intersects(mp)).to.be.equal(false);
            });
        });

        describe("Feature", () => {
            let feature;

            beforeEach(() => {
                feature = new Terraformer.Feature( {
                    type: "Feature",
                    geometry: {
                        type: "Polygon",
                        coordinates: [[[0, 0], [10, 0], [10, 5], [0, 5]]]
                    }
                });
            });

        });

        describe("LineString", () => {
            let lineString;

            beforeEach(() => {
                lineString = new Terraformer.LineString([[45, -122], [46, -123]]);
            });

            it("should correctly figure out intersection with a LineString", () => {
                expect(lineString.intersects(new Terraformer.LineString([[46, -121], [44, -124]]))).to.be.equal(true);
            });

            it("should correctly figure out that parallel lines are not intersections", () => {
                expect(lineString.intersects(new Terraformer.LineString([[44, -121], [45, -122]]))).to.be.equal(false);
            });

            it("should correctly figure out that the same lines are not intersections", () => {
                expect(lineString.intersects(new Terraformer.LineString([[45, -122], [46, -123]]))).to.be.equal(false);
            });

            it("should correctly figure out intersection with Polygon", () => {
                expect(lineString.intersects(new Terraformer.Polygon([[[45.5, -122.5], [47, -123], [45.5, -122.5]]]))).to.be.equal(true);
            });

            it("should correctly figure out lack of intersection with Polygon", () => {
                expect(lineString.intersects(new Terraformer.Polygon([[[48.5, -122.5], [50, -123], [48.5, -122.5]]]))).to.be.equal(false);
            });

            it("should correctly figure out intersection with MultiLineString", () => {
                expect(lineString.intersects(new Terraformer.MultiLineString([[[45.5, -122.5], [47, -123], [45.5, -122.5]]]))).to.be.equal(true);
            });

            it("should correctly figure out lack of intersection with MultiLineString", () => {
                expect(lineString.intersects(new Terraformer.MultiLineString([[[48.5, -122.5], [50, -123], [48.5, -122.5]]]))).to.be.equal(false);
            });

            it("should correctly figure out intersection with MultiPolygon", () => {
                expect(lineString.intersects(new Terraformer.MultiPolygon([[[[45.5, -122.5], [47, -123], [45.5, -122.5]]]]))).to.be.equal(true);
            });

            it("should correctly figure out lack of intersection with MultiPolygon", () => {
                expect(lineString.intersects(new Terraformer.MultiPolygon([[[[48.5, -122.5], [50, -123], [48.5, -122.5]]]]))).to.be.equal(false);
            });

            it("should correctly figure out lack of intersection with MultiPolygon in reverse", () => {
                const mp = new Terraformer.MultiPolygon([[[[48.5, -122.5], [50, -123], [48.5, -122.5]]]]);
                expect(mp.intersects(lineString)).to.be.equal(false);
            });

        });

        describe("Point Within", () => {
            let point;

            beforeEach(() => {
                point = new Terraformer.Point([10, 10]);
            });

            it("should return true when inside a polygon", () => {
                const polygon = new Terraformer.Polygon([[[5, 5], [5, 15], [15, 15], [15, 5], [5, 5]]]);
                expect(point.within(polygon)).to.be.equal(true);
            });

            it("should return false when not inside a polygon", () => {
                const polygon = new Terraformer.Polygon([[[25, 25], [25, 35], [35, 35], [35, 25], [25, 25]]]);
                expect(point.within(polygon)).to.be.equal(false);
            });

            it("should return true when it is the same point", () => {
                const npoint = new Terraformer.Point([10, 10]);
                expect(point.within(npoint)).to.be.equal(true);
            });

            it("should return false when it is not the same point", () => {
                const npoint = new Terraformer.Point([11, 11]);
                expect(point.within(npoint)).to.be.equal(false);
            });

            it("should return true when inside a multipolygon", () => {
                const mp = new Terraformer.MultiPolygon([[[[25, 25], [25, 35], [35, 35], [35, 25], [25, 25]]], [[[5, 5], [15, 5], [15, 15], [5, 15], [5, 5]]]]);
                expect(point.within(mp)).to.be.equal(true);
            });

            it("should return false when not inside a multipolygon", () => {
                const mp = new Terraformer.MultiPolygon([[[[25, 25], [25, 35], [35, 35], [35, 25], [25, 25]]], [[[15, 15], [25, 15], [25, 25], [15, 25], [15, 15]]]]);
                expect(point.within(mp)).to.be.equal(false);
            });

            it("should return false when inside a hole of a polygon", () => {
                const polygon = new Terraformer.Polygon([[[5, 5], [5, 15], [15, 15], [15, 5], [5, 5]], [[9, 9], [9, 11], [11, 11], [11, 9], [9, 9]]]);
                expect(point.within(polygon)).to.be.equal(false);
            });

            it("should return true when not inside a hole of a polygon", () => {
                const polygon = new Terraformer.Polygon([[[5, 5], [5, 15], [15, 15], [15, 5], [5, 5]], [[9, 9], [9, 9.5], [9.5, 9.5], [9.5, 9], [9, 9]]]);
                expect(point.within(polygon)).to.be.equal(true);
            });

            it("should return true when inside a circle", () => {
                const circle = new Terraformer.Circle([10, 10], 50, 64);
                expect(point.within(circle)).to.be.equal(true);
            });

        });

        describe("MultiPolygon Within", () => {
            let multipolygon;

            beforeEach(() => {
                multipolygon = new Terraformer.MultiPolygon([[[[5, 5], [5, 15], [15, 15], [15, 5], [5, 5]]], [[[25, 25], [25, 35], [35, 35], [35, 25], [25, 25]]]]);
            });

            it("should return true if a linestring is within a multipolygon", () => {
                const linestring = new Terraformer.LineString([[6, 6], [6, 14]]);
                expect(linestring.within(multipolygon)).to.be.equal(true);
            });

            it("should return true if a multipoint is within a multipolygon", () => {
                const linestring = new Terraformer.MultiPoint([[6, 6], [6, 14]]);
                expect(linestring.within(multipolygon)).to.be.equal(true);
            });

            it("should return true if a multilinestring is within a multipolygon", () => {
                const mls = new Terraformer.MultiLineString([[[6, 6], [6, 14]]]);
                expect(mls.within(multipolygon)).to.be.equal(true);
            });

            it("should return false if a part of a multilinestring is not within a multipolygon", () => {
                const mls = new Terraformer.MultiLineString([[[6, 6], [6, 14]], [[1, 1], [1, 2]]]);
                expect(mls.within(multipolygon)).to.be.equal(false);
            });

            it("should return true if a multipolygon is within a multipolygon", () => {
                const mp = new Terraformer.MultiPolygon([[[[1, 1], [1, 40], [40, 40], [40, 1], [1, 1]]]]);
                expect(multipolygon.within(mp)).to.be.equal(true);
            });

        });

        describe("More Point Within", () => {
            let point;

            beforeEach(() => {
                point = new Terraformer.Point([6, 6]);
            });

            it("should return true if a point is within a multipoint", () => {
                const multipoint = new Terraformer.MultiPoint([[1, 1], [2, 2], [3, 3], [6, 6]]);
                expect(point.within(multipoint)).to.be.equal(true);
            });

            it("should return false if a point is within a multipoint with different length", () => {
                const multipoint = new Terraformer.MultiPoint([[1, 1, 1], [2, 2, 2], [3, 3, 3], [6, 6, 6]]);
                expect(point.within(multipoint)).to.be.equal(false);
            });

            it("should return true if a point is within a linestring", () => {
                const linestring = new Terraformer.LineString([[1, 1], [2, 2], [3, 3], [6, 6]]);
                expect(point.within(linestring)).to.be.equal(true);
            });

            it("should return true if a point is within a multilinestring", () => {
                const linestring = new Terraformer.MultiLineString([[[1, 1], [2, 2], [3, 3], [6, 6]]]);
                expect(point.within(linestring)).to.be.equal(true);
            });

        });

        describe("Polygon Within", () => {
            let polygon;

            beforeEach(() => {
                polygon = new Terraformer.Polygon([[[5, 5], [5, 15], [15, 15], [15, 5], [5, 5]]]);
            });

            it("should return true when inside a polygon", () => {
                const polygon2 = new Terraformer.Polygon([[[3, 3], [3, 18], [18, 18], [18, 3], [3, 3]]]);
                expect(polygon.within(polygon2)).to.be.equal(true);
            });

            it("should return false when not inside a polygon", () => {
                const polygon2 = new Terraformer.Polygon([[[25, 25], [25, 35], [35, 35], [35, 25], [25, 25]]]);
                expect(polygon.within(polygon2)).to.be.equal(false);
            });

            it("should return true when it is the same polygon", () => {
                const polygon2 = new Terraformer.Polygon([[[5, 5], [5, 15], [15, 15], [15, 5], [5, 5]]]);
                expect(polygon.within(polygon2)).to.be.equal(true);
            });

            it("should return true when inside a multipolygon", () => {
                const mp = new Terraformer.MultiPolygon([[[[25, 25], [25, 35], [35, 35], [35, 25], [25, 25]]], [[[3, 3], [18, 3], [18, 18], [3, 18], [3, 3]]]]);
                expect(polygon.within(mp)).to.be.equal(true);
            });

            it("should return false when not inside a multipolygon", () => {
                const mp = new Terraformer.MultiPolygon([[[[25, 25], [25, 35], [35, 35], [35, 25], [25, 25]]], [[[15, 15], [25, 15], [25, 25], [15, 25], [15, 15]]]]);
                expect(polygon.within(mp)).to.be.equal(false);
            });

            it("should return true when one of the polygons is the same polygon", () => {
                const mp = new Terraformer.MultiPolygon([[[[5, 5], [5, 15], [15, 15], [15, 5], [5, 5]]], [[[1, 1], [1, 2], [2, 1]]]]);
                expect(polygon.within(mp)).to.be.equal(true);
            });

            it("should return true if all of the points in a linestring are in the same polygon", () => {
                const ls = new Terraformer.LineString([[6, 6], [6, 14], [14, 14]]);
                expect(ls.within(polygon)).to.be.equal(true);
            });

            it("should return true if all of the points in a multipoint are in the same polygon", () => {
                const ls = new Terraformer.MultiPoint([[6, 6], [6, 14], [14, 14]]);
                expect(ls.within(polygon)).to.be.equal(true);
            });

            it("should return false if one of the points in a linestring leave the polygon", () => {
                const ls = new Terraformer.LineString([[6, 6], [6, 14], [16, 16]]);
                expect(ls.within(polygon)).to.be.equal(false);
            });

            it("should return false if one of the points in a multipoint leave the polygon", () => {
                const ls = new Terraformer.MultiPoint([[6, 6], [6, 14], [16, 16]]);
                expect(ls.within(polygon)).to.be.equal(false);
            });

            it("should return true if a multilinestring is within a polygon", () => {
                const mls = new Terraformer.MultiLineString([[[6, 6], [6, 14]]]);
                expect(mls.within(polygon)).to.be.equal(true);
            });

            it("should return false if a part of a multilinestring is not within a polygon", () => {
                const mls = new Terraformer.MultiLineString([[[6, 6], [6, 14]], [[1, 1], [1, 2]]]);

                expect(mls.within(polygon)).to.be.equal(false);
            });

            it("should return true if a multipolygon is within a polygon", () => {
                const mp = new Terraformer.MultiPolygon([[[[6, 14], [14, 14], [14, 6], [6, 6], [6, 14]]]]);
                expect(mp.within(polygon)).to.be.equal(true);
            });

            it("should return false if an empty LineString is checked within a polygon", () => {
                const ls = new Terraformer.LineString([]);
                expect(ls.within(polygon)).to.be.equal(false);
            });

        });

        describe("Catch All", () => {
            it("should return an empty array for an empty convexHull", () => {
                expect(Terraformer.Tools.convexHull([])).to.be.deep.equal([]);
            });

            it("should return null for convexHull of empty Point", () => {
                const point = new Terraformer.Point([]);
                expect(point.convexHull()).to.be.equal(null);
            });

            it("should return null for an empty convexHull for LineString", () => {
                const ls = new Terraformer.LineString([]);
                expect(ls.convexHull()).to.be.equal(null);
            });

            it("should return an empty array for an empty convexHull for Polygon", () => {
                const p = new Terraformer.Polygon([]);
                expect(p.convexHull()).to.be.equal(null);
            });

            it("should return an empty array for an empty convexHull for MultiPolygon", () => {
                const mp = new Terraformer.MultiPolygon([]);
                expect(mp.convexHull()).to.be.equal(null);
            });

            it("should return an empty array for an empty convexHull for Feature", () => {
                const f = new Terraformer.Feature({
                    type: "Feature",
                    geometry: {
                        type: "Polygon",
                        coordinates: []
                    }
                });
                expect(f.convexHull()).to.be.equal(null);
            });

            it("should throw an error for an unknow type in Primitive", () => {
                expect(() => {
                    const f = Terraformer.fromGeoJSON({ type: "foobar" });
                }).to.throw("Unknown type: foobar");
            });

            it("should throw an error for an unknow type in calculateBounds", () => {
                expect(() => {
                    Terraformer.Tools.calculateBounds({ type: "foobar" });
                }).to.throw("Unknown type: foobar");
            });

            it("should return null when there is no geometry in a Feature in calculateBounds", () => {
                const bounds = Terraformer.Tools.calculateBounds({ type: "Feature", geomertry: null });
                expect(bounds).to.be.equal(null);
            });

            it("should return true when polygonContainsPoint is passed the right stuff", () => {
                expect(Terraformer.Tools.polygonContainsPoint([], [])).to.be.equal(false);
            });

            it("should return false when polygonContainsPoint is passed an empty polygon", () => {
                const pt = [-111.873779, 40.647303];
                const polygon = [[
                    [-112.074279, 40.52215],
                    [-112.074279, 40.853293],
                    [-111.610107, 40.853293],
                    [-111.610107, 40.52215],
                    [-112.074279, 40.52215]
                ]];

                expect(Terraformer.Tools.polygonContainsPoint(polygon, pt)).to.be.equal(true);
            });

            it("should return false if a polygonContainsPoint is called and the point is outside the polygon", () => {
                expect(Terraformer.Tools.polygonContainsPoint([[1, 2], [2, 2], [2, 1], [1, 1], [1, 2]], [10, 10])).to.be.equal(false);
            });

            it("should return false if coordinatesEqual are given non-equal lengths", () => {
                expect(Terraformer.Tools.coordinatesEqual([[1, 2]], [[1, 2], [2, 3]])).to.be.equal(false);
            });

            it("should return false if coordinatesEqual coordinates are non-equal lengths", () => {
                expect(Terraformer.Tools.coordinatesEqual([[1, 2]], [[1, 2, 3]])).to.be.equal(false);
            });
        });
    });
});
