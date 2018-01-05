const {
    net: { spdy: transport }
} = adone;

const base = transport.protocol.base;

describe("Frame Scheduler", () => {
    let scheduler;
    beforeEach(() => {
        scheduler = base.Scheduler.create();
    });

    function chunk(stream, priority, chunks, callback) {
        return {
            stream,
            priority,
            chunks,
            callback
        };
    }

    function expect(string, done) {
        let actual = "";
        const pending = scheduler.count;
        let got = 0;
        scheduler.on("data", (chunk) => {
            actual += chunk;
            if (++got !== pending) {
                return;
            }

            assert.equal(actual, string);
            done();
        });
    }

    it("should schedule and emit one frame", (done) => {
        scheduler.schedule(chunk(0, 0, ["hello", " ", "world"]));

        expect("hello world", done);
    });

    it("should schedule and emit two frames", (done) => {
        scheduler.schedule(chunk(0, 0, ["hello", " "]));
        scheduler.schedule(chunk(0, 0, ["world"]));

        expect("hello world", done);
    });

    it("should interleave between two streams", (done) => {
        scheduler.schedule(chunk(0, 0, ["hello "]));
        scheduler.schedule(chunk(0, 0, [" hello "]));
        scheduler.schedule(chunk(1, 0, ["world!"]));
        scheduler.schedule(chunk(1, 0, ["world"]));

        expect("hello world! hello world", done);
    });

    it("should interleave between two shuffled streams", (done) => {
        scheduler.schedule(chunk(0, 0, ["hello "]));
        scheduler.schedule(chunk(1, 0, ["world!"]));
        scheduler.schedule(chunk(1, 0, ["world"]));
        scheduler.schedule(chunk(0, 0, [" hello "]));

        expect("hello world! hello world", done);
    });

    it("should interleave between three streams", (done) => {
        scheduler.schedule(chunk(0, 0, ["hello "]));
        scheduler.schedule(chunk(1, 0, ["world!"]));
        scheduler.schedule(chunk(1, 0, ["world"]));
        scheduler.schedule(chunk(0, 0, [" hello "]));
        scheduler.schedule(chunk(2, 0, [" (yes)"]));

        expect("hello world! (yes) hello world", done);
    });

    it("should respect priority window", (done) => {
        scheduler.schedule(chunk(0, 0.5, ["a"]));
        scheduler.schedule(chunk(1, 0.4, ["b"]));
        scheduler.schedule(chunk(2, 0.3, ["c"]));
        scheduler.schedule(chunk(3, 0.2, ["d"]));
        scheduler.schedule(chunk(4, 0.1, ["f"]));
        scheduler.schedule(chunk(0, 0.5, ["A"]));
        scheduler.schedule(chunk(1, 0.4, ["B"]));
        scheduler.schedule(chunk(2, 0.3, ["C"]));

        expect("abcABCdf", done);
    });

    it("should not interleave sync data", (done) => {
        scheduler.schedule(chunk(0, false, ["hello "]));
        scheduler.schedule(chunk(1, false, ["world!"]));
        scheduler.schedule(chunk(1, false, ["world"]));
        scheduler.schedule(chunk(0, false, [" hello "]));
        scheduler.schedule(chunk(2, false, ["someone's "]));

        expect("hello world!world hello someone's ", done);
    });

    it("should not fail on big gap in priorities", (done) => {
        scheduler.schedule(chunk(255, false, ["hello"]));

        expect("hello", done);
    });

    it("should invoke callback on push", (done) => {
        scheduler.schedule(chunk(0, 0, ["hello "], () => {
            assert.equal(scheduler.read().toString(), 'hello ')
            done()
        }));
    });

    it("should synchronously dump data", () => {
        scheduler.schedule(chunk(0, false, ["hello"]));

        scheduler.dump();

        assert.equal(`${scheduler.read()  }`, "hello");
    });
});
