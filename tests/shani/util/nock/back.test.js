describe("shani", "util", "nock", "back", () => {
    const {
        shani: {
            util: { nock }
        },
        std: {
            http
        }
    } = adone;

    const nockBack = nock.back;

    const fixtures = new adone.fs.Directory(__dirname, "fixtures");

    nock.enableNetConnect();

    const originalMode = nockBack.currentMode;

    const testNock = (done) => {
        let dataCalled = false;

        const scope = nock("http://www.google.com")
            .get("/")
            .reply(200, "Hello World!");

        const req = http.request({
            host: "www.google.com",
            path: "/",
            port: 80
        }, (res) => {

            assert.equal(res.statusCode, 200);
            res.once("end", () => {
                assert.ok(dataCalled);
                scope.done();
                done();
            });
            res.on("data", (data) => {
                dataCalled = true;
                assert.ok(data instanceof Buffer, "data should be buffer");
                assert.equal(data.toString(), "Hello World!", "response should match");
            });
        });

        req.end();
    };

    const nockBackWithFixture = (doneTest, scopesLoaded) => {
        const scopesLength = scopesLoaded ? 1 : 0;

        nockBack("goodRequest.json", function (done) {
            assert.isTrue(this.scopes.length === scopesLength);
            http.get("http://www.google.com").end();
            this.assertScopesFinished();
            done();
            doneTest();
        });
    };

    beforeEach(() => {
        nock.cleanAll();
        nock.restore();
        nock.activate();
    });

    after(() => {
        nock.cleanAll();
        nock.restore();
    });

    it("nockBack throws an error when fixtures is not set", () => {
        assert.throws(() => {
            nockBack();
        });
    });

    it("nockBack throws an error when fixtureName is not a string", () => {
        nockBack.fixtures = fixtures.path();

        assert.throws(() => {
            nockBack();
        });
    });

    it("nockBack returns a promise when neither options nor nockbackFn are specified", (done) => {

        nockBack.fixtures = fixtures.path();

        const promise = nockBack("test-promise-fixture.json");
        assert.ok(promise);
        promise.then((params) => {
            const nockDone = params.nockDone;
            const context = params.context;
            assert.isFunction(nockDone);
            assert.isObject(context);
            done();
        });

    });

    it("nockBack returns a promise when nockbackFn is not specified", (done) => {

        nockBack.fixtures = fixtures.path();

        const promise = nockBack("test-promise-fixture.json", { test: "options" });
        assert.ok(promise);
        promise.then((params) => {
            const nockDone = params.nockDone;
            const context = params.context;
            assert.isFunction(nockDone);
            assert.isObject(context);
            done();
        });

    });

    describe("nockBack wild tests", () => {

        //  Manually disable net connectivity to confirm that dryrun enables it.
        before(() => {
            nock.disableNetConnect();
            nockBack.fixtures = fixtures.path();
            nockBack.setMode("wild");
        });

        after(() => {
            nockBack.setMode(originalMode);
        });


        it("normal nocks work", (done) => {
            testNock(done);
        });

        it("nock back doesn't do anything", (done) => {
            nockBackWithFixture(done, false);
        });
    });

    describe("nockBack dryrun tests", () => {
        //  Manually disable net connectivity to confirm that dryrun enables it.
        before(() => {
            nock.disableNetConnect();
            nockBack.fixture = fixtures.path();
            nockBack.setMode("dryrun");
        });

        it("goes to internet even when no nockBacks are running", (done) => {
            const req = http.request({
                host: "www.amazon.com",
                path: "/",
                port: 80
            }, (res) => {

                res.on("data", () => {
                    //node v 0.10 requires this listener
                });
                assert.oneOf(res.statusCode, [200, 301, 302]);
                done();
            });

            //  This should never happen.
            req.on("error", done);

            req.end();
        });

        it("normal nocks work", (done) => {
            testNock(done);
        });

        it("uses recorded fixtures", (done) => {
            nockBackWithFixture(done, true);
        });

        it("goes to internet, doesn't record new fixtures", {
            async before() {
                this.fixture = fixtures.getFile("someDryrunFixture.json");
                await this.fixture.unlink();
            },
            async after() {
                await this.fixture.unlink();
            }
        }, function (done) {
            let dataCalled = false;

            nockBack(this.fixture.path(), () => {
                const req = http.request({
                    host: "amazon.com",
                    path: "/",
                    port: 80
                }, (res) => {
                    assert.oneOf(res.statusCode, [200, 301, 302]);
                    res.on("end", () => {
                        assert.ok(dataCalled);
                        assert.isFalse(this.fixture.existsSync());
                        done();
                    });

                    res.on("data", (data) => {
                        dataCalled = true;
                    });

                });

                req.once("error", (err) => {
                    if (err.code !== "ECONNREFUSED") {
                        throw err;
                    }
                    done();
                });

                req.end();
            });
        });

        after(() => {
            nockBack.setMode(originalMode);
        });
    });

    describe("nockBack record tests", () => {
        before(() => {
            nockBack.setMode("record");
        });

        after(() => {
            nockBack.setMode(originalMode);
        });


        it("it records when configured correctly", {
            async before() {
                this.fixture = fixtures.getFile("someFixture.json");
                await this.fixture.unlink();
            },
            async after() {
                await this.fixture.unlink();
            }
        }, function (doneTest) {
            nockBack.fixtures = fixtures.path();

            const options = {
                host: "www.google.com", method: "GET", path: "/", port: 80
            };

            nockBack(this.fixture.filename(), (done) => {
                http.request(options).end();
                done();

                assert.isTrue(this.fixture.existsSync());
                doneTest();
            });
        });

        //Adding this test because there was an issue when not calling
        //nock.activate() after calling nock.restore()
        it("it can record twice", {
            async before() {
                this.fixture = fixtures.getFile("someFixture2.json");
                await this.fixture.unlink();
            },
            async after() {
                await this.fixture.unlink();
            }
        }, function (doneTest) {
            nockBack.fixtures = fixtures.path();

            const options = {
                host: "www.google.com", method: "GET", path: "/", port: 80
            };

            nockBack(this.fixture.filename(), (done) => {
                http.request(options).end();
                done();

                assert.isTrue(this.fixture.existsSync());
                doneTest();
            });

        });

        it("it shouldn't allow outside calls", (doneTest) => {
            const fixture = "wrongUri.json";

            nockBack(fixture, (done) => {
                http.get("http://www.amazon.com", (res) => {
                    done(new Error("should not request this"));
                }).on("error", (err) => {
                    assert.equal(err.message, 'Not allow net connect for "www.amazon.com:80/"');
                    done();
                    doneTest();
                });

            });

        });

        it("it loads your recorded tests", (doneTest) => {
            nockBack("goodRequest.json", function (done) {
                assert.isTrue(this.scopes.length > 0);
                http.get("http://www.google.com").end();
                this.assertScopesFinished();
                done();
                doneTest();
            });

        });

        it("it can filter after recording", {
            async before() {
                this.fixture = fixtures.getFile("filteredFixture.json");
                await this.fixture.unlink();
            },
            async after() {
                await this.fixture.unlink();
            }
        }, function (doneTest) {
            nockBack.fixtures = fixtures.path();

            const options = {
                host: "www.google.com", method: "GET", path: "/", port: 80
            };

            const afterRecord = function (scopes) {
                // You would do some filtering here, but for this test we'll just return an empty array
                return [];
            };

            nockBack(this.fixture.filename(), { afterRecord }, (done) => {
                http.request(options).end();
                done();

                assert.isTrue(this.fixture.existsSync());

                nockBack(this.fixture.filename(), function (done) {
                    assert.isTrue(this.scopes.length === 0);
                    done();
                    doneTest();
                });
            });
        });
    });

    describe("nockBack lockdown tests", () => {
        before(() => {
            nockBack.fixtures = fixtures.path();
            nockBack.setMode("lockdown");
        });

        after(() => {
            nockBack.setMode(originalMode);
        });

        it("normal nocks work", (done) => {
            testNock(done);
        });

        it("nock back loads scope", (done) => {
            nockBackWithFixture(done, true);
        });

        it("no unnocked http calls work", (done) => {
            const req = http.request({
                host: "google.com",
                path: "/"
            }, (res) => {
                done(new Error("should not come here!"));
            });

            req.on("error", (err) => {
                assert.equal(err.message.trim(), 'Not allow net connect for "google.com:80/"');
                done();
            });

            req.end();
        });
    });

    describe("recording", () => {
        let fixture;

        before(async () => {
            nock.enableNetConnect();
            nockBack.fixtures = fixtures.path();
            fixture = fixtures.getFile("recording_test.json");
            nockBack.setMode("record");
        });

        beforeEach(async () => {
            await fixture.unlink();
        });

        afterEach(async () => {
            await fixture.unlink();
        });

        after(() => {
            nockBack.setMode(originalMode);
        });

        it("recording", (done) => {
            nockBack("recording_test.json", (nockDone) => {
                http.get("http://google.com", (res) => {
                    res.once("end", () => {
                        nockDone();
                        let fixtureContent = JSON.parse(fixture.contentsSync("utf8"));
                        assert.equal(fixtureContent.length, 1);
                        fixtureContent = fixtureContent[0];
                        assert.equal(fixtureContent.method, "GET");
                        assert.equal(fixtureContent.path, "/");
                        assert.ok(fixtureContent.status == 302 || fixtureContent.status == 301);
                        done();
                    });
                    // Streams start in 'paused' mode and must be started.
                    // See https://nodejs.org/api/stream.html#stream_class_stream_readable
                    res.resume();
                });
            });
        });

        it("passes custom options to recorder", (done) => {
            nockBack("recording_test.json", { recorder: { enableReqheadersRecording: true } }, (nockDone) => {
                http.get("http://google.com", (res) => {
                    res.once("end", () => {
                        nockDone();
                        let fixtureContent = JSON.parse(fixture.contentsSync("utf8"));
                        assert.equal(fixtureContent.length, 1);
                        fixtureContent = fixtureContent[0];
                        assert.ok(fixtureContent.reqheaders);
                        done();
                    });
                    // Streams start in 'paused' mode and must be started.
                    // See https://nodejs.org/api/stream.html#stream_class_stream_readable
                    res.resume();
                });
            });
        });
    });
});
