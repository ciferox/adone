describe("net", "proxy", "shadowsocks", "server", "parser", () => {
    const { net: { proxy: { shadowsocks: { ServerParser: Parser } } }, std: { stream: { PassThrough } } } = adone;
    const IV = "0123456789abcdef";
    const decipher = {
        update: adone.identity  // decipher does nothing
    };

    describe("iv parsing", () => {
        it("should parse iv", async () => {
            const stream = new PassThrough();
            const parser = new Parser(stream, {
                ivLength: IV.length,
                getDecipher: () => decipher
            });
            stream.write(IV);
            await adone.promise.delay(10);
            expect(parser._state).to.be.equal(Parser.STATE_HEADER_TYPE);
            expect(parser._iv.toString()).to.be.equal(IV);
        });

        it("should parse chunked iv", async () => {
            const stream = new PassThrough();
            const parser = new Parser(stream, {
                ivLength: IV.length,
                getDecipher: () => decipher
            });
            for (let i = 0; i < IV.length; ++i) {
                stream.write(IV[i]);
                await adone.promise.delay(10);
                if (i !== IV.length - 1) {
                    expect(parser._state).to.be.equal(Parser.STATE_IV);
                }
            }
            expect(parser._state).to.be.equal(Parser.STATE_HEADER_TYPE);
            expect(parser._iv.toString()).to.be.equal(IV);
            parser.stop();
        });
    });

    describe("header parsing", () => {
        describe("address type", () => {
            it("should recognize IPv4", async () => {
                const stream = new PassThrough();
                const parser = new Parser(stream, {
                    ivLength: IV.length,
                    getDecipher: () => decipher
                });
                stream.write(IV);
                stream.write("\x01");
                await adone.promise.delay(10);
                expect(parser._state).to.be.equal(Parser.STATE_HEADER_ADDRESS);
                expect(parser._type).to.be.equal(0x01);
                expect(parser._address).not.to.be.null();
                expect(parser._address).to.have.lengthOf(4);
            });

            it("should recognize IPv6", async () => {
                const stream = new PassThrough();
                const parser = new Parser(stream, {
                    ivLength: IV.length,
                    getDecipher: () => decipher
                });
                stream.write(IV);
                stream.write("\x04");
                await adone.promise.delay(10);
                expect(parser._state).to.be.equal(Parser.STATE_HEADER_ADDRESS);
                expect(parser._type).to.be.equal(0x04);
                expect(parser._address).not.to.be.null();
                expect(parser._address).to.have.lengthOf(16);
            });

            it("should recognize variable length string", async () => {
                const stream = new PassThrough();
                const parser = new Parser(stream, {
                    ivLength: IV.length,
                    getDecipher: () => decipher
                });
                stream.write(IV);
                stream.write("\x03");
                await adone.promise.delay(10);
                expect(parser._state).to.be.equal(Parser.STATE_HEADER_ADDRESS);
                expect(parser._type).to.be.equal(0x03);
                expect(parser._address).to.be.null();
            });

            it("should stop parsing if the type is unknown", async () => {
                const stream = new PassThrough();
                const parser = new Parser(stream, {
                    ivLength: IV.length,
                    getDecipher: () => decipher
                });
                const onError = spy();
                parser.once("error", onError);
                stream.write(IV);
                stream.write("\x55");
                await adone.promise.delay(10);
                expect(parser._state).to.be.equal(Parser.STATE_ERROR);
                expect(parser._address).to.be.null();
                expect(onError).to.have.been.calledOnce;
                const { args } = onError.getCall(0);
                expect(args).to.have.lengthOf(1);
                expect(args[0]).to.be.instanceOf(adone.x.IllegalState);
                expect(args[0].message).to.match(/^Unknown request type/);
            });
        });

        describe("address", () => {
            it("should parse IPv4 address", async () => {
                const stream = new PassThrough();
                const parser = new Parser(stream, {
                    ivLength: IV.length,
                    getDecipher: () => decipher
                });
                stream.write(IV);
                stream.write("\x01");
                stream.write("\x08".repeat(4));
                await adone.promise.delay(10);
                expect(parser._state).to.be.equal(Parser.STATE_HEADER_PORT);
                expect(parser._address.toString()).to.be.equal("\x08".repeat(4));
            });

            it("should parse chunked IPv4 address", async () => {
                const stream = new PassThrough();
                const parser = new Parser(stream, {
                    ivLength: IV.length,
                    getDecipher: () => decipher
                });
                stream.write(IV);
                stream.write("\x01");
                await adone.promise.delay(10);
                for (let i = 0; i < 4; ++i) {
                    stream.write("\x08");
                    await adone.promise.delay(10);
                    if (i !== 3) {
                        expect(parser._state).to.be.equal(Parser.STATE_HEADER_ADDRESS);
                    }
                }
                expect(parser._state).to.be.equal(Parser.STATE_HEADER_PORT);
                expect(parser._address.toString()).to.be.equal("\x08\x08\x08\x08");
            });

            it("should parse IPv6 address", async () => {
                const stream = new PassThrough();
                const parser = new Parser(stream, {
                    ivLength: IV.length,
                    getDecipher: () => decipher
                });
                stream.write(IV);
                stream.write("\x04");
                stream.write("\x08".repeat(16));
                await adone.promise.delay(10);
                expect(parser._state).to.be.equal(Parser.STATE_HEADER_PORT);
                expect(parser._address.toString()).to.be.equal("\x08".repeat(16));
            });

            it("should parse chunked IPv6 address", async () => {
                const stream = new PassThrough();
                const parser = new Parser(stream, {
                    ivLength: IV.length,
                    getDecipher: () => decipher
                });
                stream.write(IV);
                stream.write("\x04");
                await adone.promise.delay(10);
                for (let i = 0; i < 16; ++i) {
                    stream.write("\x08");
                    await adone.promise.delay(10);
                    if (i !== 15) {
                        expect(parser._state).to.be.equal(Parser.STATE_HEADER_ADDRESS);
                    }
                }
                expect(parser._state).to.be.equal(Parser.STATE_HEADER_PORT);
                expect(parser._address.toString()).to.be.equal("\x08".repeat(16));
            });

            it("should parse variable length string address", async () => {
                const stream = new PassThrough();
                const parser = new Parser(stream, {
                    ivLength: IV.length,
                    getDecipher: () => decipher
                });
                stream.write(IV);
                stream.write("\x03");
                const address = "www.google.com";
                stream.write(Buffer.from([address.length]));
                stream.write(address);
                await adone.promise.delay(10);
                expect(parser._state).to.be.equal(Parser.STATE_HEADER_PORT);
                expect(parser._address.toString()).to.be.equal(address);
            });

            it("should parse chunked variable length string address", async () => {
                const stream = new PassThrough();
                const parser = new Parser(stream, {
                    ivLength: IV.length,
                    getDecipher: () => decipher
                });
                stream.write(IV);
                stream.write("\x03");
                const address = "www.google.com";
                for (let i = -1; i < address.length; ++i) {
                    if (i === -1) {
                        stream.write(Buffer.from([address.length]));
                    } else {
                        stream.write(address[i]);
                    }
                    await adone.promise.delay(10);
                    if (i !== address.length - 1) {
                        expect(parser._state).to.be.equal(Parser.STATE_HEADER_ADDRESS);
                    }
                }
                expect(parser._state).to.be.equal(Parser.STATE_HEADER_PORT);
                expect(parser._address.toString()).to.be.equal(address);
            });
        });

        describe("port", () => {
            it("should parse port for IPv4 address", async () => {
                const stream = new PassThrough();
                const parser = new Parser(stream, {
                    ivLength: IV.length,
                    getDecipher: () => decipher
                });
                stream.write(IV);
                stream.write("\x01");
                stream.write("\x08".repeat(4));
                const port = 31337;
                const bport = Buffer.alloc(2);
                bport.writeUInt16BE(port);
                stream.write(bport);
                await adone.promise.delay(10);
                expect(parser._state).to.be.equal(Parser.STATE_DONE);
                expect(parser._port).to.be.equal(port);
            });

            it("should parse chunked port for IPv4 address", async () => {
                const stream = new PassThrough();
                const parser = new Parser(stream, {
                    ivLength: IV.length,
                    getDecipher: () => decipher
                });
                stream.write(IV);
                stream.write("\x01");
                stream.write("\x08".repeat(4));
                const port = 31337;
                const bport = Buffer.alloc(2);
                bport.writeUInt16BE(port);
                stream.write(bport.slice(0, 1));
                await adone.promise.delay(10);
                stream.write(bport.slice(1, 2));
                await adone.promise.delay(10);
                expect(parser._state).to.be.equal(Parser.STATE_DONE);
                expect(parser._port).to.be.equal(port);
            });

            it("should parse port for IPv6 address", async () => {
                const stream = new PassThrough();
                const parser = new Parser(stream, {
                    ivLength: IV.length,
                    getDecipher: () => decipher
                });
                stream.write(IV);
                stream.write("\x04");
                stream.write("\x08".repeat(16));
                const port = 31337;
                const bport = Buffer.alloc(2);
                bport.writeUInt16BE(port);
                stream.write(bport);
                await adone.promise.delay(10);
                expect(parser._state).to.be.equal(Parser.STATE_DONE);
                expect(parser._port).to.be.equal(port);
            });

            it("should parse chunked port for IPv6 address", async () => {
                const stream = new PassThrough();
                const parser = new Parser(stream, {
                    ivLength: IV.length,
                    getDecipher: () => decipher
                });
                stream.write(IV);
                stream.write("\x04");
                stream.write("\x08".repeat(16));
                const port = 31337;
                const bport = Buffer.alloc(2);
                bport.writeUInt16BE(port);
                stream.write(bport.slice(0, 1));
                await adone.promise.delay(10);
                stream.write(bport.slice(1, 2));
                await adone.promise.delay(10);
                expect(parser._state).to.be.equal(Parser.STATE_DONE);
                expect(parser._port).to.be.equal(port);
            });

            it("should parse port for variable string address", async () => {
                const stream = new PassThrough();
                const parser = new Parser(stream, {
                    ivLength: IV.length,
                    getDecipher: () => decipher
                });
                stream.write(IV);
                stream.write("\x03");
                const address = "www.google.com";
                stream.write(Buffer.from([address.length]));
                stream.write(address);
                const port = 31337;
                const bport = Buffer.alloc(2);
                bport.writeUInt16BE(port);
                stream.write(bport);
                await adone.promise.delay(10);
                expect(parser._state).to.be.equal(Parser.STATE_DONE);
                expect(parser._port).to.be.equal(port);
            });

            it("should parse chunked port for variable string address", async () => {
                const stream = new PassThrough();
                const parser = new Parser(stream, {
                    ivLength: IV.length,
                    getDecipher: () => decipher
                });
                stream.write(IV);
                stream.write("\x03");
                const address = "www.google.com";
                stream.write(Buffer.from([address.length]));
                stream.write(address);
                const port = 31337;
                const bport = Buffer.alloc(2);
                bport.writeUInt16BE(port);
                stream.write(bport.slice(0, 1));
                await adone.promise.delay(10);
                stream.write(bport.slice(1, 2));
                await adone.promise.delay(10);
                expect(parser._state).to.be.equal(Parser.STATE_DONE);
                expect(parser._port).to.be.equal(port);
            });
        });

        describe("request event", () => {
            it("should emit after parsing IPv4", async () => {
                const stream = new PassThrough();
                const parser = new Parser(stream, {
                    ivLength: IV.length,
                    getDecipher: () => decipher
                });
                const onRequest = spy();
                parser.on("request", onRequest);
                const header = new adone.collection.ByteArray();
                header.writeUInt8(0x01);
                header.write("\x08".repeat(4));
                header.writeUInt16BE(31337);
                stream.write(IV);
                stream.write(header.toBuffer());
                await adone.promise.delay(10);
                expect(onRequest).to.have.been.calledOnce;
                const { args: [{ dstAddr, dstPort }] } = onRequest.getCall(0);
                expect(dstAddr).to.be.equal("8.8.8.8");
                expect(dstPort).to.be.equal(31337);
            });

            it("should emit after parsing IPv6", async () => {
                const stream = new PassThrough();
                const parser = new Parser(stream, {
                    ivLength: IV.length,
                    getDecipher: () => decipher
                });
                const onRequest = spy();
                parser.on("request", onRequest);
                const header = new adone.collection.ByteArray();
                header.writeUInt8(0x04);
                header.write("\x08".repeat(16));
                header.writeUInt16BE(31337);
                stream.write(IV);
                stream.write(header.toBuffer());
                await adone.promise.delay(10);
                expect(onRequest).to.have.been.calledOnce;
                const { args: [{ dstAddr, dstPort }] } = onRequest.getCall(0);
                expect(dstAddr).to.be.equal("0808:0808:0808:0808:0808:0808:0808:0808");
                expect(dstPort).to.be.equal(31337);
            });

            it("should emit after parsing variable length string", async () => {
                const stream = new PassThrough();
                const parser = new Parser(stream, {
                    ivLength: IV.length,
                    getDecipher: () => decipher
                });
                const onRequest = spy();
                parser.on("request", onRequest);
                const header = new adone.collection.ByteArray();
                header.writeUInt8(0x03);
                const address = "www.google.com";
                header.writeUInt8(address.length);
                header.write(address);
                header.writeUInt16BE(31337);
                stream.write(IV);
                stream.write(header.toBuffer());
                await adone.promise.delay(10);
                expect(onRequest).to.have.been.calledOnce;
                const { args: [{ dstAddr, dstPort }] } = onRequest.getCall(0);
                expect(dstAddr).to.be.equal(address);
                expect(dstPort).to.be.equal(31337);
            });

            it("should return the head on the stream", async () => {
                const stream = new PassThrough();
                const parser = new Parser(stream, {
                    ivLength: IV.length,
                    getDecipher: () => decipher
                });
                const onRequest = spy();
                parser.on("request", onRequest);
                const header = new adone.collection.ByteArray();
                header.writeUInt8(0x03);
                const address = "www.google.com";
                header.writeUInt8(address.length);
                header.write(address);
                header.writeUInt16BE(31337);
                header.write("some data");
                stream.write(IV);
                stream.write(header.toBuffer());
                await adone.promise.delay(10);
                expect(onRequest).to.have.been.calledOnce;
                const { args: [{ dstAddr, dstPort }, head] } = onRequest.getCall(0);
                expect(dstAddr).to.be.equal(address);
                expect(dstPort).to.be.equal(31337);
                expect(head.toString()).to.be.equal("some data");
            });
        });
    });
});
