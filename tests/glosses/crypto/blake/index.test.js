const {
    crypto: { blake: { blake2bHex, blake2s, blake2sHex, blake2sInit, blake2sUpdate, blake2sFinal } },
    fs
} = adone;

const fixture = (name) => adone.path.join(__dirname, "fixtures", name);

const hexToBytes = function (hex) {
    const ret = new Uint8Array(hex.length / 2);
    for (let i = 0; i < ret.length; i++) {
        ret[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
    }
    return ret;
};


// For performance testing: generates N bytes of input, hashes M times
// Measures and prints MB/second hash performance each time
const testSpeed = function (hashFn, N, M) {
    let startMs = new Date().getTime();

    const input = new Uint8Array(N);
    for (let i = 0; i < N; i++) {
        input[i] = i % 256;
    }
    const genMs = new Date().getTime();
    console.log(`Generated random input in ${genMs - startMs}ms`);
    startMs = genMs;

    for (let i = 0; i < M; i++) {
        const hashHex = hashFn(input);
        const hashMs = new Date().getTime();
        const ms = hashMs - startMs;
        startMs = hashMs;
        console.log(`Hashed in ${ms}ms: ${hashHex.substring(0, 20)}...`);
        console.log(`${Math.round(N / (1 << 20) / (ms / 1000) * 100) / 100} MB PER SECOND`);
    }
};


describe("crypto", "blake", () => {
    describe("blake2b", () => {
        it("basic", () => {
            // From the example computation in the RFC
            assert.equal(blake2bHex("abc"),
                "ba80a53f981c4d0d6a2797b69f12f6e94c212f14685ac4b74b12bb6fdbffa2d1" +
                "7d87c5392aab792dc252d5de4533cc9518d38aa8dbf1925ab92386edd4009923");

            assert.equal(blake2bHex(""),
                "786a02f742015903c6c6fd852552d272912f4740e15847618a86e217f71f5419" +
                "d25e1031afee585313896444934eb04b903a685b1448b755d56f701afe9be2ce");

            assert.equal(blake2bHex("The quick brown fox jumps over the lazy dog"),
                "a8add4bdddfd93e4877d2746e62817b116364a1fa7bc148d95090bc7333b3673" +
                "f82401cf7aa2e4cb1ecd90296e3f14cb5413f8ed77be73045b13914cdcd6a918");
        });

        it("Input types", () => {
            // Supports string, Uint8Array, and Buffer inputs
            // We already verify that blake2bHex('abc') produces the correct hash above
            assert.equal(blake2bHex(new Uint8Array([97, 98, 99])), blake2bHex("abc"));
            assert.equal(blake2bHex(Buffer.from([97, 98, 99])), blake2bHex("abc"));
        });

        it("generated test vectors", () => {
            const contents = fs.readFileSync(fixture("blake.txt"), "utf8");
            contents.split("\n").forEach((line) => {
                if (line.length === 0) {
                    return;
                }
                const parts = line.split("\t");
                const inputHex = parts[0];
                const keyHex = parts[1];
                const outLen = parts[2];
                const outHex = parts[3];

                assert.equal(blake2bHex(hexToBytes(inputHex), hexToBytes(keyHex), outLen), outHex);
            });
        });

        it("performance", () => {
            const N = 1 << 22; // number of bytes to hash
            const RUNS = 3; // how often to repeat, to allow JIT to finish

            console.log(`Benchmarking BLAKE2b(${N >> 20} MB input)`);
            testSpeed(blake2bHex, N, RUNS);
        });

        it("Byte counter should support values up to 2**53", () => {
            const testCases = [
                { t: 1, a0: 1, a1: 0 },
                { t: 0xffffffff, a0: 0xffffffff, a1: 0 },
                { t: 0x100000000, a0: 0, a1: 1 },
                { t: 0x123456789abcd, a0: 0x6789abcd, a1: 0x12345 },
                // test 2**53 - 1
                { t: 0x1fffffffffffff, a0: 0xffffffff, a1: 0x1fffff }];

            testCases.forEach((testCase) => {
                const arr = new Uint32Array([0, 0]);

                // test the code that's inlined in both blake2s.js and blake2b.js
                // to make sure it splits byte counters up to 2**53 into uint32s correctly
                arr[0] ^= testCase.t;
                arr[1] ^= (testCase.t / 0x100000000);

                assert.equal(arr[0], testCase.a0);
                assert.equal(arr[1], testCase.a1);
            });
        });
    });

    describe("blake2s", () => {
        const toHex = function (bytes) {
            return Array.prototype.map.call(bytes, (n) => {
                return (n < 16 ? "0" : "") + n.toString(16);
            }).join("");
        };

        // Returns a Uint8Array of len bytes
        const generateInput = function (len, seed) {
            const out = new Uint8Array(len);
            const a = new Uint32Array(3);
            a[0] = 0xDEAD4BAD * seed; // prime
            a[1] = 1;
            for (let i = 0; i < len; i++) { // fill the buf
                a[2] = a[0] + a[1];
                a[0] = a[1];
                a[1] = a[2];
                out[i] = (a[2] >>> 24) & 0xFF;
            }
            return out;
        };

        it("BLAKE2s basic", () => {
            // From the example computation in the RFC
            assert.equal(blake2sHex("abc"), "508c5e8c327c14e2e1a72ba34eeb452f37458b209ed63a294d999b4c86675982");
            assert.equal(blake2sHex(new Uint8Array([97, 98, 99])), "508c5e8c327c14e2e1a72ba34eeb452f37458b209ed63a294d999b4c86675982");
            assert.equal(blake2sHex(Buffer.from([97, 98, 99])), "508c5e8c327c14e2e1a72ba34eeb452f37458b209ed63a294d999b4c86675982");
        });

        it("BLAKE2s self test", () => {
            // Grand hash of hash results
            const expectedHash = [
                0x6A, 0x41, 0x1F, 0x08, 0xCE, 0x25, 0xAD, 0xCD,
                0xFB, 0x02, 0xAB, 0xA6, 0x41, 0x45, 0x1C, 0xEC,
                0x53, 0xC5, 0x98, 0xB2, 0x4F, 0x4F, 0xC7, 0x87,
                0xFB, 0xDC, 0x88, 0x79, 0x7F, 0x4C, 0x1D, 0xFE];

            // Parameter sets
            const outputLengths = [16, 20, 28, 32];
            const inputLengths = [0, 3, 64, 65, 255, 1024];

            // 256-bit hash for testing
            const ctx = blake2sInit(32);

            for (let i = 0; i < 4; i++) {
                const outlen = outputLengths[i];
                for (let j = 0; j < 6; j++) {
                    const inlen = inputLengths[j];

                    const arr = generateInput(inlen, inlen);
                    let hash = blake2s(arr, null, outlen); // unkeyed hash
                    blake2sUpdate(ctx, hash); // hash the hash

                    const key = generateInput(outlen, outlen);
                    hash = blake2s(arr, key, outlen); // keyed hash
                    blake2sUpdate(ctx, hash); // hash the hash
                }
            }

            // Compute and compare the hash of hashes
            const finalHash = blake2sFinal(ctx);
            assert.equal(toHex(finalHash), toHex(expectedHash));
        });

        it("BLAKE2s performance", () => {
            const N = 1 << 22; // number of bytes to hash
            const RUNS = 3; // how often to repeat, to allow JIT to finish

            console.log(`Benchmarking BLAKE2s(${N >> 20} MB input)`);
            testSpeed(blake2sHex, N, RUNS);
        });
    });
});
