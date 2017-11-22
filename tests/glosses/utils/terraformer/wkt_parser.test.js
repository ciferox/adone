const Terraformer = adone.util.terraformer;
describe("WKT Convert", () => {
    it("should convert a POINT", () => {
        const input = {
            type: "Point",
            coordinates: [30, 10]
        };

        const output = Terraformer.WKT.convert(input);

        expect(output).to.be.equal("POINT (30 10)");
    });

    it("should convert a POINT with Z", () => {
        const input = {
            type: "Point",
            coordinates: [30, 10, 10]
        };

        const output = Terraformer.WKT.convert(input);

        expect(output).to.be.equal("POINT Z (30 10 10)");
    });

    it("should convert a POINT with M (nonstandard)", () => {
        const input = {
            properties: { m: true },
            type: "Point",
            coordinates: [30, 10, 10]
        };

        const output = Terraformer.WKT.convert(input);

        expect(output).to.be.equal("POINT M (30 10 10)");
    });

    it("should convert a POINT with Z and M", () => {
        const input = {
            type: "Point",
            coordinates: [30, 10, 10, 12]
        };

        const output = Terraformer.WKT.convert(input);

        expect(output).to.be.equal("POINT ZM (30 10 10 12)");
    });

    it("should convert an empty POINT", () => {
        const input = {
            type: "Point",
            coordinates: []
        };

        const output = Terraformer.WKT.convert(input);

        expect(output).to.be.equal("POINT EMPTY");
    });

    it("should convert a POLYGON", () => {
        const input = {
            type: "Polygon",
            coordinates: [[[30, 10], [20, 20], [30, 20]]]
        };

        const output = Terraformer.WKT.convert(input);

        expect(output).to.be.equal("POLYGON ((30 10, 20 20, 30 20))");
    });

    it("should convert a POLYGON with Z", () => {
        const input = {
            type: "Polygon",
            coordinates: [[[30, 10, 1], [20, 20, 2], [30, 20, 3]]]
        };

        const output = Terraformer.WKT.convert(input);

        expect(output).to.be.equal("POLYGON Z ((30 10 1, 20 20 2, 30 20 3))");
    });

    it("should convert a POLYGON with ZM", () => {
        const input = {
            type: "Polygon",
            coordinates: [[[30, 10, 1, 3], [20, 20, 2, 2], [30, 20, 3, 1]]]
        };

        const output = Terraformer.WKT.convert(input);

        expect(output).to.be.equal("POLYGON ZM ((30 10 1 3, 20 20 2 2, 30 20 3 1))");
    });

    it("should convert a POLYGON with M (nonstandard)", () => {
        const input = {
            properties: { m: true },
            type: "Polygon",
            coordinates: [[[30, 10, 1], [20, 20, 2], [30, 20, 3]]]
        };

        const output = Terraformer.WKT.convert(input);

        expect(output).to.be.equal("POLYGON M ((30 10 1, 20 20 2, 30 20 3))");
    });

    it("should convert an EMPTY POLYGON", () => {
        const input = {
            type: "Polygon",
            coordinates: []
        };

        const output = Terraformer.WKT.convert(input);

        expect(output).to.be.equal("POLYGON EMPTY");
    });

    it("should convert a MULTIPOINT", () => {
        const input = {
            type: "MultiPoint",
            coordinates: [[30, 10], [20, 20], [30, 20]]
        };

        const output = Terraformer.WKT.convert(input);

        expect(output).to.be.equal("MULTIPOINT (30 10, 20 20, 30 20)");
    });

    it("should convert a MULTIPOINT with Z", () => {
        const input = {
            type: "MultiPoint",
            coordinates: [[30, 10, 1], [20, 20, 2], [30, 20, 3]]
        };

        const output = Terraformer.WKT.convert(input);

        expect(output).to.be.equal("MULTIPOINT Z (30 10 1, 20 20 2, 30 20 3)");
    });

    it("should convert a MULTIPOINT with ZM", () => {
        const input = {
            type: "MultiPoint",
            coordinates: [[30, 10, 1, 2], [20, 20, 3, 4], [30, 20, 5, 6]]
        };

        const output = Terraformer.WKT.convert(input);

        expect(output).to.be.equal("MULTIPOINT ZM (30 10 1 2, 20 20 3 4, 30 20 5 6)");
    });

    it("should convert a MULTIPOINT with M (nonstandard)", () => {
        const input = {
            properties: { m: true },
            type: "MultiPoint",
            coordinates: [[30, 10, 1], [20, 20, 2], [30, 20, 3]]
        };

        const output = Terraformer.WKT.convert(input);

        expect(output).to.be.equal("MULTIPOINT M (30 10 1, 20 20 2, 30 20 3)");
    });

    it("should convert an EMPTY MULTIPOINT", () => {
        const input = {
            type: "MultiPoint",
            coordinates: []
        };

        const output = Terraformer.WKT.convert(input);

        expect(output).to.be.equal("MULTIPOINT EMPTY");
    });

    it("should convert a LINESTRING with Z", () => {
        const input = {
            type: "LineString",
            coordinates: [[30, 10, 2], [20, 20, 1], [30, 20, 0]]
        };

        const output = Terraformer.WKT.convert(input);

        expect(output).to.be.equal("LINESTRING Z (30 10 2, 20 20 1, 30 20 0)");
    });

    it("should convert a LINESTRING with ZM", () => {
        const input = {
            type: "LineString",
            coordinates: [[30, 10, 1, 2], [20, 20, 3, 4], [30, 20, 5, 6]]
        };

        const output = Terraformer.WKT.convert(input);

        expect(output).to.be.equal("LINESTRING ZM (30 10 1 2, 20 20 3 4, 30 20 5 6)");
    });

    it("should convert a LINESTRING with M (nonstandard)", () => {
        const input = {
            properties: { m: true },
            type: "LineString",
            coordinates: [[30, 10, 1], [20, 20, 2], [30, 20, 3]]
        };

        const output = Terraformer.WKT.convert(input);

        expect(output).to.be.equal("LINESTRING M (30 10 1, 20 20 2, 30 20 3)");
    });

    it("should convert an EMPTY LINESTRING", () => {
        const input = {
            type: "LineString",
            coordinates: []
        };

        const output = Terraformer.WKT.convert(input);

        expect(output).to.be.equal("LINESTRING EMPTY");
    });

    it("should convert a LINESTRING", () => {
        const input = {
            type: "LineString",
            coordinates: [[30, 10], [20, 20], [30, 20]]
        };

        const output = Terraformer.WKT.convert(input);

        expect(output).to.be.equal("LINESTRING (30 10, 20 20, 30 20)");
    });

    it("should convert a MULTILINESTRING", () => {
        const input = {
            type: "MultiLineString",
            coordinates: [[[30, 10], [20, 20], [30, 20]]]
        };

        const output = Terraformer.WKT.convert(input);

        expect(output).to.be.equal("MULTILINESTRING ((30 10, 20 20, 30 20))");
    });

    it("should convert a MULTILINESTRING with Z", () => {
        const input = {
            type: "MultiLineString",
            coordinates: [[[30, 10, 1], [20, 20, 2], [30, 20, 3]]]
        };

        const output = Terraformer.WKT.convert(input);

        expect(output).to.be.equal("MULTILINESTRING Z ((30 10 1, 20 20 2, 30 20 3))");
    });

    it("should convert a MULTILINESTRING with Z and M", () => {
        const input = {
            type: "MultiLineString",
            coordinates: [[[30, 10, 1, 2], [20, 20, 3, 4], [30, 20, 5, 6]]]
        };

        const output = Terraformer.WKT.convert(input);

        expect(output).to.be.equal("MULTILINESTRING ZM ((30 10 1 2, 20 20 3 4, 30 20 5 6))");
    });

    it("should convert a MULTILINESTRING with M (nonstandard)", () => {
        const input = {
            properties: { m: true },
            type: "MultiLineString",
            coordinates: [[[30, 10, 1], [20, 20, 2], [30, 20, 3]]]
        };

        const output = Terraformer.WKT.convert(input);

        expect(output).to.be.equal("MULTILINESTRING M ((30 10 1, 20 20 2, 30 20 3))");
    });

    it("should convert an EMPTY MULTILINESTRING", () => {
        const input = {
            type: "MultiLineString",
            coordinates: []
        };

        const output = Terraformer.WKT.convert(input);

        expect(output).to.be.equal("MULTILINESTRING EMPTY");
    });

    it("should convert a MULTIPOLYGON", () => {
        const input = { type: "MultiPolygon",
            coordinates: [
                [[[102.0, 2.0], [103.0, 2.0], [103.0, 3.0], [102.0, 3.0], [102.0, 2.0]]],
                [[[100.0, 0.0], [101.0, 0.0], [101.0, 1.0], [100.0, 1.0], [100.0, 0.0]],
                    [[100.2, 0.2], [100.8, 0.2], [100.8, 0.8], [100.2, 0.8], [100.2, 0.2]]]
            ]
        };
        const output = Terraformer.WKT.convert(input);
        expect(output).to.be.equal("MULTIPOLYGON (((102 2, 103 2, 103 3, 102 3, 102 2)), ((100 0, 101 0, 101 1, 100 1, 100 0), (100.2 0.2, 100.8 0.2, 100.8 0.8, 100.2 0.8, 100.2 0.2)))");
    });

    it("should convert a MULTIPOLYGON with Z", () => {
        const input = { type: "MultiPolygon",
            coordinates: [
                [[[102.0, 2.0, 1], [103.0, 2.0, 2], [103.0, 3.0, 3], [102.0, 3.0, 4], [102.0, 2.0, 5]]],
                [[[100.0, 0.0], [101.0, 0.0], [101.0, 1.0], [100.0, 1.0], [100.0, 0.0]],
                    [[100.2, 0.2], [100.8, 0.2], [100.8, 0.8], [100.2, 0.8], [100.2, 0.2]]]
            ]
        };
        const output = Terraformer.WKT.convert(input);
        expect(output).to.be.equal("MULTIPOLYGON Z (((102 2 1, 103 2 2, 103 3 3, 102 3 4, 102 2 5)), ((100 0, 101 0, 101 1, 100 1, 100 0), (100.2 0.2, 100.8 0.2, 100.8 0.8, 100.2 0.8, 100.2 0.2)))");
    });

    it("should convert a MULTIPOLYGON with Z and M", () => {
        const input = { type: "MultiPolygon",
            coordinates: [
                [[[102.0, 2.0, 1, 2], [103.0, 2.0, 3, 4], [103.0, 3.0, 5, 6], [102.0, 3.0, 7, 8], [102.0, 2.0, 9, 10]]],
                [[[100.0, 0.0], [101.0, 0.0], [101.0, 1.0], [100.0, 1.0], [100.0, 0.0]],
                    [[100.2, 0.2], [100.8, 0.2], [100.8, 0.8], [100.2, 0.8], [100.2, 0.2]]]
            ]
        };
        const output = Terraformer.WKT.convert(input);
        expect(output).to.be.equal("MULTIPOLYGON ZM (((102 2 1 2, 103 2 3 4, 103 3 5 6, 102 3 7 8, 102 2 9 10)), ((100 0, 101 0, 101 1, 100 1, 100 0), (100.2 0.2, 100.8 0.2, 100.8 0.8, 100.2 0.8, 100.2 0.2)))");
    });

    it("should convert a MULTIPOLYGON with M (nonstandard)", () => {
        const input = { type: "MultiPolygon",
            properties: { m: true },
            coordinates: [
                [[[102.0, 2.0, 1], [103.0, 2.0, 2], [103.0, 3.0, 3], [102.0, 3.0, 4], [102.0, 2.0, 5]]],
                [[[100.0, 0.0], [101.0, 0.0], [101.0, 1.0], [100.0, 1.0], [100.0, 0.0]],
                    [[100.2, 0.2], [100.8, 0.2], [100.8, 0.8], [100.2, 0.8], [100.2, 0.2]]]
            ]
        };
        const output = Terraformer.WKT.convert(input);
        expect(output).to.be.equal("MULTIPOLYGON M (((102 2 1, 103 2 2, 103 3 3, 102 3 4, 102 2 5)), ((100 0, 101 0, 101 1, 100 1, 100 0), (100.2 0.2, 100.8 0.2, 100.8 0.8, 100.2 0.8, 100.2 0.2)))");
    });

    it("should convert an EMPTY MULTIPOLYGON", () => {
        const input = { type: "MultiPolygon",
            coordinates: []
        };
        const output = Terraformer.WKT.convert(input);
        expect(output).to.be.equal("MULTIPOLYGON EMPTY");
    });

    it("should convert a GEOMETRYCOLLECTION", () => {
        const input = {
            type: "GeometryCollection",
            geometries: [
                { type: "Point",
                    coordinates: [100.0, 0.0]
                },
                { type: "LineString",
                    coordinates: [[101.0, 0.0], [102.0, 1.0]]
                }
            ]
        };
        const output = Terraformer.WKT.convert(input);
        expect(output).to.be.equal("GEOMETRYCOLLECTION(POINT (100 0), LINESTRING (101 0, 102 1))");
    });

    it("should fail a conversion on an unknown type", () => {
        const input = { type: "MultiPolygonLikeThingy",
            coordinates: []
        };
        let error;
        try {
            const output = Terraformer.WKT.convert(input);
        } catch (err) {
            error = err.toString();
        }
        expect(error).to.be.equal("Error: Unknown Type: MultiPolygonLikeThingy");
    });

});


describe("WKT Parser", () => {

    it("should parse a POINT", () => {
        const input = "POINT (30 10)";
        const output = new Terraformer.WKT.parse(input);
        expect(output.coordinates).to.be.deep.equal([30, 10]);
        expect(output).to.be.instanceof(Terraformer.Point);
        expect(output.type).to.be.equal("Point");
    });

    it("should parse an EMPTY POINT", () => {
        const input = "POINT EMPTY";
        const output = new Terraformer.WKT.parse(input);
        expect(output.coordinates).to.be.deep.equal([]);
        expect(output).to.be.instanceof(Terraformer.Point);
        expect(output.type).to.be.equal("Point");
    });

    it("should parse a POINT with a Z coordinate", () => {
        const input = "POINT Z (30 10 20)";
        const output = new Terraformer.WKT.parse(input);
        expect(output.coordinates).to.be.deep.equal([30, 10, 20]);
        expect(output).to.be.instanceof(Terraformer.Point);
        expect(output.type).to.be.equal("Point");
    });

    it("should parse a POINT with a M coordinate", () => {
        const input = "POINT M (30 10 20)";
        const output = new Terraformer.WKT.parse(input);
        expect(output.coordinates).to.be.deep.equal([30, 10, 20]);
        expect(output).to.be.instanceof(Terraformer.Point);
        expect(output.type).to.be.equal("Point");
    });

    it("should parse a POINT with Z and M coordinates", () => {
        const input = "POINT ZM (30 10 20 15)";
        const output = new Terraformer.WKT.parse(input);
        expect(output.coordinates).to.be.deep.equal([30, 10, 20, 15]);
        expect(output).to.be.instanceof(Terraformer.Point);
        expect(output.type).to.be.equal("Point");
    });

    it("should parse a POINT with scientific notation coordinates", () => {
        const input = "POINT (30e0 10 2.0E+001 15)";
        const output = new Terraformer.WKT.parse(input);
        expect(output.coordinates).to.be.deep.equal([30, 10, 20, 15]);
        expect(output).to.be.instanceof(Terraformer.Point);
        expect(output.type).to.be.equal("Point");
    });

    it("should parse a LINESTRING", () => {
        const input = "LINESTRING (30 10, 10 30, 40 40)";
        const output = new Terraformer.WKT.parse(input);
        expect(output.coordinates).to.be.deep.equal([[30, 10], [10, 30], [40, 40]]);
        expect(output).to.be.instanceof(Terraformer.LineString);
        expect(output.type).to.be.equal("LineString");
    });

    it("should parse an EMPTY LINESTRING", () => {
        const input = "LINESTRING EMPTY";
        const output = new Terraformer.WKT.parse(input);
        expect(output.coordinates).to.be.deep.equal([]);
        expect(output).to.be.instanceof(Terraformer.LineString);
        expect(output.type).to.be.equal("LineString");
    });

    it("should parse a LINESTRING with a Z coordinate", () => {
        const input = "LINESTRING Z (30 10 5, 10 30 15, 40 40 25)";
        const output = new Terraformer.WKT.parse(input);
        expect(output.coordinates).to.be.deep.equal([[30, 10, 5], [10, 30, 15], [40, 40, 25]]);
        expect(output).to.be.instanceof(Terraformer.LineString);
        expect(output.type).to.be.equal("LineString");
    });

    it("should parse a LINESTRING with a M coordinate", () => {
        const input = "LINESTRING M (30 10 5, 10 30 15, 40 40 25)";
        const output = new Terraformer.WKT.parse(input);
        expect(output.coordinates).to.be.deep.equal([[30, 10, 5], [10, 30, 15], [40, 40, 25]]);
        expect(output).to.be.instanceof(Terraformer.LineString);
        expect(output.type).to.be.equal("LineString");
    });

    it("should parse a LINESTRING with Z and M coordinates", () => {
        const input = "LINESTRING ZM (30 10 5 2, 10 30 15 8, 40 40 25 16)";
        const output = new Terraformer.WKT.parse(input);
        expect(output.coordinates).to.be.deep.equal([[30, 10, 5, 2], [10, 30, 15, 8], [40, 40, 25, 16]]);
        expect(output).to.be.instanceof(Terraformer.LineString);
        expect(output.type).to.be.equal("LineString");
    });

    it("should parse a POLYGON", () => {
        const input = "POLYGON ((30 10, 10 20, 20 40, 40 40, 30 10))";
        const output = new Terraformer.WKT.parse(input);
        expect(output.coordinates).to.be.deep.equal([[[30, 10], [10, 20], [20, 40], [40, 40], [30, 10]]]);
        expect(output).to.be.instanceof(Terraformer.Polygon);
        expect(output.type).to.be.equal("Polygon");
    });

    it("should parse an EMPTY POLYGON", () => {
        const input = "POLYGON EMPTY";
        const output = new Terraformer.WKT.parse(input);
        expect(output.coordinates).to.be.deep.equal([]);
        expect(output).to.be.instanceof(Terraformer.Polygon);
        expect(output.type).to.be.equal("Polygon");
    });

    it("should parse a POLYGON with a Z coordinate", () => {
        const input = "POLYGON Z ((30 10 4, 10 20 6, 20 40 8, 40 40 1, 30 10 3))";
        const output = new Terraformer.WKT.parse(input);
        expect(output.coordinates).to.be.deep.equal([[[30, 10, 4], [10, 20, 6], [20, 40, 8], [40, 40, 1], [30, 10, 3]]]);
        expect(output).to.be.instanceof(Terraformer.Polygon);
        expect(output.type).to.be.equal("Polygon");
    });

    it("should parse a POLYGON with a M coordinate", () => {
        const input = "POLYGON M ((30 10 4, 10 20 6, 20 40 8, 40 40 1, 30 10 3))";
        const output = new Terraformer.WKT.parse(input);
        expect(output.coordinates).to.be.deep.equal([[[30, 10, 4], [10, 20, 6], [20, 40, 8], [40, 40, 1], [30, 10, 3]]]);
        expect(output).to.be.instanceof(Terraformer.Polygon);
        expect(output.type).to.be.equal("Polygon");
    });

    it("should parse a POLYGON with Z and M coordinates", () => {
        const input = "POLYGON ZM ((30 10 4 1, 10 20 6 3, 20 40 8 5, 40 40 1 7, 30 10 3 9))";
        const output = new Terraformer.WKT.parse(input);
        expect(output.coordinates).to.be.deep.equal([[[30, 10, 4, 1], [10, 20, 6, 3], [20, 40, 8, 5], [40, 40, 1, 7], [30, 10, 3, 9]]]);
        expect(output).to.be.instanceof(Terraformer.Polygon);
        expect(output.type).to.be.equal("Polygon");
    });

    it("should parse a POLYGON with a hole", () => {
        const input = "POLYGON ((35 10, 10 20, 15 40, 45 45, 35 10),(20 30, 35 35, 30 20, 20 30))";
        const output = new Terraformer.WKT.parse(input);
        expect(output.coordinates).to.be.deep.equal([
            [[35, 10], [10, 20], [15, 40], [45, 45], [35, 10]],
            [[20, 30], [35, 35], [30, 20], [20, 30]]
        ]);
        expect(output).to.be.instanceof(Terraformer.Polygon);
        expect(output.type).to.be.equal("Polygon");
    });

    it("should parse a MULTIPOINT", () => {
        const input = "MULTIPOINT ((10 40), (40 30), (20 20), (30 10))";
        const output = new Terraformer.WKT.parse(input);
        expect(output.coordinates).to.be.deep.equal([[10, 40], [40, 30], [20, 20], [30, 10]]);
        expect(output).to.be.instanceof(Terraformer.MultiPoint);
        expect(output.type).to.be.equal("MultiPoint");
    });

    it("should parse an EMPTY MULTIPOINT", () => {
        const input = "MULTIPOINT EMPTY";
        const output = new Terraformer.WKT.parse(input);
        expect(output.coordinates).to.be.deep.equal([]);
        expect(output).to.be.instanceof(Terraformer.MultiPoint);
        expect(output.type).to.be.equal("MultiPoint");
    });

    it("should parse a MULTIPOINT with a Z coordinate", () => {
        const input = "MULTIPOINT Z ((10 40 1), (40 30 2), (20 20 3), (30 10 4))";
        const output = new Terraformer.WKT.parse(input);
        expect(output.coordinates).to.be.deep.equal([[10, 40, 1], [40, 30, 2], [20, 20, 3], [30, 10, 4]]);
        expect(output).to.be.instanceof(Terraformer.MultiPoint);
        expect(output.type).to.be.equal("MultiPoint");
    });

    it("should parse a MULTIPOINT with a M coordinate", () => {
        const input = "MULTIPOINT M ((10 40 1), (40 30 2), (20 20 3), (30 10 4))";
        const output = new Terraformer.WKT.parse(input);
        expect(output.coordinates).to.be.deep.equal([[10, 40, 1], [40, 30, 2], [20, 20, 3], [30, 10, 4]]);
        expect(output).to.be.instanceof(Terraformer.MultiPoint);
        expect(output.type).to.be.equal("MultiPoint");
    });

    it("should parse a MULTIPOINT with Z and M coordinates", () => {
        const input = "MULTIPOINT ZM ((10 40 1 8), (40 30 2 9), (20 20 3 8), (30 10 4 9))";
        const output = new Terraformer.WKT.parse(input);
        expect(output.coordinates).to.be.deep.equal([[10, 40, 1, 8], [40, 30, 2, 9], [20, 20, 3, 8], [30, 10, 4, 9]]);
        expect(output).to.be.instanceof(Terraformer.MultiPoint);
        expect(output.type).to.be.equal("MultiPoint");
    });

    it("should parse a MULTIPOINT with alternate syntax", () => {
        const input = "MULTIPOINT (10 40, 40 30, 20 20, 30 10)";
        const output = new Terraformer.WKT.parse(input);
        expect(output.coordinates).to.be.deep.equal([[10, 40], [40, 30], [20, 20], [30, 10]]);
        expect(output).to.be.instanceof(Terraformer.MultiPoint);
        expect(output.type).to.be.equal("MultiPoint");
    });

    it("should parse a MULTIPOINT with alternate syntax and Z coordinates", () => {
        const input = "MULTIPOINT Z (10 40 1, 40 30 2, 20 20 3, 30 10 4)";
        const output = new Terraformer.WKT.parse(input);
        expect(output.coordinates).to.be.deep.equal([[10, 40, 1], [40, 30, 2], [20, 20, 3], [30, 10, 4]]);
        expect(output).to.be.instanceof(Terraformer.MultiPoint);
        expect(output.type).to.be.equal("MultiPoint");
    });

    it("should parse a MULTIPOINT with alternate syntax and M coordinates", () => {
        const input = "MULTIPOINT M (10 40 1, 40 30 2, 20 20 3, 30 10 4)";
        const output = new Terraformer.WKT.parse(input);
        expect(output.coordinates).to.be.deep.equal([[10, 40, 1], [40, 30, 2], [20, 20, 3], [30, 10, 4]]);
        expect(output).to.be.instanceof(Terraformer.MultiPoint);
        expect(output.type).to.be.equal("MultiPoint");
    });

    it("should parse a MULTIPOINT with alternate syntax and Z and M coordinates", () => {
        const input = "MULTIPOINT ZM (10 40 1 2, 40 30 2 3, 20 20 3 4, 30 10 4 5)";
        const output = new Terraformer.WKT.parse(input);
        expect(output.coordinates).to.be.deep.equal([[10, 40, 1, 2], [40, 30, 2, 3], [20, 20, 3, 4], [30, 10, 4, 5]]);
        expect(output).to.be.instanceof(Terraformer.MultiPoint);
        expect(output.type).to.be.equal("MultiPoint");
    });

    it("should parse a MULTILINESTRING with alternate syntax", () => {
        const input = "MULTILINESTRING ((10 10, 20 20, 10 40),(40 40, 30 30, 40 20, 30 10))";
        const output = new Terraformer.WKT.parse(input);
        expect(output.coordinates).to.be.deep.equal([
            [[10, 10], [20, 20], [10, 40]],
            [[40, 40], [30, 30], [40, 20], [30, 10]]
        ]);
        expect(output).to.be.instanceof(Terraformer.MultiLineString);
        expect(output.type).to.be.equal("MultiLineString");
    });

    it("should parse an EMPTY MULTILINESTRING", () => {
        const input = "MULTILINESTRING EMPTY";
        const output = new Terraformer.WKT.parse(input);
        expect(output.coordinates).to.be.deep.equal([]);
        expect(output).to.be.instanceof(Terraformer.MultiLineString);
        expect(output.type).to.be.equal("MultiLineString");
    });

    it("should parse a MULTILINESTRING with alternate syntax and Z coordinates", () => {
        const input = "MULTILINESTRING Z ((10 10 10, 20 20 20, 10 40 30),(40 40 30, 30 30 20, 40 20 10, 30 10 10))";
        const output = new Terraformer.WKT.parse(input);
        expect(output.coordinates).to.be.deep.equal([
            [[10, 10, 10], [20, 20, 20], [10, 40, 30]],
            [[40, 40, 30], [30, 30, 20], [40, 20, 10], [30, 10, 10]]
        ]);
        expect(output).to.be.instanceof(Terraformer.MultiLineString);
        expect(output.type).to.be.equal("MultiLineString");
    });

    it("should parse a MULTILINESTRING with alternate syntax and M coordinates", () => {
        const input = "MULTILINESTRING M ((10 10 10, 20 20 20, 10 40 30),(40 40 30, 30 30 20, 40 20 10, 30 10 10))";
        const output = new Terraformer.WKT.parse(input);
        expect(output.coordinates).to.be.deep.equal([
            [[10, 10, 10], [20, 20, 20], [10, 40, 30]],
            [[40, 40, 30], [30, 30, 20], [40, 20, 10], [30, 10, 10]]
        ]);
        expect(output).to.be.instanceof(Terraformer.MultiLineString);
        expect(output.type).to.be.equal("MultiLineString");
    });

    it("should parse a MULTILINESTRING with alternate syntax and Z and M coordinates", () => {
        const input = "MULTILINESTRING ZM ((10 10 10 5, 20 20 20 4, 10 40 30 3),(40 40 30 2, 30 30 20 1, 40 20 10 2, 30 10 10 3))";
        const output = new Terraformer.WKT.parse(input);
        expect(output.coordinates).to.be.deep.equal([
            [[10, 10, 10, 5], [20, 20, 20, 4], [10, 40, 30, 3]],
            [[40, 40, 30, 2], [30, 30, 20, 1], [40, 20, 10, 2], [30, 10, 10, 3]]
        ]);
        expect(output).to.be.instanceof(Terraformer.MultiLineString);
        expect(output.type).to.be.equal("MultiLineString");
    });

    it("should parse a MULTIPOLYGON", () => {
        const input = "MULTIPOLYGON (((30 20, 10 40, 45 40, 30 20)),((15 5, 40 10, 10 20, 5 10, 15 5)))";
        const output = new Terraformer.WKT.parse(input);
        expect(output.coordinates).to.be.deep.equal([
            [
                [[30, 20], [10, 40], [45, 40], [30, 20]]
            ],
            [
                [[15, 5], [40, 10], [10, 20], [5, 10], [15, 5]]
            ]
        ]);
        expect(output).to.be.instanceof(Terraformer.MultiPolygon);
        expect(output.type).to.be.equal("MultiPolygon");
    });

    it("should parse an EMPTY MULTIPOLYGON", () => {
        const input = "MULTIPOLYGON EMPTY";
        const output = new Terraformer.WKT.parse(input);
        expect(output.coordinates).to.be.deep.equal([]);
        expect(output).to.be.instanceof(Terraformer.MultiPolygon);
        expect(output.type).to.be.equal("MultiPolygon");
    });

    it("should parse a MULTIPOLYGON with a Z coordinate", () => {
        const input = "MULTIPOLYGON Z (((30 20 1, 10 40 2, 45 40 3, 30 20 4)),((15 5, 40 10, 10 20, 5 10, 15 5)))";
        const output = new Terraformer.WKT.parse(input);
        expect(output.coordinates).to.be.deep.equal([
            [
                [[30, 20, 1], [10, 40, 2], [45, 40, 3], [30, 20, 4]]
            ],
            [
                [[15, 5], [40, 10], [10, 20], [5, 10], [15, 5]]
            ]
        ]);
        expect(output).to.be.instanceof(Terraformer.MultiPolygon);
        expect(output.type).to.be.equal("MultiPolygon");
    });

    it("should parse a MULTIPOLYGON with a M coordinate", () => {
        const input = "MULTIPOLYGON M (((30 20 1, 10 40 2, 45 40 3, 30 20 4)),((15 5, 40 10, 10 20, 5 10, 15 5)))";
        const output = new Terraformer.WKT.parse(input);
        expect(output.coordinates).to.be.deep.equal([
            [
                [[30, 20, 1], [10, 40, 2], [45, 40, 3], [30, 20, 4]]
            ],
            [
                [[15, 5], [40, 10], [10, 20], [5, 10], [15, 5]]
            ]
        ]);
        expect(output).to.be.instanceof(Terraformer.MultiPolygon);
        expect(output.type).to.be.equal("MultiPolygon");
    });

    it("should parse a MULTIPOLYGON with Z and M coordinates", () => {
        const input = "MULTIPOLYGON ZM (((30 20 1 0, 10 40 2 1, 45 40 3 2, 30 20 4 3)),((15 5, 40 10, 10 20, 5 10, 15 5)))";
        const output = new Terraformer.WKT.parse(input);
        expect(output.coordinates).to.be.deep.equal([
            [
                [[30, 20, 1, 0], [10, 40, 2, 1], [45, 40, 3, 2], [30, 20, 4, 3]]
            ],
            [
                [[15, 5], [40, 10], [10, 20], [5, 10], [15, 5]]
            ]
        ]);
        expect(output).to.be.instanceof(Terraformer.MultiPolygon);
        expect(output.type).to.be.equal("MultiPolygon");
    });

    it("should parse a MULTIPOLYGON with a hole", () => {
        const input = "MULTIPOLYGON (((40 40, 20 45, 45 30, 40 40)),((20 35, 45 20, 30 5, 10 10, 10 30, 20 35),(30 20, 20 25, 20 15, 30 20)))";
        const output = new Terraformer.WKT.parse(input);
        expect(output.coordinates).to.be.deep.equal([
            [
                [[40, 40], [20, 45], [45, 30], [40, 40]]
            ],
            [
                [[20, 35], [45, 20], [30, 5], [10, 10], [10, 30], [20, 35]],
                [[30, 20], [20, 25], [20, 15], [30, 20]]
            ]
        ]);
        expect(output).to.be.instanceof(Terraformer.MultiPolygon);
        expect(output.type).to.be.equal("MultiPolygon");
    });
});
