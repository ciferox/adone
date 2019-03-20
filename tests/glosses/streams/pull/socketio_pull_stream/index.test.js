const {
    multiformat: { multistream },
    p2p: { Connection },
    stream: { pull }
} = adone;

const clients = require("./util").default();
const uuid = require("uuid");

describe("stream", "pull", "socketioPullStream", () => {
    describe("data", () => {
        it("can create a connection between two clients", (cb) => {
            clients.two((err, res) => {
                if (err) {
                    return cb(err);
                }
                const [c1, c2] = res;

                const id = uuid();

                const sink = c1.createSink(id);

                const val = [Buffer.from("val")];

                c1.emit("createProxy", id, c2._id, () => {
                    const src = c2.createSource(id);
                    pull(
                        pull.values(val),
                        sink
                    );

                    pull(
                        src,
                        pull.collect((err, res) => {
                            if (err) {
                                return cb(err);
                            }
                            assert.deepEqual(res, val);
                            cb();
                        })
                    );
                });
            });
        });

        it("can create a duplex connection between two clients", (cb) => {
            clients.two((err, res) => {
                if (err) {
                    return cb(err);
                }
                const [c1, c2] = res;

                const id = uuid();
                const id1 = `${id}.1`;
                const id2 = `${id}.2`;

                const val = [Buffer.from("HELLOWORLD!")];

                const sinkC1 = c1.createSink(id1);
                const sinkC2 = c2.createSink(id2);

                c1.emit("createProxy", id1, c2._id, () => {
                    const srcC2 = c2.createSource(id1);
                    c2.emit("createProxy", id2, c1._id, () => {
                        const srcC1 = c1.createSource(id2);

                        const dupC1 = {
                            sink: sinkC1,
                            source: srcC1
                        };

                        const dupC2 = {
                            sink: sinkC2,
                            source: srcC2
                        };

                        const client = new Connection(dupC1);
                        const server = new Connection(dupC2);

                        const listener = new multistream.Listener();
                        const dialer = new multistream.Dialer();

                        listener.addHandler("/hello/1.0.0", (proto, conn) => {
                            pull(
                                pull.values(val),
                                conn,
                                pull.collect((err, res) => err ? cb(err) : assert.deepEqual(res, val))
                            );
                        });
                        listener.handle(server, (err) => err ? cb(err) : null);

                        dialer.handle(client, (err) => {
                            if (err) {
                                return cb(err);
                            }
                            dialer.select("/hello/1.0.0", (err, conn) => {
                                if (err) {
                                    return cb(err);
                                }
                                pull(
                                    pull.values(val),
                                    conn,
                                    pull.collect((err, res) => err ? cb(err) : cb(null, assert.deepEqual(res, val)))
                                );
                            });
                        });
                    });
                });
            });
        });
    });

    describe("disconnect", () => {
        it("should end stream on disconnect", (cb) => {
            clients.one((err, res) => {
                if (err) {
                    return cb(err);
                }
                const [c] = res;
                pull(
                    c.createSource(uuid()),
                    pull.collect(cb)
                );
                c.disconnect();
            });
        });
    });
});
