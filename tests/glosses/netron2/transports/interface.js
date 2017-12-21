const goodbye = require("pull-goodbye");
const serializer = require("pull-serializer");

const {
    stream: { pull }
} = adone;

export default (common) => {
    describe("transport interface", () => {
        describe("dial", () => {
            let addrs;
            let transport;
            let listener;

            before((done) => {
                common.setup((err, _transport, _addrs) => {
                    if (err) {
                        return done(err);
                    }
                    transport = _transport;
                    addrs = _addrs;
                    done();
                });
            });

            after((done) => {
                common.teardown(done);
            });

            beforeEach((done) => {
                listener = transport.createListener((conn) => {
                    pull(conn, conn);
                });
                listener.listen(addrs[0], done);
            });

            afterEach((done) => {
                listener.close(done);
            });

            it("simple", (done) => {
                const s = serializer(goodbye({
                    source: pull.values(["hey"]),
                    sink: pull.collect((err, values) => {
                        assert.notExists(err);
                        expect(
                            values
                        ).to.be.eql(["hey"]);
                        done();
                    })
                }));

                pull(
                    s,
                    transport.dial(addrs[0]),
                    s
                );
            });

            it("to non existent listener", (done) => {
                pull(
                    transport.dial(addrs[1]),
                    pull.onEnd((err) => {
                        assert.exists(err);
                        done();
                    })
                );
            });
        });

        describe("listen", () => {
            let addrs;
            let transport;

            const plan = function (n, done) {
                let i = 0;
                return (err) => {
                    if (err) {
                        return done(err);
                    }
                    i++;

                    if (i === n) {
                        done();
                    }
                };
            };

            before((done) => {
                common.setup((err, _transport, _addrs) => {
                    if (err) {
                        return done(err);
                    }
                    transport = _transport;
                    addrs = _addrs;
                    done();
                });
            });

            after((done) => {
                common.teardown(done);
            });

            it("simple", (done) => {
                const listener = transport.createListener((conn) => { });
                listener.listen(addrs[0], () => {
                    listener.close(done);
                });
            });

            it("close listener with connections, through timeout", (done) => {
                const finish = plan(3, done);
                const listener = transport.createListener((conn) => {
                    pull(conn, conn);
                });

                listener.listen(addrs[0], () => {
                    const socket1 = transport.dial(addrs[0], () => {
                        listener.close(finish);
                    });

                    pull(
                        transport.dial(addrs[0]),
                        pull.onEnd(() => {
                            finish();
                        })
                    );

                    pull(
                        pull.values([Buffer("Some data that is never handled")]),
                        socket1,
                        pull.onEnd(() => {
                            finish();
                        })
                    );
                });
            });

            describe("events", () => {
                // TODO: figure out why it fails in the full test suite
                it.skip("connection", (done) => {
                    const finish = plan(2, done);

                    const listener = transport.createListener();

                    listener.on("connection", (conn) => {
                        assert.exists(conn);
                        finish();
                    });

                    listener.listen(addrs[0], () => {
                        transport.dial(addrs[0], () => {
                            listener.close(finish);
                        });
                    });
                });

                it("listening", (done) => {
                    const listener = transport.createListener();
                    listener.on("listening", () => {
                        listener.close(done);
                    });
                    listener.listen(addrs[0]);
                });

                // TODO: how to get the listener to emit an error?
                it.skip("error", (done) => {
                    const listener = transport.createListener();
                    listener.on("error", (err) => {
                        assert.exists(err);
                        listener.close(done);
                    });
                });

                it("close", (done) => {
                    const finish = plan(2, done);
                    const listener = transport.createListener();
                    listener.on("close", finish);

                    listener.listen(addrs[0], () => {
                        listener.close(finish);
                    });
                });
            });
        });
    });
};
