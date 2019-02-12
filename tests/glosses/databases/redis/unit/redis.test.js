describe("database", "redis", "unit", "Redis", () => {
    const { database: { redis } } = adone;
    const { Redis } = redis;

    describe("constructor", () => {
        it("should parse options correctly", () => {
            stub(Redis.prototype, "connect").returns(Promise.resolve());

            const getOption = (...args) => {
                const redis = new Redis(...args);
                return redis.options;
            };

            let option;
            try {
                option = getOption();
                expect(option).to.have.property("port", 6379);
                expect(option).to.have.property("host", "localhost");
                expect(option).to.have.property("family", 4);

                option = getOption(6380);
                expect(option).to.have.property("port", 6380);
                expect(option).to.have.property("host", "localhost");

                option = getOption("6380");
                expect(option).to.have.property("port", 6380);

                option = getOption(6381, "192.168.1.1");
                expect(option).to.have.property("port", 6381);
                expect(option).to.have.property("host", "192.168.1.1");

                option = getOption(6381, "192.168.1.1", {
                    password: "123",
                    db: 2
                });
                expect(option).to.have.property("port", 6381);
                expect(option).to.have.property("host", "192.168.1.1");
                expect(option).to.have.property("password", "123");
                expect(option).to.have.property("db", 2);

                option = getOption("redis://:authpassword@127.0.0.1:6380/4");
                expect(option).to.have.property("port", 6380);
                expect(option).to.have.property("host", "127.0.0.1");
                expect(option).to.have.property("password", "authpassword");
                expect(option).to.have.property("db", 4);

                option = getOption("redis://127.0.0.1/");
                expect(option).to.have.property("db", 0);

                option = getOption("/tmp/redis.sock");
                expect(option).to.have.property("path", "/tmp/redis.sock");

                option = getOption({
                    port: 6380,
                    host: "192.168.1.1"
                });
                expect(option).to.have.property("port", 6380);
                expect(option).to.have.property("host", "192.168.1.1");

                option = getOption({
                    path: "/tmp/redis.sock"
                });
                expect(option).to.have.property("path", "/tmp/redis.sock");

                option = getOption({
                    port: "6380"
                });
                expect(option).to.have.property("port", 6380);

                option = getOption({
                    showFriendlyErrorStack: true
                });
                expect(option).to.have.property("showFriendlyErrorStack", true);

                option = getOption(6380, {
                    host: "192.168.1.1"
                });
                expect(option).to.have.property("port", 6380);
                expect(option).to.have.property("host", "192.168.1.1");

                option = getOption("6380", {
                    host: "192.168.1.1"
                });
                expect(option).to.have.property("port", 6380);
            } catch (err) {
                Redis.prototype.connect.restore();
                throw err;
            }
            Redis.prototype.connect.restore();
        });

        it("should throw when arguments is invalid", () => {
            expect(() => {
                new Redis(false);
            }).to.throw(adone.error.InvalidArgumentException);
        });
    });

    describe(".createClient", () => {
        it("should redirect to constructor", () => {
            const _redis = redis.createClient({ name: "pass", lazyConnect: true });
            expect(_redis.options).to.have.property("name", "pass");
            expect(_redis.options).to.have.property("lazyConnect", true);
        });
    });

    describe("flushQueue", () => {
        it("should flush all queues by default", () => {
            const flushQueue = Redis.prototype.flushQueue;
            const redis = {
                offlineQueue: [{ command: { reject() { } } }],
                commandQueue: [{ command: { reject() { } } }]
            };
            const offline = mock(redis.offlineQueue[0].command);
            const command = mock(redis.commandQueue[0].command);
            offline.expects("reject").once();
            command.expects("reject").once();
            flushQueue.call(redis);
            offline.verify();
            command.verify();
        });

        it("should be able to ignore a queue", () => {
            const flushQueue = Redis.prototype.flushQueue;
            const redis = {
                offlineQueue: [{ command: { reject() { } } }],
                commandQueue: [{ command: { reject() { } } }]
            };
            const offline = mock(redis.offlineQueue[0].command);
            const command = mock(redis.commandQueue[0].command);
            offline.expects("reject").once();
            command.expects("reject").never();
            flushQueue.call(redis, new Error(), { commandQueue: false });
            offline.verify();
            command.verify();
        });
    });
});
