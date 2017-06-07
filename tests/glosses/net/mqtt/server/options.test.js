const { options } = adone.net.mqtt.server;

const legacyKeys = [
    "port",
    "secure",
    "http",
    "https",
    "allowNonSecure",
    "onlyHttp"
];

const deeplegacy = {
    port: 1883,
    host: null,
    secure: {
        port: 8883,
        keyPath: "path/to/key",
        certPath: "path/to/cert"
    },
    http: {
        port: 3000,
        bundle: true,
        static: "path/to/static"
    },
    https: {
        port: 3001,
        bundle: true,
        static: "path/to/static"
    },
    allowNonSecure: false,
    onlyHttp: false
};

describe("mocha.options", () => {

    describe("modern defaults", () => {

        it("should not contain legacy keys", () => {
            const modern = options.defaultsModern();

            legacyKeys.forEach((key) => {
                expect(modern).to.not.have.property(key);
            });
        });

        it("should contain fallback host", () => {
            const modern = options.defaultsModern();

            expect(modern).to.have.property("host");
            expect(modern.host).to.be.equal(null);
        });

        it("should contain single mqtt interface", () => {
            const modern = options.defaultsModern();

            expect(modern).to.have.property("interfaces");
            expect(modern.interfaces).to.be.deep.equal(
                [
                    { type: "mqtt", port: 1883, maxConnections: 10000000 }
                ]
            );
        });

        it("should not contain credentials", () => {
            const modern = options.defaultsModern();
            expect(modern).to.not.have.property("credentials");
        });

    });

    describe("modernize", () => {

        it("should not try to change passed options", () => {
            const legacy = options.defaultsLegacy(); // necessary
            Object.freeze(legacy);

            const fn = function () {
                const modern = options.modernize(legacy);
            };
            expect(fn).to.not.throw(TypeError);
        });

        it("should correctly modernize legacy defaults", () => {
            const legacy = options.defaultsLegacy();
            const modern = options.defaultsModern();
            const modernized = options.modernize(legacy);

            expect(modernized).to.be.deep.equal(modern);
        });

        it("should change {} into a signle mqtt interface", () => {
            const legacy = {};
            const modernized = options.modernize(legacy);

            expect(modernized).to.be.deep.equal({
                interfaces: [
                    { type: "mqtt" }
                ]
            });
        });

        it("should not change modern defaults", () => {
            const modern = options.defaultsModern();
            const modernized = options.modernize(modern);

            expect(modernized).to.be.deep.equal(modern);
        });

        it("should remove legacy parameters", () => {
            const modernized = options.modernize(deeplegacy);

            legacyKeys.forEach((key) => {
                expect(modernized).to.not.have.property(key);
            });
        });

        it("should not override or affect defined `interfaces`", () => {
            const legacy = {
                interfaces: []
            };

            const modernized = options.modernize(legacy);

            expect(modernized).to.have.property("interfaces");
            expect(modernized.interfaces).to.be.deep.equal([]);
        });

        it("should not override or affect defined `credentials`", () => {
            const legacy = {
                secure: {
                    keyPath: "legacy/path",
                    certPath: "legacy/path"
                },
                credentials: {
                    keyPath: "modern/path",
                    certPath: "modern/path"
                }
            };

            const modernized = options.modernize(legacy);

            expect(modernized).to.not.have.property("secure");
            expect(modernized).to.have.property("credentials");
            expect(modernized.credentials).to.be.deep.equal({
                keyPath: "modern/path",
                certPath: "modern/path"
            });
        });

        it("should not break custom interface type", () => {
            const factory = function () { }; // mock

            const legacy = {
                host: "localhost",
                interfaces: [
                    { type: factory, port: 1234 }
                ]
            };

            const modernized = options.modernize(legacy);

            expect(modernized).to.have.property("interfaces");
            expect(modernized.interfaces).to.be.deep.equal([
                { type: factory, port: 1234 }
            ]);
        });

        it("should not override custom host, ports and credentials", () => {
            const credentials = {
                keyPath: "path/to/key",
                certPath: "path/to/cert"
            };

            const modern = {
                host: "localhost",
                interfaces: [
                    { type: "mqtt", host: "::", port: 8080, credentials },
                    { type: "mqtts", host: "[::]", port: 8081, credentials },
                    { type: "http", host: "127.0.0.1", port: 8082, credentials },
                    { type: "https", host: "0.0.0.0", port: 8083, credentials }
                ]
            };

            const populated = options.modernize(modern);

            expect(populated).to.have.property("interfaces");
            expect(populated.interfaces).to.be.deep.equal([
                { type: "mqtt", host: "::", port: 8080, credentials },
                { type: "mqtts", host: "[::]", port: 8081, credentials },
                { type: "http", host: "127.0.0.1", port: 8082, credentials },
                { type: "https", host: "0.0.0.0", port: 8083, credentials }
            ]);
        });

        describe("sample configurations", () => {

            it("should correctly modernize mqtt configuration", () => {
                const legacy = {
                    port: 1883,
                    host: "localhost"
                };
                const modernized = options.modernize(legacy);
                const result = options.validate(modernized);
                expect(result.errors).to.be.deep.equal([]);

                expect(modernized).to.have.property("host");
                expect(modernized.host).to.be.equal("localhost");

                expect(modernized).to.not.have.property("port");
                expect(modernized).to.have.property("interfaces");
                expect(modernized.interfaces).to.be.deep.equal([
                    { type: "mqtt", port: 1883 } // port was specified
                ]);
            });

            it("should correctly modernize mqtts configuration", () => {
                const credentials = {
                    keyPath: "path/to/key",
                    certPath: "path/to/cert"
                };

                const legacy = {
                    host: "127.0.0.1",
                    secure: {
                        port: 8883,
                        keyPath: "path/to/key",
                        certPath: "path/to/cert"
                    }
                };

                const modernized = options.modernize(legacy);
                const result = options.validate(modernized);
                expect(result.errors).to.be.deep.equal([]);

                expect(modernized).to.have.property("host");
                expect(modernized.host).to.be.equal("127.0.0.1");

                expect(modernized).to.not.have.property("secure");
                expect(modernized).to.have.property("credentials");
                expect(modernized.credentials).to.be.deep.equal(credentials);

                expect(modernized).to.have.property("interfaces");
                expect(modernized.interfaces).to.be.deep.equal([
                    { type: "mqtts", port: 8883 } // port was specified
                ]);
            });

            it("should correctly modernize mqtt+mqtts configuration", () => {
                const credentials = {
                    keyPath: "path/to/key",
                    certPath: "path/to/cert"
                };

                const legacy = {
                    host: "localhost",
                    secure: {
                        port: 8883,
                        keyPath: "path/to/key",
                        certPath: "path/to/cert"
                    },
                    allowNonSecure: true
                };

                const modernized = options.modernize(legacy);
                const result = options.validate(modernized);
                expect(result.errors).to.be.deep.equal([]);

                expect(modernized).to.have.property("host");
                expect(modernized.host).to.be.equal("localhost");

                expect(modernized).to.not.have.property("secure");
                expect(modernized).to.have.property("credentials");
                expect(modernized.credentials).to.be.deep.equal(credentials);

                expect(modernized).to.have.property("interfaces");
                expect(modernized.interfaces).to.be.deep.equal([
                    { type: "mqtt" }, // port was not specified
                    { type: "mqtts", port: 8883 } // port was specified
                ]);
            });

            it("should correctly modernize mqtt+http configuration", () => {
                const legacy = {
                    host: "localhost",
                    http: {
                        port: 8000,
                        bundle: true,
                        static: "path/to/static"
                    }
                };

                const modernized = options.modernize(legacy);
                const result = options.validate(modernized);
                expect(result.errors).to.be.deep.equal([]);

                expect(modernized).to.have.property("host");
                expect(modernized.host).to.be.equal("localhost");

                expect(modernized).to.not.have.property("http");

                expect(modernized).to.have.property("interfaces");
                expect(modernized.interfaces).to.be.deep.equal([
                    { type: "mqtt" }, // port was not specified
                    {
                        type: "http", // port was specified
                        port: 8000,
                        bundle: true,
                        static: "path/to/static"
                    }
                ]);
            });

            it("should correctly modernize mqtts+https configuration", () => {
                const credentials = {
                    keyPath: "path/to/key",
                    certPath: "path/to/cert"
                };

                const legacy = {
                    host: "localhost",
                    secure: {
                        port: 9000,
                        keyPath: "path/to/key",
                        certPath: "path/to/cert"
                    },
                    https: {
                        port: 8001,
                        bundle: true,
                        static: "path/to/static"
                    }
                };

                const modernized = options.modernize(legacy);
                const result = options.validate(modernized);
                expect(result.errors).to.be.deep.equal([]);

                expect(modernized).to.have.property("host");
                expect(modernized.host).to.be.equal("localhost");

                expect(modernized).to.not.have.property("secure");
                expect(modernized).to.have.property("credentials");
                expect(modernized.credentials).to.be.deep.equal(credentials);

                expect(modernized).to.not.have.property("https");

                expect(modernized).to.have.property("interfaces");
                expect(modernized.interfaces).to.be.deep.equal([
                    { type: "mqtts", port: 9000 }, // port was specified
                    {
                        type: "https", // port was specified
                        port: 8001,
                        bundle: true,
                        static: "path/to/static"
                    }
                ]);
            });

            it("should correctly modernize http-only configuration", () => {
                const legacy = {
                    host: "localhost",
                    onlyHttp: true,
                    http: {
                        bundle: true,
                        static: "path/to/static"
                    }
                };

                const modernized = options.modernize(legacy);
                const result = options.validate(modernized);
                expect(result.errors).to.be.deep.equal([]);

                expect(modernized).to.have.property("host");
                expect(modernized.host).to.be.equal("localhost");

                expect(modernized).to.not.have.property("http");
                expect(modernized).to.not.have.property("onlyHttp");

                expect(modernized).to.have.property("interfaces");
                expect(modernized.interfaces).to.be.deep.equal([
                    {
                        type: "http", // port was not specified
                        bundle: true,
                        static: "path/to/static"
                    }
                ]);
            });

            it("should correctly modernize https-only configuration", () => {
                const credentials = {
                    keyPath: "path/to/key",
                    certPath: "path/to/cert"
                };

                const legacy = {
                    host: "localhost",
                    onlyHttp: true, // secure is used only for credentials
                    secure: {
                        keyPath: "path/to/key",
                        certPath: "path/to/cert"
                    },
                    https: {
                        port: 8001,
                        bundle: true,
                        static: "path/to/static"
                    }
                };

                const modernized = options.modernize(legacy);
                const result = options.validate(modernized);
                expect(result.errors).to.be.deep.equal([]);

                expect(modernized).to.have.property("host");
                expect(modernized.host).to.be.equal("localhost");

                expect(modernized).to.not.have.property("https");
                expect(modernized).to.not.have.property("onlyHttp");

                expect(modernized).to.not.have.property("secure");
                expect(modernized).to.have.property("credentials");
                expect(modernized.credentials).to.be.deep.equal(credentials);

                expect(modernized).to.have.property("interfaces");
                expect(modernized.interfaces).to.be.deep.equal([
                    {
                        type: "https", // port was specified
                        port: 8001,
                        bundle: true,
                        static: "path/to/static"
                    }
                ]);
            });

            it("should correctly modernize http+https configuration", () => {
                const credentials = {
                    keyPath: "path/to/key",
                    certPath: "path/to/cert"
                };

                const legacy = {
                    host: "localhost",
                    onlyHttp: true, // secure is used only for credentials
                    secure: {
                        keyPath: "path/to/key",
                        certPath: "path/to/cert"
                    },
                    http: {
                        port: 8000,
                        bundle: true,
                        static: "path/to/static"
                    },
                    https: {
                        port: 8001,
                        bundle: true,
                        static: "path/to/static"
                    }
                };

                const modernized = options.modernize(legacy);
                const result = options.validate(modernized);
                expect(result.errors).to.be.deep.equal([]);

                expect(modernized).to.have.property("host");
                expect(modernized.host).to.be.equal("localhost");

                expect(modernized).to.not.have.property("http");
                expect(modernized).to.not.have.property("https");
                expect(modernized).to.not.have.property("onlyHttp");

                expect(modernized).to.not.have.property("secure");
                expect(modernized).to.have.property("credentials");
                expect(modernized.credentials).to.be.deep.equal(credentials);

                expect(modernized).to.have.property("interfaces");
                expect(modernized.interfaces).to.be.deep.equal([
                    {
                        type: "http", // port was specified
                        port: 8000,
                        bundle: true,
                        static: "path/to/static"
                    },
                    {
                        type: "https", // port was specified
                        port: 8001,
                        bundle: true,
                        static: "path/to/static"
                    }
                ]);
            });

            it("should correctly modernize complex configuration", () => {
                const credentials = {
                    keyPath: "path/to/key",
                    certPath: "path/to/cert"
                };

                const legacy = {
                    port: 1883,
                    host: "127.0.0.1",
                    secure: {
                        port: 8883,
                        keyPath: "path/to/key",
                        certPath: "path/to/cert"
                    },
                    http: {
                        port: 3000,
                        bundle: true,
                        static: "path/to/static"
                    },
                    https: {
                        port: 3001,
                        bundle: true,
                        static: "path/to/static"
                    },
                    onlyHttp: false,
                    allowNonSecure: true
                };

                const modernized = options.modernize(legacy);
                const result = options.validate(modernized);
                expect(result.errors).to.be.deep.equal([]);

                expect(modernized).to.not.have.property("port");

                expect(modernized).to.have.property("host");
                expect(modernized.host).to.be.equal("127.0.0.1");

                expect(modernized).to.not.have.property("http");
                expect(modernized).to.not.have.property("https");
                expect(modernized).to.not.have.property("onlyHttp");
                expect(modernized).to.not.have.property("allowNonSecure");

                expect(modernized).to.not.have.property("secure");
                expect(modernized).to.have.property("credentials");
                expect(modernized.credentials).to.be.deep.equal(credentials);

                expect(modernized).to.have.property("interfaces");
                expect(modernized.interfaces).to.be.deep.equal([
                    { type: "mqtt", port: 1883 }, // port was specified
                    { type: "mqtts", port: 8883 }, // port was specified
                    {
                        type: "http", // port was specified
                        port: 3000,
                        bundle: true,
                        static: "path/to/static"
                    },
                    {
                        type: "https", // port was specified
                        port: 3001,
                        bundle: true,
                        static: "path/to/static"
                    }
                ]);
            });

        });

    });

    describe("populate", () => {

        it("should turn {} into modern defaults", () => {
            const modern = {};
            const populated = options.populate(modern);
            const defmodern = options.defaultsModern();
            expect(populated).to.be.deep.equal(defmodern);
        });

        it("should not change modern defaults", () => {
            const defmodern = options.defaultsModern();
            const populated = options.populate(defmodern);
            expect(populated).to.be.deep.equal(defmodern);
        });

        it("should populate default ports", () => {
            const modern = {
                interfaces: [
                    { type: "mqtt" },
                    { type: "mqtts" },
                    { type: "http" },
                    { type: "https" }
                ]
            };

            const populated = options.populate(modern);
            expect(populated.interfaces).to.be.deep.equal([
                { type: "mqtt", port: 1883 },
                { type: "mqtts", port: 8883 },
                { type: "http", port: 3000 },
                { type: "https", port: 3001 }
            ]);
        });

    });

    describe("validate", () => {

        it("should not complain to modern defaults", () => {
            const modern = options.defaultsModern();
            const result = options.validate(modern);

            expect(result.errors).to.be.deep.equal([]);
        });

        it("should not complain to modernized options", () => {
            const modernized = options.modernize(deeplegacy);
            const result = options.validate(modernized);

            expect(result.errors).to.be.deep.equal([]);
        });

    });

});
