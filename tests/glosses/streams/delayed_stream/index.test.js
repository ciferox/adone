describe("stream", "DelayedStream", () => {
    const {
        stream: {
            DelayedStream
        },
        std: {
            http,
            stream: {
                PassThrough
            }
        }
    } = adone;

    specify("http upload", (done) => {
        const UPLOAD = Buffer.alloc(10 * 1024 * 1024);

        const server = http.createServer((req, res) => {
            const delayed = DelayedStream.create(req, { maxDataSize: UPLOAD.length });

            setTimeout(() => {
                res.writeHead(200);
                delayed.pipe(res);
            }, 10);
        });
        server.listen(0, () => {
            const request = http.request({
                method: "POST",
                port: server.address().port
            });

            request.write(UPLOAD);
            request.end();

            request.on("response", (res) => {
                let received = 0;
                res
                    .on("data", (chunk) => {
                        received += chunk.length;
                    })
                    .on("end", () => {
                        assert.equal(received, UPLOAD.length);
                        server.close(done);
                    });
            });
        });
    });

    describe("autopause", () => {
        it("should pause by default", () => {
            const source = new PassThrough();

            const s = spy(source, "pause");

            DelayedStream.create(source);

            expect(s).to.have.been.calledOnce;
        });

        it("should not pause when pauseStream is false", () => {
            const source = new PassThrough();

            const s = spy(source, "pause");

            DelayedStream.create(source, { pauseStream: false });

            expect(s).to.have.not.been.called;
        });
    });

    describe("pause", () => {
        it("should pause stream", () => {
            const source = new PassThrough();
            const delayedStream = DelayedStream.create(source, { pauseStream: false });
            const s = spy(source, "pause");
            delayedStream.pause();
            expect(s).to.have.been.calledOnce;
        });
    });

    specify("stream test", () => {
        const source = new PassThrough();
        const delayedStream = DelayedStream.create(source, { pauseStream: false });

        // delayedStream must not emit until we resume
        const emit = spy(delayedStream, "emit");

        // but our original source must emit
        const params = [];
        source.on("foo", (param) => {
            params.push(param);
        });

        source.emit("foo", 1);
        source.emit("foo", 2);

        // Make sure delayedStream did not emit, and source did
        assert.deepEqual(params, [1, 2]);
        expect(emit).to.have.not.been.called;

        const sResume = spy(source, "resume");
        delayedStream.resume();
        expect(emit).to.have.been.calledTwice;
        const fc = emit.getCall(0);
        const sc = emit.getCall(1);
        expect(fc.args).to.be.deep.equal(["foo", 1]);
        expect(sc.args).to.be.deep.equal(["foo", 2]);
        expect(sResume).to.have.been.calledOnce;

        // Calling resume again will delegate to source
        delayedStream.resume();
        expect(sResume).to.have.been.calledTwice;

        // Emitting more events directly leads to them being emitted
        source.emit("foo", 3);
        expect(emit).to.have.been.calledThrice;
        expect(emit.getCall(2).args).to.be.deep.equal(["foo", 3]);
    });

    it("handles source errors", async () => {
        const source = new PassThrough();
        const delayedStream = DelayedStream.create(source, { pauseStream: false });

        // We deal with this by attaching a no-op listener to 'error' on the source
        // when creating a new DelayedStream. This way error events on the source
        // won't throw.
        source.emit("error", new Error("something went wrong"));

        await adone.promise.delay(100);
    });

    specify("max data size", () => {
        const source = new PassThrough();
        const delayedStream = DelayedStream.create(source, { maxDataSize: 1024, pauseStream: false });

        source.emit("data", Buffer.alloc(1024));
        const er = spy();
        delayedStream.on("error", er);
        source.emit("data", Buffer.alloc(1));
        expect(er).to.have.been.calledOnce;
        expect(er.args[0][0].message).to.be.match(/1024 bytes exceeded/);
    });

    specify("readable prop proxy", () => {
        const source = new PassThrough();
        const delayedStream = DelayedStream.create(source, { pauseStream: false });

        source.readable = 24;
        assert.strictEqual(delayedStream.readable, source.readable);
    });
});
