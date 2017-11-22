const Terraformer = adone.util.terraformer;

describe("Spatial Reference Converters", () => {
    it("should convert a GeoJSON Point to Web Mercator", () => {
        const input = {
            type: "Point",
            coordinates: [-122, 45]
        };
        const expectedOutput = {
            type: "Point",
            coordinates: [-13580977.876779145, 5621521.486191948],
            crs: {
                type: "link",
                properties: {
                    href: "http://spatialreference.org/ref/sr-org/6928/ogcwkt/",
                    type: "ogcwkt"
                }
            }
        };
        const output = Terraformer.toMercator(input);
        expect(output).to.be.deep.equal(expectedOutput);
    });

    it("should convert a GeoJSON MultiPoint to Web Mercator", () => {
        const input = {
            type: "MultiPoint",
            coordinates: [[-122, 45], [100, 0], [45, 62]]
        };
        const expectedOutput = {
            type: "MultiPoint",
            coordinates: [[-13580977.876779145, 5621521.486191948], [11131949.079327168, 0], [5009377.085697226, 8859142.800565446]],
            crs: {
                type: "link",
                properties: {
                    href: "http://spatialreference.org/ref/sr-org/6928/ogcwkt/",
                    type: "ogcwkt"
                }
            }
        };
        const output = Terraformer.toMercator(input);
        // expect(output).to.be.equal(expectedOutput);
        expect(output.type).to.be.equal(expectedOutput.type);
        expect(output.crs).to.be.deep.equal(expectedOutput.crs);
        expect(output.coordinates[0][0]).to.be.closeTo(expectedOutput.coordinates[0][0], 9);
        expect(output.coordinates[0][1]).to.be.closeTo(expectedOutput.coordinates[0][1], 9);
        expect(output.coordinates[1][0]).to.be.closeTo(expectedOutput.coordinates[1][0], 9);
        expect(output.coordinates[1][1]).to.be.closeTo(expectedOutput.coordinates[1][1], 9);
    });

    it("should convert a GeoJSON LineString to Web Mercator", () => {
        const input = {
            type: "LineString",
            coordinates: [[-122, 45], [100, 0], [45, 62]]
        };
        const expectedOutput = {
            type: "LineString",
            coordinates: [[-13580977.876779145, 5621521.486191948], [11131949.079327168, 0], [5009377.085697226, 8859142.800565446]],
            crs: {
                type: "link",
                properties: {
                    href: "http://spatialreference.org/ref/sr-org/6928/ogcwkt/",
                    type: "ogcwkt"
                }
            }
        };
        const output = Terraformer.toMercator(input);
        expect(output).to.be.deep.equal(expectedOutput);
    });

    it("should convert a GeoJSON MultiLineString to Web Mercator", () => {
        const input = {
            type: "MultiLineString",
            coordinates: [
                [[41.8359375, 71.015625], [56.953125, 33.75]],
                [[21.796875, 36.5625], [47.8359375, 71.015625]]
            ]
        };
        const expectedOutput = {
            type: "MultiLineString",
            coordinates: [
                [[4657155.25935914, 11407616.835043576], [6339992.874085551, 3995282.329624162]],
                [[2426417.025884594, 4378299.115616046], [5325072.20411877, 11407616.835043576]]
            ],
            crs: {
                type: "link",
                properties: {
                    href: "http://spatialreference.org/ref/sr-org/6928/ogcwkt/",
                    type: "ogcwkt"
                }
            }
        };
        const output = Terraformer.toMercator(input);
        expect(output).to.be.deep.equal(expectedOutput);
    });

    it("should convert a GeoJSON Polygon to Web Mercator", () => {
        const input = {
            type: "Polygon",
            coordinates: [
                [[41.8359375, 71.015625], [56.953125, 33.75], [21.796875, 36.5625], [41.8359375, 71.015625]]
            ]
        };
        const expectedOutput = {
            type: "Polygon",
            coordinates: [
                [[4657155.25935914, 11407616.835043576], [6339992.874085551, 3995282.329624162], [2426417.025884594, 4378299.115616046], [4657155.25935914, 11407616.835043576]]
            ],
            crs: {
                type: "link",
                properties: {
                    href: "http://spatialreference.org/ref/sr-org/6928/ogcwkt/",
                    type: "ogcwkt"
                }
            }
        };
        const output = Terraformer.toMercator(input);
        expect(output).to.be.deep.equal(expectedOutput);
    });

    it("should convert a GeoJSON MultiPolygon to Web Mercator", () => {
        const input = {
            type: "MultiPolygon",
            coordinates: [
                [
                    [[102.0, 2.0], [103.0, 2.0], [103.0, 3.0], [102.0, 3.0], [102.0, 2.0]]
                ],
                [
                    [[100.0, 0.0], [101.0, 0.0], [101.0, 1.0], [100.0, 1.0], [100.0, 0.0]]
                ]
            ]
        };

        const expectedOutput = {
            type: "MultiPolygon",
            coordinates: [
                [
                    [[11354588.060913712, 222684.20850554065], [11465907.551706985, 222684.20850554065], [11465907.551706985, 334111.1714019535], [11354588.060913712, 334111.1714019535], [11354588.060913712, 222684.20850554065]]
                ],
                [
                    [[11131949.079327168, 0], [11243268.57012044, 0], [11243268.57012044, 111325.1428663833], [11131949.079327168, 111325.1428663833], [11131949.079327168, 0]]
                ]
            ],
            crs: {
                type: "link",
                properties: {
                    href: "http://spatialreference.org/ref/sr-org/6928/ogcwkt/",
                    type: "ogcwkt"
                }
            }
        };
        const output = Terraformer.toMercator(input);
        expect(output.type).to.be.equal(expectedOutput.type);
        expect(output.crs).to.be.deep.equal(expectedOutput.crs);
        for (let i = 0; i < output.coordinates[0].length; i++) {
            const segments = output.coordinates[0][i];
            for (let j = 0; j < segments.length; j++) {
                expect(segments[j][0]).to.be.closeTo(expectedOutput.coordinates[0][i][j][0], 9);
                expect(segments[j][1]).to.be.closeTo(expectedOutput.coordinates[0][i][j][1], 9);
            }
        }
    });

    it("should convert a GeoJSON Feature to Web Mercator", () => {
        const input = {
            type: "Feature",
            id: "foo",
            geometry: {
                type: "Point",
                coordinates: [-122, 45]
            },
            properties: {
                bar: "baz"
            }
        };
        const expectedOutput = {
            type: "Feature",
            id: "foo",
            geometry: {
                type: "Point",
                coordinates: [-13580977.876779145, 5621521.486191948]
            },
            properties: {
                bar: "baz"
            },
            crs: {
                type: "link",
                properties: {
                    href: "http://spatialreference.org/ref/sr-org/6928/ogcwkt/",
                    type: "ogcwkt"
                }
            }
        };
        const output = Terraformer.toMercator(input);
        expect(output).to.be.deep.equal(expectedOutput);
    });

    it("should convert a GeoJSON Feature Collection to Web Mercator", () => {
        const input = {
            type: "FeatureCollection",
            features: [
                {
                    type: "Feature",
                    id: "foo",
                    geometry: {
                        type: "Point",
                        coordinates: [-122, 45]
                    },
                    properties: {
                        bar: "baz"
                    }
                }, {
                    type: "Feature",
                    id: "bar",
                    geometry: {
                        type: "Point",
                        coordinates: [-122, 45]
                    },
                    properties: {
                        bar: "baz"
                    }
                }
            ]
        };
        const expectedOutput = {
            type: "FeatureCollection",
            features: [
                {
                    type: "Feature",
                    id: "foo",
                    geometry: {
                        type: "Point",
                        coordinates: [-13580977.876779145, 5621521.486191948]
                    },
                    properties: {
                        bar: "baz"
                    }
                }, {
                    type: "Feature",
                    id: "bar",
                    geometry: {
                        type: "Point",
                        coordinates: [-13580977.876779145, 5621521.486191948]
                    },
                    properties: {
                        bar: "baz"
                    }
                }
            ],
            crs: {
                type: "link",
                properties: {
                    href: "http://spatialreference.org/ref/sr-org/6928/ogcwkt/",
                    type: "ogcwkt"
                }
            }
        };
        const output = Terraformer.toMercator(input);
        expect(output).to.be.deep.equal(expectedOutput);
    });

    it("should convert a GeoJSON Geometry Collection to Web Mercator", () => {
        const input = {
            type: "GeometryCollection",
            geometries: [
                {
                    type: "Point",
                    coordinates: [-122, 45]
                }, {
                    type: "Point",
                    coordinates: [-122, 45]
                }
            ]
        };
        const expectedOutput = {
            type: "GeometryCollection",
            geometries: [
                {
                    type: "Point",
                    coordinates: [-13580977.876779145, 5621521.486191948]
                }, {
                    type: "Point",
                    coordinates: [-13580977.876779145, 5621521.486191948]
                }
            ],
            crs: {
                type: "link",
                properties: {
                    href: "http://spatialreference.org/ref/sr-org/6928/ogcwkt/",
                    type: "ogcwkt"
                }
            }
        };
        const output = Terraformer.toMercator(input);
        expect(output).to.be.deep.equal(expectedOutput);
    });

    it("should convert a GeoJSON Point to Geographic coordinates", () => {
        const input = {
            type: "Point",
            coordinates: [-13656274.38035172, 5703203.67194997]
        };
        const expectedOutput = {
            type: "Point",
            coordinates: [-122.67639999999798, 45.516499999999255]
        };
        const output = Terraformer.toGeographic(input);
        expect(output).to.be.deep.equal(expectedOutput);
    });

    it("should convert a GeoJSON MultiPoint to Geographic coordinates", () => {
        const input = {
            type: "MultiPoint",
            coordinates: [[-13656274.380351715, 5703203.671949966], [11131949.079327168, 0], [-13619241.057432571, 6261718.09354067]]
        };
        const expectedOutput = {
            type: "MultiPoint",
            coordinates: [[-122.67639999999793, 45.51649999999922], [99.99999999999831, 0], [-122.34372399999793, 48.92247999999917]]
        };
        const output = Terraformer.toGeographic(input);

        expect(expectedOutput.coordinates[0][0]).to.be.closeTo(-122.6764000000, 10);
        expect(expectedOutput.coordinates[0][1]).to.be.closeTo(45.5165000000, 10);
        expect(expectedOutput.coordinates[1][0]).to.be.closeTo(100.0000000000, 10);
        expect(expectedOutput.coordinates[1][1]).to.be.closeTo(0.0000000000, 10);
        expect(expectedOutput.coordinates[2][0]).to.be.closeTo(-122.3437240000, 10);
        expect(expectedOutput.coordinates[2][1]).to.be.closeTo(48.9224800000, 10);
    });

    it("should convert a GeoJSON LineString to Geographic coordinates", () => {
        const input = {
            type: "LineString",
            coordinates: [[743579.411158182, 6075718.008992066], [-7279251.077653782, 6869641.046935855], [-5831228.013819427, 5242073.5675988225]]
        };
        const expectedOutput = {
            type: "LineString",
            coordinates: [[6.679687499999886, 47.8124999999992], [-65.3906249999989, 52.38281249999912], [-52.38281249999912, 42.539062499999275]]
        };
        const output = Terraformer.toGeographic(input);

        expect(expectedOutput.coordinates[0][0]).to.be.closeTo(6.6796875000, 10);
        expect(expectedOutput.coordinates[0][1]).to.be.closeTo(47.8125000000, 10);
        expect(expectedOutput.coordinates[1][0]).to.be.closeTo(-65.3906250000, 10);
        expect(expectedOutput.coordinates[1][1]).to.be.closeTo(52.3828125000, 10);
        expect(expectedOutput.coordinates[2][0]).to.be.closeTo(-52.3828125000, 10);
        expect(expectedOutput.coordinates[2][1]).to.be.closeTo(42.5390625000, 10);
    });

    it("should convert a GeoJSON MultiLineString to Geographic coordinates", () => {
        const input = {
            type: "MultiLineString",
            coordinates: [
                [[41.8359375, 71.015625], [56.953125, 33.75]],
                [[21.796875, 36.5625], [47.8359375, 71.015625]]
            ]
        };
        const expectedOutput = {
            type: "MultiLineString",
            coordinates: [
                [[0.00037581862081719045, 0.0006379442134689308], [0.0005116186266586962, 0.00030318140838354136]], [[0.00019580465958542694, 0.00032844652575519755], [0.0004297175378643617, 0.0006379442134689308]]
            ]
        };
        const output = Terraformer.toGeographic(input);
        expect(output).to.be.deep.equal(expectedOutput);
    });

    it("should convert a GeoJSON Polygon to Geographic coordinates", () => {
        const input = {
            type: "Polygon",
            coordinates: [
                [[41.8359375, 71.015625], [56.953125, 33.75], [21.796875, 36.5625], [41.8359375, 71.015625]]
            ]
        };
        const expectedOutput = {
            type: "Polygon",
            coordinates: [
                [[0.00037581862081719045, 0.0006379442134689308], [0.0005116186266586962, 0.00030318140838354136], [0.00019580465958542694, 0.00032844652575519755], [0.00037581862081719045, 0.0006379442134689308]]
            ]
        };
        const output = Terraformer.toGeographic(input);
        expect(output).to.be.deep.equal(expectedOutput);
    });

    it("should convert a GeoJSON MultiPolygon to Geographic coordinates", () => {
        const input = {
            type: "MultiPolygon",
            coordinates: [
                [
                    [[102.0, 2.0], [103.0, 2.0], [103.0, 3.0], [102.0, 3.0], [102.0, 2.0]]
                ],
                [
                    [[100.0, 0.0], [101.0, 0.0], [101.0, 1.0], [100.0, 1.0], [100.0, 0.0]]
                ]
            ]
        };

        const expectedOutput = {
            type: "MultiPolygon",
            coordinates: [
                [
                    [[0.000916281589801912, 0.000017966305681987637], [0.0009252647426431071, 0.000017966305681987637], [0.0009252647426431071, 0.000026949458522981454], [0.000916281589801912, 0.000026949458522981454], [0.000916281589801912, 0.000017966305681987637]]
                ],
                [
                    [[0.0008983152841195215, 0], [0.0009072984369607167, 0], [0.0009072984369607167, 0.000008983152840993819], [0.0008983152841195215, 0.000008983152840993819], [0.0008983152841195215, 0]]
                ]
            ]
        };
        const output = Terraformer.toGeographic(input);
        expect(output).to.be.deep.equal(expectedOutput);
    });

    it("should convert a GeoJSON Feature to Geographic coordinates", () => {
        const input = {
            type: "Feature",
            id: "foo",
            geometry: {
                type: "Point",
                coordinates: [-13656274.380351715, 5703203.671949966]
            },
            properties: {
                bar: "baz"
            }
        };
        const expectedOutput = {
            type: "Feature",
            id: "foo",
            geometry: {
                type: "Point",
                coordinates: [-122.67639999999793, 45.51649999999923]
            },
            properties: {
                bar: "baz"
            }
        };
        const output = Terraformer.toGeographic(input);

        expect(expectedOutput.geometry.coordinates[0]).to.be.closeTo(-122.6764000000, 10);
        expect(expectedOutput.geometry.coordinates[1]).to.be.closeTo(45.5165000000, 10);
    });

    it("should convert a GeoJSON Feature Collection to Geographic coordinates", () => {
        const input = {
            type: "FeatureCollection",
            features: [
                {
                    type: "Feature",
                    id: "foo",
                    geometry: {
                        type: "Point",
                        coordinates: [-13656274.380351715, 5703203.671949966]
                    },
                    properties: {
                        bar: "baz"
                    }
                }, {
                    type: "Feature",
                    id: "bar",
                    geometry: {
                        type: "Point",
                        coordinates: [-13656274.380351715, 5703203.671949966]
                    },
                    properties: {
                        bar: "baz"
                    }
                }
            ]
        };
        const expectedOutput = {
            type: "FeatureCollection",
            features: [
                {
                    type: "Feature",
                    id: "foo",
                    geometry: {
                        type: "Point",
                        coordinates: [-122.67639999999793, 45.51649999999923]
                    },
                    properties: {
                        bar: "baz"
                    }
                }, {
                    type: "Feature",
                    id: "bar",
                    geometry: {
                        type: "Point",
                        coordinates: [-122.67639999999793, 45.51649999999923]
                    },
                    properties: {
                        bar: "baz"
                    }
                }
            ]
        };
        const output = Terraformer.toGeographic(input);

        expect(expectedOutput.features[0].geometry.coordinates[0]).to.be.closeTo(-122.6764000000, 10);
        expect(expectedOutput.features[0].geometry.coordinates[1]).to.be.closeTo(45.5165000000, 10);

        expect(expectedOutput.features[1].geometry.coordinates[0]).to.be.closeTo(-122.6764000000, 10);
        expect(expectedOutput.features[1].geometry.coordinates[1]).to.be.closeTo(45.5165000000, 10);
    });

    it("should convert a GeoJSON Geometry Collection to Geographic coordinates", () => {
        const input = {
            type: "GeometryCollection",
            geometries: [
                {
                    type: "Point",
                    coordinates: [-13656274.380351715, 5703203.671949966]
                }, {
                    type: "Point",
                    coordinates: [-13656274.380351715, 5703203.671949966]
                }
            ]
        };
        const expectedOutput = {
            type: "GeometryCollection",
            geometries: [
                {
                    type: "Point",
                    coordinates: [-122.67639999999793, 45.51649999999923]
                }, {
                    type: "Point",
                    coordinates: [-122.67639999999793, 45.51649999999923]
                }
            ]
        };
        const output = Terraformer.toGeographic(input);

        expect(expectedOutput.geometries[0].coordinates[0]).to.be.closeTo(-122.6764000000, 10);
        expect(expectedOutput.geometries[0].coordinates[1]).to.be.closeTo(45.5165000000, 10);

        expect(expectedOutput.geometries[1].coordinates[0]).to.be.closeTo(-122.6764000000, 10);
        expect(expectedOutput.geometries[1].coordinates[1]).to.be.closeTo(45.5165000000, 10);
    });
});
