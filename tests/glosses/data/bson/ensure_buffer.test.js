const srcPath = (...args) => adone.getPath("src/glosses/data/bson", ...args);

const ensureBuffer = require(srcPath("ensure_buffer"));

describe("ensureBuffer tests", () => {
    it("should be a function", () => {
        expect(ensureBuffer).to.be.a("function");
    });

    it("should return the exact same buffer if a buffer is passed in", () => {
        const bufferIn = Buffer.alloc(10);
        let bufferOut;

        expect(() => {
            bufferOut = ensureBuffer(bufferIn);
        }).to.not.throw(Error);

        expect(bufferOut).to.equal(bufferIn);
    });

    it("should wrap a UInt8Array with a buffer", () => {
        const arrayIn = Uint8Array.from([1, 2, 3]);
        let bufferOut;

        expect(() => {
            bufferOut = ensureBuffer(arrayIn);
        }).to.not.throw(Error);

        expect(bufferOut).to.be.an.instanceOf(Buffer);
        expect(bufferOut.buffer).to.equal(arrayIn.buffer);
    });

    [0, 12, -1, "", "foo", null, undefined, ["list"], {}, /x/].forEach((item) => {
        it(`should throw if input is ${typeof item}: ${item}`, () => {
            expect(() => {
                ensureBuffer(item);
            }).to.throw(TypeError);
        });
    });

    [
    /* eslint-disable */
    Int8Array,
    Uint8ClampedArray,
    Int16Array,
    Uint16Array,
    Int32Array,
    Uint32Array,
    Float32Array,
    Float64Array
    /* eslint-enable */
    ].forEach((TypedArray) => {
        it(`should throw if input is typed array ${TypedArray.name}`, () => {
            const typedArray = new TypedArray();
            expect(() => {
                ensureBuffer(typedArray);
            }).to.throw(TypeError);
        });
    });
});
