const {
    is,
    stream: { pull: { pipe, itrPushable } }
} = adone;

describe("itrPushable", () => {
    const collect = async (source) => {
        const input = [];
        for await (const value of source) {
            input.push(value);
        }
        return input;
    };

    it("should push input slowly", async () => {
        const source = itrPushable();
        const input = [1, 2, 3];
        for (let i = 0; i < input.length; i++) {
            setTimeout(() => source.push(input[i]), i * 10);
        }
        setTimeout(() => source.end(), input.length * 10);
        const output = await pipe(source, collect);
        assert.deepEqual(output, input);
    });

    it("should buffer input", async () => {
        const source = itrPushable();
        const input = [1, 2, 3];
        input.forEach((v) => source.push(v));
        setTimeout(() => source.end());
        const output = await pipe(source, collect);
        assert.deepEqual(output, input);
    });

    it("should buffer some inputs", async () => {
        const source = itrPushable();
        const input = [1, [2.1, 2.2, 2.3], 3, 4, 5, [6.1, 6.2, 6.3, 6.4], 7];
        for (let i = 0; i < input.length; i++) {
            setTimeout(() => {
                if (is.array(input[i])) {
                    input[i].forEach((v) => source.push(v));
                } else {
                    source.push(input[i]);
                }
            }, i * 10);
        }
        setTimeout(() => source.end(), input.length * 10);
        const output = await pipe(source, collect);
        assert.deepEqual(output, [].concat.apply([], input));
    });

    it("should allow end before start", async () => {
        const source = itrPushable();
        const input = [1, 2, 3];
        input.forEach((v) => source.push(v));
        source.end();
        const output = await pipe(source, collect);
        assert.deepEqual(output, input);
    });

    it("should end with error immediately", async () => {
        const source = itrPushable();
        const input = [1, 2, 3];
        input.forEach((v) => source.push(v));
        source.end(new Error("boom"));
        const err = await assert.throws(async () => pipe(source, collect));
        assert.deepEqual(err.message, "boom");
    });

    it("should end with error in the middle", async () => {
        const source = itrPushable();
        const input = [1, new Error("boom"), 3];
        for (let i = 0; i < input.length; i++) {
            setTimeout(() => {
                if (input[i] instanceof Error) {
                    source.end(input[i]);
                } else {
                    source.push(input[i]);
                }
            }, i * 10);
        }
        setTimeout(() => source.end(), input.length * 10);
        const err = await assert.throws(async () => pipe(source, collect));
        assert.deepEqual(err.message, "boom");
    });

    it("should allow end without push", async () => {
        const source = itrPushable();
        const input = [];
        source.end();
        const output = await pipe(source, collect);
        assert.deepEqual(output, input);
    });

    it("should allow next after end", async () => {
        const source = itrPushable();
        const input = [1];
        source.push(input[0]);
        let next = await source.next();
        expect(next.done).to.be.false;
        assert.equal(next.value, input[0]);
        source.end();
        next = await source.next();
        expect(next.done).to.be.true;
        next = await source.next();
        expect(next.done).to.be.true;
    });

    it("should call onEnd", (done) => {
        const source = itrPushable(() => done());
        const input = [1, 2, 3];
        for (let i = 0; i < input.length; i++) {
            setTimeout(() => source.push(input[i]), i * 10);
        }
        setTimeout(() => source.end(), input.length * 10);
        pipe(source, collect);
    });

    it("should call onEnd if passed in options object", (done) => {
        const source = itrPushable({ onEnd: () => done() });
        const input = [1, 2, 3];
        for (let i = 0; i < input.length; i++) {
            setTimeout(() => source.push(input[i]), i * 10);
        }
        setTimeout(() => source.end(), input.length * 10);
        pipe(source, collect);
    });

    it("should call onEnd even if not piped", (done) => {
        const source = itrPushable(() => done());
        source.end();
    });

    it("should call onEnd with error", (done) => {
        const source = itrPushable((err) => {
            assert.equal(err.message, "boom");
            done();
        });
        setTimeout(() => source.end(new Error("boom")), 10);
        pipe(source, collect).catch(() => { });
    });

    it("should call onEnd on return before end", (done) => {
        const input = [1, 2, 3, 4, 5];
        const max = 2;
        const output = [];

        const source = itrPushable(() => {
            assert.deepEqual(output, input.slice(0, max));
            done();
        });

        input.forEach((v, i) => setTimeout(() => source.push(v), i * 10));
        setTimeout(() => source.end(), input.length * 10);
        (async () => {
            let i = 0;
            for await (const value of source) {
                output.push(value);
                i++;
                if (i === max) {
                    break;
                }
            }
        })();
    });

    it("should call onEnd by calling return", (done) => {
        const input = [1, 2, 3, 4, 5];
        const max = 2;
        const output = [];

        const source = itrPushable(() => {
            assert.deepEqual(output, input.slice(0, max));
            done();
        });

        input.forEach((v, i) => setTimeout(() => source.push(v), i * 10));
        setTimeout(() => source.end(), input.length * 10);
        (async () => {
            let i = 0;
            while (i !== max) {
                i++;
                const { value } = await source.next();
                output.push(value);
            }
            source.return();
        })();
    });

    it("should call onEnd once", (done) => {
        const input = [1, 2, 3, 4, 5];

        let count = 0;
        const source = itrPushable(() => {
            count++;
            assert.equal(count, 1);
            setTimeout(() => done(), 50);
        });

        input.forEach((v, i) => setTimeout(() => source.push(v), i * 10));
        (async () => {
            await source.next();
            source.return();
            source.next();
        })();
    });

    it("should call onEnd by calling throw", (done) => {
        const input = [1, 2, 3, 4, 5];
        const max = 2;
        const output = [];

        const source = itrPushable((err) => {
            assert.equal(err.message, "boom");
            assert.deepEqual(output, input.slice(0, max));
            done();
        });

        input.forEach((v, i) => setTimeout(() => source.push(v), i * 10));
        setTimeout(() => source.end(), input.length * 10);
        (async () => {
            let i = 0;
            while (i !== max) {
                i++;
                const { value } = await source.next();
                output.push(value);
            }
            source.throw(new Error("boom"));
        })();
    });

    it("should support writev", async () => {
        const source = itrPushable({ writev: true });
        const input = [1, 2, 3];
        input.forEach((v) => source.push(v));
        setTimeout(() => source.end());
        const output = await pipe(source, collect);
        assert.deepEqual(output[0], input);
    });

    it("should support writev and end with error", async () => {
        const source = itrPushable({ writev: true });
        const input = [1, 2, 3];
        input.forEach((v) => source.push(v));
        source.end(new Error("boom"));
        const err = await assert.throws(async () => pipe(source, collect));
        assert.deepEqual(err.message, "boom");
    });
});
