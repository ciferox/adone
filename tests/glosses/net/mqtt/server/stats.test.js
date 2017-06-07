describe("net", "mqtt", "server", "Stats", () => {
    let instance;
    let server;
    let clock;
    const interval = 10;

    beforeEach(() => {
        clock = fakeClock.install();
        server = new adone.EventEmitter();
        server.id = 42;
        instance = new adone.net.mqtt.server.Stats();
        instance.wire(server);

        server.publish = function (packet) {
            server.emit("testPublished", packet);
        };
    });

    afterEach(() => {
        clock.uninstall();
        server.emit("closed");
    });

    describe("counting connected clients", () => {
        it("should start from zero", () => {
            expect(instance.connectedClients).to.eql(0);
        });

        it("should increase when clientConnected is emitted", () => {
            server.emit("clientConnected");
            expect(instance.connectedClients).to.eql(1);
        });

        it("should decrease when clientDisconnected is emitted", () => {
            server.emit("clientConnected");
            server.emit("clientDisconnected");
            expect(instance.connectedClients).to.eql(0);
        });

        it("should track maximum clients connected", () => {
            server.emit("clientConnected");
            server.emit("clientDisconnected");
            expect(instance.maxConnectedClients).to.eql(1);
        });

        it("should grow past 1", () => {
            server.emit("clientConnected");
            server.emit("clientConnected");
            server.emit("clientConnected");
            expect(instance.connectedClients).to.eql(3);
        });

        it("should publish it every 10s", (done) => {
            server.emit("clientConnected");
            server.emit("clientConnected");

            server.on("testPublished", (packet) => {
                if (packet.topic === "$SYS/42/clients/connected") {
                    expect(packet.payload).to.eql("2");
                    done();
                }
            });

            clock.tick(interval * 1000);
        });
    });

    describe("counting published messages", () => {
        it("should start from zero", () => {
            expect(instance.publishedMessages).to.eql(0);
        });

        it("should increase when published is emitted", () => {
            server.emit("published", { topic: "mosca/stats/test/publishes" });
            expect(instance.publishedMessages).to.eql(1);
        });

        it("should increase when published is emitted (two)", () => {
            server.emit("published", { topic: "mosca/stats/test/publishes" });
            server.emit("published", { topic: "mosca/stats/test/publishes" });
            expect(instance.publishedMessages).to.eql(2);
        });

        it("should publish it every 10s", (done) => {
            server.emit("published", { topic: "mosca/stats/test/publishes" });
            server.emit("published", { topic: "mosca/stats/test/publishes" });
            server.emit("published", { topic: "mosca/stats/test/publishes" });

            server.on("testPublished", (packet) => {
                if (packet.topic === "$SYS/42/publish/received") {
                    expect(packet.payload).to.eql("3");
                    done();
                }
            });

            clock.tick(interval * 1000);
        });
    });

    describe("tracking load", () => {
        let toBeCleared;

        afterEach(() => {
            if (toBeCleared) {
                clearInterval(toBeCleared);
            }
        });

        const events = {
            published: "publishedMessages",
            clientConnected: "connectedClients"
        };

        const topics = {
            published: "/load/publish/received/",
            clientConnected: "/load/connections/"
        };

        const buildTimer = {
            published() {
                return setInterval(() => {
                    server.emit("published", { topic: "mosca/stats/test/publishes" });
                    server.emit("published", { topic: "mosca/stats/test/publishes" });
                }, interval * 1000);
            },
            clientConnected(minutes) {
                return setInterval(() => {
                    server.emit("clientConnected");
                    server.emit("clientConnected");
                }, interval * 1000);
            }
        };

        Object.keys(events).forEach((event) => {
            describe(event, () => {

                describe("m15", () => {

                    it("should start from zero", () => {
                        server.emit(event);
                        server.emit(event);
                        expect(instance.load.m15[events[event]]).to.eql(0);
                    });

                    it("should cover the last 15 minutes", () => {
                        toBeCleared = buildTimer[event](15);
                        clock.tick(15 * 60 * 1000 + 1);
                        expect(instance.load.m15[events[event]]).to.eql(1.26);
                    });

                    it("should publish it", (done) => {
                        toBeCleared = buildTimer[event](15);

                        let count = 0;

                        server.on("testPublished", (packet) => {
                            if (packet.topic === `$SYS/42${topics[event]}15min`) {
                                count++;

                                if (count % (15 * 6) === 0) {
                                    expect(packet.payload).to.eql("1.26");
                                    done();
                                }
                            }
                        });

                        clock.tick(60 * 1000 * 15);
                    });
                });

                describe("m5", () => {

                    it("should start from zero", () => {
                        server.emit(event);
                        server.emit(event);
                        expect(instance.load.m5[events[event]]).to.eql(0);
                    });

                    it("should cover the last 5 minutes", () => {
                        toBeCleared = buildTimer[event](5);
                        clock.tick(5 * 60 * 1000 + 1);
                        expect(instance.load.m5[events[event]]).to.eql(1.24);
                    });

                    it("should publish it", (done) => {
                        toBeCleared = buildTimer[event](5);

                        let count = 0;

                        server.on("testPublished", (packet) => {
                            if (packet.topic === `$SYS/42${topics[event]}5min`) {
                                count++;

                                if (count % (5 * 6) === 0) {
                                    expect(packet.payload).to.eql("1.24");
                                    done();
                                }
                            }
                        });

                        clock.tick(60 * 1000 * 5);
                    });
                });

                describe("m1", () => {

                    it("should start from zero", () => {
                        server.emit(event);
                        server.emit(event);
                        expect(instance.load.m1[events[event]]).to.eql(0);
                    });

                    it("should cover the last minute", () => {
                        toBeCleared = buildTimer[event](1);
                        clock.tick(60 * 1000 + 1);
                        expect(instance.load.m1[events[event]]).to.eql(1.13);
                    });

                    it("should publish it", (done) => {
                        toBeCleared = buildTimer[event](1);

                        let count = 0;

                        server.on("testPublished", (packet) => {
                            if (packet.topic === `$SYS/42${topics[event]}1min`) {
                                count++;

                                if (count % 6 === 0) {
                                    expect(packet.payload).to.eql("1.13");
                                    done();
                                }
                            }
                        });

                        clock.tick(60 * 1000);
                    });
                });
            });
        });
    });

    describe("on closed", () => {
        ["clientConnected", "clientDisconnected", "published"].forEach((event) => {
            it(`should remove the ${event} event from the server`, () => {
                server.emit("closed");
                expect(server.listeners(event).length).to.eql(0);
            });
        });
    });

    it("should publish the version every 10s", (done) => {
        const version = adone.package.version;
        server.on("testPublished", (packet) => {
            if (packet.topic === "$SYS/42/version") {
                expect(packet.payload).to.eql(version);
                done();
            }
        });

        clock.tick(interval * 1000);
    });

    it("should publish the start time", (done) => {
        server.on("testPublished", (packet) => {
            if (packet.topic === "$SYS/42/started_at") {
                expect(packet.payload).to.eql(instance.started.toISOString());
                done();
            }
        });

        clock.tick(interval * 1000);
    });

    it("should publish the uptime every 10s", (done) => {
        server.on("testPublished", (packet) => {
            if (packet.topic === "$SYS/42/uptime") {
                expect(packet.payload).to.eql("10 seconds");
                done();
            }
        });

        clock.tick(interval * 1000);
    });

    it("should publish the uptime (bis)", (done) => {
        clock.tick(60 * 1000 * 2);

        server.on("testPublished", function func(packet) {
            if (packet.topic === "$SYS/42/uptime" &&
                packet.payload === "180 seconds") {
                server.removeListener("testPublished", func);
                done();
            }
        });

        clock.tick(60 * 1000);
    });

    describe("memory", () => {
        let stb;

        beforeEach(() => {
            stb = stub(process, "memoryUsage");
            stb.returns({ rss: 4201, heapUsed: 4202, heapTotal: 4203 });
        });

        afterEach(() => {
            stb.restore();
        });

        const stats = {
            rss: "rss",
            heapTotal: "heap/maximum",
            heapUsed: "heap/current"
        };

        Object.keys(stats).forEach((stat) => {
            it(`should publish ${stat} every minute`, (done) => {
                server.on("testPublished", (packet) => {
                    const mem = process.memoryUsage();
                    if (packet.topic === `$SYS/42/memory/${stats[stat]}`) {
                        expect(packet.payload).to.eql(`${mem[stat]}`);
                        done();
                    }
                });

                clock.tick(interval * 1000);
            });
        });
    });
});
