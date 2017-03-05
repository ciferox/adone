import _if from "adone/glosses/fast/transforms/if";

const { core } = adone;

function toArray(stream) {
    return new Promise((resolve, reject) => {
        const res = [];
        stream
            .once("end", () => resolve(res))
            .on("data", (x) => res.push(x))
            .once("error", (err) => {
                stream.end({ force: true });
                reject(err);
            })
            .resume();
    });
}

describe("Fast", () => {
    describe("transforms", () => {
        describe("if", () => {
            it("should pass true values", async () => {
                const _truev = [];
                const _falsev = [];
                const _true = core().map((x) => {
                    _truev.push(x);
                    return x;
                });
                const _false = core().map((x) => {
                    _falsev.push(x);
                    return x;
                });
                const s = _if((x) => x % 2 === 0, _true, _false);
                for (let i = 0; i < 10; i += 2) {
                    s.write(i);
                }
                s.end();
                const values = await toArray(s);
                expect(values).to.be.deep.equal([0, 2, 4, 6, 8]);
                expect(_truev).to.be.deep.equal([0, 2, 4, 6, 8]);
                expect(_falsev).to.be.empty;
            });

            it("should pass false values", async () => {
                const _truev = [];
                const _falsev = [];
                const _true = core().map((x) => {
                    _truev.push(x);
                    return x;
                });
                const _false = core().map((x) => {
                    _falsev.push(x);
                    return x;
                });
                const s = _if((x) => x % 2 !== 0, _true, _false);
                for (let i = 0; i < 10; i += 2) {
                    s.write(i);
                }
                s.end();
                const values = await toArray(s);
                expect(values).to.be.deep.equal([0, 2, 4, 6, 8]);
                expect(_falsev).to.be.deep.equal([0, 2, 4, 6, 8]);
                expect(_truev).to.be.empty;
            });

            it("should correctly handle true and false values", async () => {
                const _truev = [];
                const _falsev = [];
                const _true = core().map(async (x) => {
                    _truev.push(x);
                    return x;
                });
                const _false = core().map(async (x) => {
                    _falsev.push(x);
                    return x;
                });
                const s = _if((x) => x % 2 === 0, _true, _false);
                for (let i = 0; i < 10; ++i) {
                    s.write(i);
                }
                s.end();
                const values = await toArray(s);
                expect(values).to.be.deep.equal([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
                expect(_truev).to.be.deep.equal([0, 2, 4, 6, 8]);
                expect(_falsev).to.be.deep.equal([1, 3, 5, 7, 9]);
            });

            it("should support async functions", async () => {
                const _truev = [];
                const _falsev = [];
                const _true = core().map((x) => {
                    _truev.push(x);
                    return x;
                });
                const _false = core().map((x) => {
                    _falsev.push(x);
                    return x;
                });
                const s = _if(async (x) => x % 2 !== 0, _true, _false);
                for (let i = 0; i < 10; i += 2) {
                    s.write(i);
                }
                s.end();
                const values = await toArray(s);
                expect(values).to.be.deep.equal([0, 2, 4, 6, 8]);
                expect(_falsev).to.be.deep.equal([0, 2, 4, 6, 8]);
                expect(_truev).to.be.empty;
            });

            it("should handle backpressure", async () => {
                let _truev = [];
                let _falsev = [];
                const _true = core().map((x) => {
                    _truev.push(x);
                    return x;
                });
                const _false = core().map((x) => {
                    _falsev.push(x);
                    return x;
                });
                const s = _if((x) => x % 2 !== 0, _true, _false);
                let i = 1;
                let values = [];
                s.on("data", (x) => values.push(x));
                while (s.write(i += 2));
                s.resume();
                await adone.promise.delay(1);
                s.pause();
                expect(values).not.to.be.empty;
                expect(_truev).not.to.be.empty;
                expect(_falsev).to.be.empty;

                i = 0;
                values = [];
                _truev = [];
                _falsev = [];
                while (s.write(i += 2));
                s.resume();
                await adone.promise.delay(1);
                s.pause();
                expect(values).not.to.be.empty;
                expect(_truev).to.be.empty;
                expect(_falsev).not.to.be.empty;

                i = 0;
                values = [];
                _truev = [];
                _falsev = [];
                while (s.write(++i));
                s.resume();
                await adone.promise.delay(1);
                s.pause();
                expect(values).not.to.be.empty;
                expect(_truev).not.to.be.empty;
                expect(_falsev).not.to.be.empty;
                expect(values).to.have.lengthOf(_truev.length + _falsev.length);
            });

            it("should write to the output if the false stream is a false value", async () => {
                const _true = core().map((x) => `true ${x}`);
                const s = _if((x) => x % 2 === 0, _true);
                s.write(1);
                s.write(2);
                s.write(3);
                s.end();
                const values = await toArray(s);
                expect(values.sort()).to.be.deep.equal([1, 3, "true 2"]);
            });

            it("should write to the output if the true stream is a false value", async () => {
                const _false = core().map((x) => `false ${x}`);
                const s = _if((x) => x % 2 === 0, null, _false);
                s.write(1);
                s.write(2);
                s.write(3);
                s.end();
                const values = await toArray(s);
                expect(values.sort()).to.be.deep.equal([2, "false 1", "false 3"]);
            });

            it("should throw if no stream is provided", async () => {
                let err;
                try {
                    _if((x) => x % 2 === 0);
                } catch (_err) {
                    err = _err;
                }
                expect(err).to.be.ok;
                expect(err).to.be.instanceOf(adone.x.InvalidArgument);
                expect(err.message).to.be.equal("You must provide at least one stream");
            });
        });
    });
});
