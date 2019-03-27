const {
    web: { server },
    std: { os, path, fs }
} = adone;

describe("listen", () => {
    it("listen accepts a callback", (done) => {
        const fastify = server();
        fastify.listen((err) => {
            assert.equal(fastify.server.address().address, "127.0.0.1");
            assert.notExists(err);
            fastify.close();
            done();
        });
    });

    it("listen accepts a port and a callback", (done) => {
        const fastify = server();
        fastify.listen(0, (err) => {
            assert.equal(fastify.server.address().address, "127.0.0.1");
            assert.notExists(err);
            fastify.close();
            done();
        });
    });

    it("listen accepts a port and a callback with (err, address)", (done) => {
        const fastify = server();
        fastify.listen(0, (err, address) => {
            assert.equal(address, `http://127.0.0.1:${fastify.server.address().port}`);
            assert.notExists(err);
            fastify.close();
            done();
        });
    });

    it("listen accepts a port, address, and callback", (done) => {
        const fastify = server();
        fastify.listen(0, "127.0.0.1", (err) => {
            assert.notExists(err);
            fastify.close();
            done();
        });
    });

    it("listen accepts options and a callback", (done) => {
        const fastify = server();
        fastify.listen({
            port: 0,
            host: "localhost",
            backlog: 511,
            exclusive: false,
            readableAll: false,
            writableAll: false,
            ipv6Only: false
        }, (err) => {
            assert.notExists(err);
            fastify.close();
            done();
        });
    });

    it("listen accepts a port, address and a callback with (err, address)", (done) => {
        const fastify = server();
        fastify.listen(0, "127.0.0.1", (err, address) => {
            assert.equal(address, `http://127.0.0.1:${fastify.server.address().port}`);
            assert.notExists(err);
            fastify.close();
            done();
        });
    });

    it("listen accepts a port, address, backlog and callback", (done) => {
        const fastify = server();
        fastify.listen(0, "127.0.0.1", 511, (err) => {
            assert.notExists(err);
            fastify.close();
            done();
        });
    });

    it("listen accepts a port, address, backlog and callback with (err, address)", (done) => {
        const fastify = server();
        fastify.listen(0, "127.0.0.1", 511, (err, address) => {
            assert.equal(address, `http://127.0.0.1:${fastify.server.address().port}`);
            assert.notExists(err);
            fastify.close();
            done();
        });
    });

    it("listen after Promise.resolve()", (done) => {
        const f = server();
        Promise.resolve()
            .then(() => {
                f.listen(0, (err, address) => {
                    f.server.unref();
                    assert.equal(address, `http://127.0.0.1:${f.server.address().port}`);
                    assert.notExists(err);
                    f.close();
                    done();
                });
            });
    });

    it("register after listen using Promise.resolve()", (done) => {
        const f = server();

        const handler = (req, res) => res.send({});
        Promise.resolve()
            .then(() => {
                f.get("/", handler);
                f.register((f2, options, done) => {
                    f2.get("/plugin", handler);
                    done();
                });
                return f.ready();
            })
            .catch(assert.notExists)
            .then(() => done());
    });

    it("double listen errors", (done) => {
        const fastify = server();
        fastify.listen(0, (err) => {
            assert.notExists(err);
            fastify.listen(fastify.server.address().port, (err, address) => {
                assert.equal(address, null);
                assert.ok(err);
                fastify.close();
                done();
            });
        });
    });

    it("double listen errors callback with (err, address)", (done) => {
        const fastify = server();
        fastify.listen(0, (err1, address1) => {
            assert.equal(address1, `http://127.0.0.1:${fastify.server.address().port}`);
            assert.notExists(err1);
            fastify.listen(fastify.server.address().port, (err2, address2) => {
                assert.equal(address2, null);
                assert.ok(err2);
                fastify.close();
                done();
            });
        });
    });

    it("listen twice on the same port", (done) => {
        const fastify = server();
        fastify.listen(0, (err1, address1) => {
            assert.equal(address1, `http://127.0.0.1:${fastify.server.address().port}`);
            assert.notExists(err1);
            const s2 = server();
            s2.listen(fastify.server.address().port, (err2, address2) => {
                assert.equal(address2, null);
                assert.ok(err2);
                fastify.close();
                s2.close();
                done();
            });
        });
    });

    it("listen twice on the same port callback with (err, address)", (done) => {
        const fastify = server();
        fastify.listen(0, (err1, address1) => {
            const _port = fastify.server.address().port;
            assert.equal(address1, `http://127.0.0.1:${_port}`);
            assert.notExists(err1);
            const s2 = server();
            s2.listen(_port, (err2, address2) => {
                assert.equal(address2, null);
                assert.ok(err2);
                fastify.close();
                s2.close();
                done();
            });
        });
    });

    // https://nodejs.org/api/net.html#net_ipc_support
    if (os.platform() !== "win32") {
        it("listen on socket", (done) => {
            const fastify = server();

            const sockFile = path.join(os.tmpdir(), "server.sock");
            try {
                fs.unlinkSync(sockFile);
            } catch (e) { }

            fastify.listen(sockFile, (err, address) => {
                assert.notExists(err);
                assert.equal(sockFile, fastify.server.address());
                assert.equal(address, sockFile);
                fastify.close();
                done();
            });
        });
    }

    it("listen without callback (port zero)", (done) => {
        const fastify = server();
        fastify.listen(0).then(() => {
            assert.equal(fastify.server.address().address, "127.0.0.1");
            fastify.close();
            done();
        });
    });

    it("listen without callback (port not given)", (done) => {
        const fastify = server();
        fastify.listen().then(() => {
            assert.equal(fastify.server.address().address, "127.0.0.1");
            fastify.close();
            done();
        });
    });

    it("listen null without callback with (address)", (done) => {
        const fastify = server();
        fastify.listen(null).then((address) => {
            assert.equal(address, `http://127.0.0.1:${fastify.server.address().port}`);
            fastify.close();
            done();
        });
    });

    it("listen without port without callback with (address)", (done) => {
        const fastify = server();
        fastify.listen().then((address) => {
            assert.equal(address, `http://127.0.0.1:${fastify.server.address().port}`);
            fastify.close();
            done();
        });
    });

    it("listen with undefined without callback with (address)", (done) => {
        const fastify = server();
        fastify.listen(undefined).then((address) => {
            assert.equal(address, `http://127.0.0.1:${fastify.server.address().port}`);
            fastify.close();
            done();
        });
    });

    it("listen without callback with (address)", (done) => {
        const fastify = server();
        fastify.listen(0).then((address) => {
            assert.equal(address, `http://127.0.0.1:${fastify.server.address().port}`);
            fastify.close();
            done();
        });
    });

    it("double listen without callback rejects", (done) => {
        const fastify = server();
        fastify.listen(0).then(() => {
            fastify.listen(0).catch((err) => {
                assert.ok(err);
                fastify.close();
                done();
            });
        }).catch((err) => assert.notExists(err));
    });

    it("double listen without callback with (address)", (done) => {
        const fastify = server();
        fastify.listen(0).then((address) => {
            assert.equal(address, `http://127.0.0.1:${fastify.server.address().port}`);
            fastify.listen(0).catch((err) => {
                assert.ok(err);
                fastify.close();
                done();
            });
        }).catch((err) => assert.notExists(err));
    });

    it("listen twice on the same port without callback rejects", (done) => {
        const fastify = server();

        fastify.listen(0).then(() => {
            const s2 = server();
            s2.listen(fastify.server.address().port).catch((err) => {
                assert.ok(err);
                fastify.close();
                s2.close();
                done();
            });
        }).catch((err) => assert.notExists(err));
    });

    it("listen twice on the same port without callback rejects with (address)", (done) => {
        const fastify = server();
        fastify.listen(0).then((address) => {
            const s2 = server();
            assert.equal(address, `http://127.0.0.1:${fastify.server.address().port}`);
            s2.listen(fastify.server.address().port).catch((err) => {
                assert.ok(err);
                fastify.close();
                s2.close();
                done();
            });
        }).catch((err) => assert.notExists(err));
    });

    it("listen on invalid port without callback rejects", (done) => {
        const fastify = server();
        return fastify.listen(-1).catch((err) => {
            assert.ok(err);
            fastify.close();
            done();
            return true;
        });
    });

    it("listen logs the port as info", (done) => {
        const fastify = server();

        const msgs = [];
        fastify.log.info = function (msg) {
            msgs.push(msg);
        };

        fastify.listen(0).then(() => {
            assert.ok(/http:\/\//.test(msgs[0]));
            fastify.close();
            done();
        });
    });
});
