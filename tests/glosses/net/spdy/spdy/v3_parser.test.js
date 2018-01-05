const {
    is,
    net: { spdy: transport }
} = adone;

const spdy = transport.protocol.spdy;

describe("SPDY Parser (v3)", () => {
    let parser;
    let window;

    beforeEach(() => {
        window = new transport.Window({
            id: 0,
            isServer: true,
            recv: { size: 1024 * 1024 },
            send: { size: 1024 * 1024 }
        });

        const pool = spdy.compressionPool.create();
        parser = spdy.parser.create({ window });
        const comp = pool.get("3.1");
        parser.setCompression(comp);
        parser.skipPreface();
    });

    function pass(data, expected, done) {
        parser.write(Buffer.from(data, "hex"));

        if (!is.array(expected)) {
            expected = [expected];
        }

        parser.on("data", (frame) => {
            if (expected.length === 0) {
                return;
            }

            assert.deepEqual(frame, expected.shift());

            if (expected.length === 0) {
                assert.equal(parser.buffer.size, 0);
                done();
            }
        });
    }

    function fail(data, code, re, done) {
        parser.write(Buffer.from(data, "hex"), (err) => {
            assert(err);
            assert(err instanceof transport.protocol.base.utils.ProtocolError);
            assert.equal(err.code, spdy.constants.error[code]);
            assert(re.test(err.message), err.message);

            done();
        });
    }

    describe("SYN_STREAM", () => {
        it("should parse frame with http header", (done) => {
            const hexFrame = "800300010000002c0000000100000000000078" +
                "f9e3c6a7c202e50e507ab442a45a77d7105006" +
                "b32a4804974d8cfa00000000ffff";

            pass(hexFrame, {
                fin: false,
                headers: {
                    ":method": "GET",
                    ":path": "/"
                },
                id: 1,
                path: "/",
                priority: {
                    exclusive: false,
                    parent: 0,
                    weight: 1.0
                },
                type: "HEADERS", // by spec 'SYN_STREAM'
                writable: true
            }, done);
        });

        it("should fail on stream ID 0", (done) => {
            const hexFrame = "800300010000002c0000000000000000000078" +
                "f9e3c6a7c202e50e507ab442a45a77d7105006" +
                "b32a4804974d8cfa00000000ffff";

            fail(hexFrame, "PROTOCOL_ERROR", /Invalid*/i, done);
        });

        it("should parse frame with http header and FIN flag", (done) => {
            const hexFrame = "800300010100002c0000000100000000000078" +
                "f9e3c6a7c202e50e507ab442a45a77d7105006" +
                "b32a4804974d8cfa00000000ffff";

            pass(hexFrame, {
                fin: true,
                headers: {
                    ":method": "GET",
                    ":path": "/"
                },
                id: 1,
                path: "/",
                priority: {
                    exclusive: false,
                    parent: 0,
                    weight: 1.0
                },
                type: "HEADERS", // by spec 'SYN_STREAM'
                writable: true
            }, done);
        });

        it("should parse frame with unidirectional flag", (done) => {
            const hexFrame = "800300010200002c0000000100000000000078" +
                "f9e3c6a7c202e50e507ab442a45a77d7105006" +
                "b32a4804974d8cfa00000000ffff";

            pass(hexFrame, {
                fin: false,
                headers: {
                    ":method": "GET",
                    ":path": "/"
                },
                id: 1,
                path: "/",
                priority: {
                    exclusive: false,
                    parent: 0,
                    weight: 1.0
                },
                type: "HEADERS", // by spec 'SYN_STREAM'
                writable: false
            }, done);
        });
    });

    describe("SYN_REPLY", () => {
        it("should parse a frame without headers", (done) => {
            const hexFrame = "80030002000000140000000178f9e3c6a7c202a6230600000000ffff";

            pass(hexFrame, {
                fin: false,
                headers: {},
                id: 1,
                path: undefined,
                priority: {
                    exclusive: false,
                    parent: 0,
                    weight: 16
                },
                type: "HEADERS", // by spec SYN_REPLY
                writable: true
            }, done);
        });

        it("should parse a frame with headers", (done) => {
            const hexFrame = "8003000200000057000000013830e3c6a7c2004300bcff" +
                "00000003000000057468657265000000057468657265000000073a737" +
                "46174757300000006323030204f4b000000083a76657273696f6e0000" +
                "0008485454502f312e31000000ffff";

            pass(hexFrame, {
                fin: false,
                headers: {
                    ":status": "200",
                    there: "there"
                },
                id: 1,
                path: undefined,
                priority: {
                    exclusive: false,
                    parent: 0,
                    weight: 16
                },
                type: "HEADERS", // by spec SYN_REPLY
                writable: true
            }, done);
        });

        it("should parse frame with FIN_FLAG", (done) => {
            const hexFrame = "80030002010000140000000178f9e3c6a7c202a6230600000000ffff";

            pass(hexFrame, {
                fin: true,
                headers: {},
                id: 1,
                path: undefined,
                priority: {
                    exclusive: false,
                    parent: 0,
                    weight: 16
                },
                type: "HEADERS", // by spec SYN_REPLY
                writable: true
            }, done);
        });
    });

    describe("DATA_FRAME", () => {
        it("should parse frame with no flags", (done) => {
            const hexFrame = "000000010000001157726974696e6720746f2073747265616d";

            pass(hexFrame, {
                data: Buffer.from("57726974696e6720746f2073747265616d", "hex"),
                fin: false,
                id: 1,
                type: "DATA"
            }, done);
        });

        it("should parse partial frame with no flags", (done) => {
            const hexFrame = "000000010000001157726974696e6720746f207374726561";

            pass(hexFrame, {
                data: Buffer.from("57726974696e6720746f207374726561", "hex"),
                fin: false,
                id: 1,
                type: "DATA"
            }, () => {
                assert.equal(parser.waiting, 1);
                pass("ff", {
                    data: Buffer.from("ff", "hex"),
                    fin: false,
                    id: 1,
                    type: "DATA"
                }, () => {
                    assert.equal(window.recv.current, 1048559);
                    done();
                });
            });
        });

        it("should parse frame with FLAG_FIN", (done) => {
            const hexFrame = "000000010100001157726974696e6720746f2073747265616d";

            pass(hexFrame, {
                data: Buffer.from("57726974696e6720746f2073747265616d", "hex"),
                fin: true,
                id: 1,
                type: "DATA"
            }, done);
        });

        it("should parse partial frame with FLAG_FIN", (done) => {
            const hexFrame = "000000010100001157726974696e6720746f207374726561";

            pass(hexFrame, {
                data: Buffer.from("57726974696e6720746f207374726561", "hex"),
                fin: false,
                id: 1,
                type: "DATA"
            }, () => {
                assert.equal(parser.waiting, 1);
                pass("ff", {
                    data: Buffer.from("ff", "hex"),
                    fin: true,
                    id: 1,
                    type: "DATA"
                }, done);
            });
        });
    });

    describe("RST_STREAM", () => {
        it("should parse w/ status code PROTOCOL_ERROR", (done) => {
            const hexFrame = "80030003000000080000000100000001";

            pass(hexFrame, {
                code: "PROTOCOL_ERROR",
                id: 1,
                type: "RST" // RST_STREAM by spec
            }, done);
        });

        it("should parse w/ status code INVALID_STREAM", (done) => {
            const hexFrame = "80030003000000080000000100000002";

            pass(hexFrame, {
                code: "INVALID_STREAM",
                id: 1,
                type: "RST" // RST_STREAM by spec
            }, done);
        });

        it("should parse w/ status code REFUSED_STREAN", (done) => {
            const hexFrame = "80030003000000080000000100000003";

            pass(hexFrame, {
                code: "REFUSED_STREAM",
                id: 1,
                type: "RST" // RST_STREAM by spec
            }, done);
        });

        it("should parse w/ status code UNSUPPORTED_VERSION", (done) => {
            const hexFrame = "80030003000000080000000100000004";

            pass(hexFrame, {
                code: "UNSUPPORTED_VERSION",
                id: 1,
                type: "RST" // RST_STREAM by spec
            }, done);
        });

        it("should parse w/ status code CANCEL", (done) => {
            const hexFrame = "80030003000000080000000100000005";

            pass(hexFrame, {
                code: "CANCEL",
                id: 1,
                type: "RST" // RST_STREAM by spec
            }, done);
        });

        it("should parse w/ status code INTERNAL_ERROR", (done) => {
            const hexFrame = "80030003000000080000000100000006";

            pass(hexFrame, {
                code: "INTERNAL_ERROR",
                id: 1,
                type: "RST" // RST_STREAM by spec
            }, done);
        });

        it("should parse w/ status code FLOW_CONTROL_ERROR", (done) => {
            const hexFrame = "80030003000000080000000100000007";

            pass(hexFrame, {
                code: "FLOW_CONTROL_ERROR",
                id: 1,
                type: "RST" // RST_STREAM by spec
            }, done);
        });

        it("should parse w/ status code STREAM_IN_USE", (done) => {
            const hexFrame = "80030003000000080000000100000008";

            pass(hexFrame, {
                code: "STREAM_IN_USE",
                id: 1,
                type: "RST" // RST_STREAM by spec
            }, done);
        });

        it("should parse w/ status code STREAM_ALREADY_CLOSED", (done) => {
            const hexFrame = "80030003000000080000000100000009";

            pass(hexFrame, {
                code: "STREAM_CLOSED", // STREAM_ALREADY_CLOSED by spec
                id: 1,
                type: "RST" // RST_STREAM by spec
            }, done);
        });

        it("should parse w/ status code FRAME_TOO_LARGE", (done) => {
            const hexframe = "8003000300000008000000010000000b";

            pass(hexframe, {
                code: "FRAME_TOO_LARGE",
                id: 1,
                type: "RST" // RST_STREAM by spec
            }, done);
        });
    });

    describe("SETTINGS", () => {
        it("should parse frame", (done) => {
            const hexFrame = "800300040000000c000000010100000700000100";

            pass(hexFrame, {
                settings: {
                    initial_window_size: 256
                },
                type: "SETTINGS"
            }, done);
        });
    });

    describe("PING", () => {
        it("should parse ACK frame", (done) => {
            const hexFrame = "800300060000000400000001";

            pass(hexFrame, {
                ack: true,
                opaque: Buffer.from("00000001", "hex"),
                type: "PING"
            }, done);
        });
    });

    describe("PING", () => {
        it("should parse not ACK frame", (done) => {
            const hexFrame = "800300060000000400000002";

            pass(hexFrame, {
                ack: false,
                opaque: Buffer.from("00000002", "hex"),
                type: "PING"
            }, done);
        });
    });

    describe("GOAWAY", () => {
        it("should parse frame with status code OK", (done) => {
            const hexframe = "80030007000000080000000100000000";

            pass(hexframe, {
                code: "OK",
                lastId: 1,
                type: "GOAWAY"
            }, done);
        });

        it("should parse frame with status code PROTOCOL_ERROR", (done) => {
            const hexframe = "80030007000000080000000100000001";

            pass(hexframe, {
                code: "PROTOCOL_ERROR",
                lastId: 1,
                type: "GOAWAY"
            }, done);
        });

        it("should parse frame with status code INTERNAL_ERROR", (done) => {
            const hexframe = "80030007000000080000000100000002";

            pass(hexframe, {
                code: "INTERNAL_ERROR",
                lastId: 1,
                type: "GOAWAY"
            }, done);
        });
    });

    describe("HEADERS", () => {
        it("should parse frame", (done) => {
            const context = "8003000200000057000000013830e3c6a7c2004300bcff00000003" +
                "000000057468657265000000057468657265000000073a737461747573" +
                "00000006323030204f4b000000083a76657273696f6e00000008485454" +
                "502f312e31000000ffff";

            const frame = "800300080000002500000001001700e8ff00000001000000046d6f7265" +
                "0000000768656164657273000000ffff";

            pass(context, {
                fin: false,
                headers: {
                    ":status": "200",
                    there: "there"
                },
                id: 1,
                path: undefined,
                priority: {
                    exclusive: false,
                    parent: 0,
                    weight: 16
                },
                type: "HEADERS",
                writable: true
            }, () => {
                pass(frame, {
                    fin: false,
                    headers: {
                        more: "headers"
                    },
                    id: 1,
                    path: undefined,
                    priority: {
                        exclusive: false,
                        parent: 0,
                        weight: 16
                    },
                    type: "HEADERS",
                    writable: true
                }, done);
            });
        });

        it("should parse two consecutive frames", (done) => {
            const data = "8003000800000022000000043830e3c6a7c2000e00f1ff00" +
                "00000100000001610000000162000000ffff800300080000" +
                "001c00000004000e00f1ff00000001000000016100000001" +
                "62000000ffff";

            pass(data, [{
                fin: false,
                headers: {
                    a: "b"
                },
                id: 4,
                path: undefined,
                priority: {
                    exclusive: false,
                    parent: 0,
                    weight: 16
                },
                type: "HEADERS",
                writable: true
            }, {
                fin: false,
                headers: {
                    a: "b"
                },
                id: 4,
                path: undefined,
                priority: {
                    exclusive: false,
                    parent: 0,
                    weight: 16
                },
                type: "HEADERS",
                writable: true
            }], done);
        });
    });

    describe("WINDOW_UPDATE", () => {
        it("should parse frame", (done) => {
            const hexframe = "8003000900000008000000010000abca";

            pass(hexframe, {
                delta: 43978,
                id: 1,
                type: "WINDOW_UPDATE"
            }, done);
        });
    });
});
