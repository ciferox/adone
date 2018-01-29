const {
    stream: { pull }
} = adone;

export default (common) => {
    describe("connect", () => {
        let addrs;
        let transport;
        let listener;

        before(async () => {
            [transport, addrs] = await common.setup();
        });

        after(async () => {
            await common.teardown();
        });

        beforeEach(async () => {
            listener = transport.createListener((conn) => {
                pull(conn, conn);
            });
            await listener.listen(addrs[0]);
        });

        afterEach(async () => {
            await listener.close();
        });

        it("simple", async (done) => {
            const s = pull.serializer(pull.goodbye({
                source: pull.values(["hey"]),
                sink: pull.collect((err, values) => {
                    assert.notExists(err);
                    expect(
                        values
                    ).to.be.eql(["hey"]);
                    done();
                })
            }));

            const conn = await transport.connect(addrs[0]);
            pull(
                s,
                conn,
                s
            );
        });

        it("to non existent listener", async () => {
            await assert.throws(async () => transport.connect(addrs[1]));
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

        before(async () => {
            [transport, addrs] = await common.setup();
        });

        after(async () => {
            await common.teardown();
        });

        it("simple", async () => {
            const listener = transport.createListener();
            await listener.listen(addrs[0]);
            await listener.close();
        });

        it("close listener with connections, through timeout", async (done) => {
            const finish = plan(3, done);
            const listener = transport.createListener((conn) => {
                pull(conn, conn);
            });

            await listener.listen(addrs[0]);
            const socket1 = await transport.connect(addrs[0]);
            

            const conn = await transport.connect(addrs[0]);
            pull(
                conn,
                pull.onEnd(() => {
                    finish();
                })
            );

            pull(
                pull.values([Buffer.from("Some data that is never handled")]),
                socket1,
                pull.onEnd(() => {
                    finish();
                })
            );

            listener.close().then(finish);
        });

        describe("events", () => {
            it("connection", async (done) => {
                const finish = plan(2, done);

                const listener = transport.createListener();

                listener.on("connection", (conn) => {
                    assert.exists(conn);
                    finish();
                });

                await listener.listen(addrs[0]);
                await transport.connect(addrs[0]);
                listener.close().then(finish);
            });

            it("listening", (done) => {
                const listener = transport.createListener();
                listener.on("listening", () => {
                    listener.close().then(done);
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

            it("close", async (done) => {
                const finish = plan(2, done);
                const listener = transport.createListener();
                listener.on("close", finish);

                await listener.listen(addrs[0]);
                listener.close().then(finish);
            });
        });
    });
};
