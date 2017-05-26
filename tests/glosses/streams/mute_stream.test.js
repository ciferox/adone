const { std: { stream: { Stream } }, stream: { MuteStream } } = adone;

// some marker objects
const END = {};
const PAUSE = {};
const RESUME = {};

class PassThrough extends Stream {
    constructor() {
        super();
        this.readable = this.writable = true;
    }

    write(c) {
        this.emit("data", c);
        return true;
    }

    end(c) {
        if (c) {
            this.write(c);
        }
        this.emit("end");
    }

    pause() {
        this.emit("pause");
    }

    resume() {
        this.emit("resume");
    }
}

describe("MuteStream", () => {
    it("incoming", (done) => {
        const ms = new MuteStream();
        const str = new PassThrough();
        str.pipe(ms);

        const expect = ["foo", "boo", END];
        ms.on("data", (c) => {
            assert.equal(c, expect.shift());
        });
        ms.on("end", () => {
            assert.equal(END, expect.shift());
            done();
        });
        str.write("foo");
        ms.mute();
        str.write("bar");
        ms.unmute();
        str.write("boo");
        ms.mute();
        str.write("blaz");
        str.end("grelb");
    });

    it("outgoing", (done) => {
        const ms = new MuteStream();
        const str = new PassThrough();
        ms.pipe(str);

        const expect = ["foo", "boo", END];
        str.on("data", (c) => {
            assert.equal(c, expect.shift());
        });
        str.on("end", () => {
            assert.equal(END, expect.shift());
            done();
        });

        ms.write("foo");
        ms.mute();
        ms.write("bar");
        ms.unmute();
        ms.write("boo");
        ms.mute();
        ms.write("blaz");
        ms.end("grelb");
    });

    it("isTTY", (done) => {
        const str = new PassThrough();
        str.isTTY = true;
        str.columns = 80;
        str.rows = 24;

        let ms = new MuteStream();
        assert.equal(ms.isTTY, false);
        assert.equal(ms.columns, undefined);
        assert.equal(ms.rows, undefined);
        ms.pipe(str);
        assert.equal(ms.isTTY, true);
        assert.equal(ms.columns, 80);
        assert.equal(ms.rows, 24);
        str.isTTY = false;
        assert.equal(ms.isTTY, false);
        assert.equal(ms.columns, 80);
        assert.equal(ms.rows, 24);
        str.isTTY = true;
        assert.equal(ms.isTTY, true);
        assert.equal(ms.columns, 80);
        assert.equal(ms.rows, 24);
        ms.isTTY = false;
        assert.equal(ms.isTTY, false);
        assert.equal(ms.columns, 80);
        assert.equal(ms.rows, 24);

        ms = new MuteStream();
        assert.equal(ms.isTTY, false);
        str.pipe(ms);
        assert.equal(ms.isTTY, true);
        str.isTTY = false;
        assert.equal(ms.isTTY, false);
        str.isTTY = true;
        assert.equal(ms.isTTY, true);
        ms.isTTY = false;
        assert.equal(ms.isTTY, false);

        done();
    });

    it("pause/resume incoming", (done) => {
        const str = new PassThrough();
        const ms = new MuteStream();
        let expect;
        str.on("pause", () => {
            assert.equal(PAUSE, expect.shift());
        });
        str.on("resume", () => {
            assert.equal(RESUME, expect.shift());
        });
        expect = [PAUSE, RESUME, PAUSE, RESUME];
        str.pipe(ms);
        ms.pause();
        ms.resume();
        ms.pause();
        ms.resume();
        assert.equal(expect.length, 0, "saw all events");
        done();
    });

    it("replace with *", () => {
        const str = new PassThrough();
        const ms = new MuteStream({ replace: "*" });
        str.pipe(ms);
        const expect = ["foo", "*****", "bar", "***", "baz", "boo", "**", "****"];

        ms.on("data", (c) => {
            assert.equal(c, expect.shift());
        });

        str.write("foo");
        ms.mute();
        str.write("12345");
        ms.unmute();
        str.write("bar");
        ms.mute();
        str.write("baz");
        ms.unmute();
        str.write("baz");
        str.write("boo");
        ms.mute();
        str.write("xy");
        str.write("xyzΩ");

        assert.equal(expect.length, 0);
    });

    it("replace with ~YARG~", () => {
        const str = new PassThrough();
        const ms = new MuteStream({ replace: "~YARG~" });
        str.pipe(ms);
        const expect = ["foo", "~YARG~~YARG~~YARG~~YARG~~YARG~", "bar",
            "~YARG~~YARG~~YARG~", "baz", "boo", "~YARG~~YARG~",
            "~YARG~~YARG~~YARG~~YARG~"];

        ms.on("data", (c) => {
            assert.equal(c, expect.shift());
        });

        // also throw some unicode in there, just for good measure.
        str.write("foo");
        ms.mute();
        str.write("ΩΩ");
        ms.unmute();
        str.write("bar");
        ms.mute();
        str.write("Ω");
        ms.unmute();
        str.write("baz");
        str.write("boo");
        ms.mute();
        str.write("Ω");
        str.write("ΩΩ");

        assert.equal(expect.length, 0);
    });
});
