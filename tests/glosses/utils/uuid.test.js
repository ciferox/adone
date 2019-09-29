const {
    assert,
    util: { uuid },
    std: { crypto }
} = adone;

// Verify ordering of v1 ids created with explicit times
const TIME = 1321644961388; // 2011-11-18 11:36:01.388-08:00

const HASH_SAMPLES = [
    {
        input: "",
        sha1: "da39a3ee5e6b4b0d3255bfef95601890afd80709",
        md5: "d41d8cd98f00b204e9800998ecf8427e"
    },

    // Extended ascii chars
    {
        input: '\t\b\f  !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~\u00A1\u00A2\u00A3\u00A4\u00A5\u00A6\u00A7\u00A8\u00A9\u00AA\u00AB\u00AC\u00AE\u00AF\u00B0\u00B1\u00B2\u00B3\u00B4\u00B5\u00B6\u00B7\u00B8\u00B9\u00BA\u00BB\u00BC\u00BD\u00BE\u00BF\u00C0\u00C1\u00C2\u00C3\u00C4\u00C5\u00C6\u00C7\u00C8\u00C9\u00CA\u00CB\u00CC\u00CD\u00CE\u00CF\u00D0\u00D1\u00D2\u00D3\u00D4\u00D5\u00D6\u00D7\u00D8\u00D9\u00DA\u00DB\u00DC\u00DD\u00DE\u00DF\u00E0\u00E1\u00E2\u00E3\u00E4\u00E5\u00E6\u00E7\u00E8\u00E9\u00EA\u00EB\u00EC\u00ED\u00EE\u00EF\u00F0\u00F1\u00F2\u00F3\u00F4\u00F5\u00F6\u00F7\u00F8\u00F9\u00FA\u00FB\u00FC\u00FD\u00FE\u00FF',
        sha1: "ca4a426a3d536f14cfd79011e79e10d64de950a0",
        md5: "e8098ec21950f841731d28749129d3ee"
    },

    // A sampling from the Unicode BMP
    {
        input: "\u00A5\u0104\u018F\u0256\u02B1o\u0315\u038E\u0409\u0500\u0531\u05E1\u05B6\u0920\u0903\u09A4\u0983\u0A20\u0A02\u0AA0\u0A83\u0B06\u0C05\u0C03\u1401\u16A0",
        sha1: "f2753ebc390e5f637e333c2a4179644a93ae9f65",
        md5: "231b309e277b6be8bb3d6c688b7f098b"
    }
];

const hashToHex = function (hash) {
    return hash.map((b) => {
        return (0x100 + b).toString(16).slice(-2);
    }).join("");
};

const compare = function (name, ids) {
    it(name, () => {
        // avoid .map for older browsers
        for (let i = 0; i < ids.length; ++i) {
            ids[i] = ids[i].split("-").reverse().join("-");
        }
        ids = ids.sort();
        const sorted = ([].concat(ids)).sort();

        assert(sorted.toString() === ids.toString(), `${name} have expected order`);
    });
};

const srcPath = (...args) => adone.getPath("src/glosses/utils/uuid", ...args);

describe("util", "uuid", () => {
    it("nodeRNG", () => {
        const rng = require(srcPath("lib/rng"));
        assert.equal(rng.name, "nodeRNG");

        const bytes = rng();
        assert.equal(bytes.length, 16);

        for (let i = 0; i < bytes.length; i++) {
            assert.equal(typeof (bytes[i]), "number");
        }
    });

    it("mathRNG", () => {
        const rng = require(srcPath("lib/rng-browser"));
        assert.equal(rng.name, "mathRNG");

        const bytes = rng();
        assert.equal(bytes.length, 16);

        for (let i = 0; i < bytes.length; i++) {
            assert.equal(typeof (bytes[i]), "number");
        }
    });

    it("cryptoRNG", () => {
        const randomFillSync = crypto.randomFillSync;

        Object.keys(require.cache).forEach((path) => {
            if (/rng-browser/.test(path)) {
                delete require.cache[path];
            }
        });

        // We shim the web crypto API to trigger cryptoRNG code path in rng module,
        // then unshim once we've required it
        global.crypto = {
            getRandomValues(arr) {
                const bytes = crypto.randomBytes(arr.length);
                for (let i = 0; i < arr.length; i++) {
                    arr[i] = bytes[i];
                }
                return arr;
            }
        };
        const rng = require(srcPath("lib/rng-browser"));
        delete global.crypto;

        assert.equal(rng.name, "whatwgRNG");
    });

    it("sha1 node", () => {
        const sha1 = require(srcPath("lib/sha1"));

        HASH_SAMPLES.forEach((sample) => {
            // Convert the sha1 Buffer to an Array here so we can call map() on it in hashToHex
            assert.equal(hashToHex(Array.prototype.slice.apply(sha1(sample.input))), sample.sha1);
        });
    });

    it("sha1 browser", () => {
        const sha1 = require(srcPath("lib/sha1-browser"));

        HASH_SAMPLES.forEach((sample) => {
            assert.equal(hashToHex(sha1(sample.input)), sample.sha1);
        });
    });

    it("md5 node", () => {
        const md5 = require(srcPath("lib/md5"));

        HASH_SAMPLES.forEach((sample) => {
            // Convert the sha1 Buffer to an Array here so we can call map() on it in hashToHex
            assert.equal(hashToHex(Array.prototype.slice.apply(md5(sample.input))), sample.md5);
        });
    });

    it("md5 browser", () => {
        const md5 = require(srcPath("lib/md5-browser"));

        HASH_SAMPLES.forEach((sample) => {
            assert.equal(hashToHex(md5(sample.input)), sample.md5);
        });
    });

    it("v3", () => {
        const { v3 } = uuid;

        // Expect to get the same results as http://tools.adjet.org/uuid-v3
        assert.equal(v3("hello.example.com", v3.DNS), "9125a8dc-52ee-365b-a5aa-81b0b3681cf6");
        assert.equal(v3("http://example.com/hello", v3.URL), "c6235813-3ba4-3801-ae84-e0a6ebb7d138");
        assert.equal(v3("hello", "0f5abcd1-c194-47f3-905b-2df7263a084b"), "a981a0c2-68b1-35dc-bcfc-296e52ab01ec");

        // test the buffer functionality
        let buf = new Array(16);
        const testBuf = [0x91, 0x25, 0xa8, 0xdc, 0x52, 0xee, 0x36, 0x5b, 0xa5, 0xaa, 0x81, 0xb0, 0xb3, 0x68, 0x1c, 0xf6];
        v3("hello.example.com", v3.DNS, buf);
        assert.ok(buf.length === testBuf.length && buf.every((elem, idx) => {
            return elem === testBuf[idx];
        }));

        // test offsets as well
        buf = new Array(19);
        for (let i = 0; i < 3; ++i) {
            buf[i] = "landmaster";
        }
        v3("hello.example.com", v3.DNS, buf, 3);
        assert.ok(buf.length === testBuf.length + 3 && buf.every((elem, idx) => {
            return (idx >= 3) ? (elem === testBuf[idx - 3]) : (elem === "landmaster");
        }), "hello");
    });

    it("v5", () => {
        const { v5 } = uuid;

        // Expect to get the same results as http://tools.adjet.org/uuid-v5
        assert.equal(v5("hello.example.com", v5.DNS), "fdda765f-fc57-5604-a269-52a7df8164ec");
        assert.equal(v5("http://example.com/hello", v5.URL), "3bbcee75-cecc-5b56-8031-b6641c1ed1f1");
        assert.equal(v5("hello", "0f5abcd1-c194-47f3-905b-2df7263a084b"), "90123e1c-7512-523e-bb28-76fab9f2f73d");

        // test the buffer functionality
        let buf = new Array(16);
        const testBuf = [0xfd, 0xda, 0x76, 0x5f, 0xfc, 0x57, 0x56, 0x04, 0xa2, 0x69, 0x52, 0xa7, 0xdf, 0x81, 0x64, 0xec];
        v5("hello.example.com", v5.DNS, buf);
        assert.ok(buf.length === testBuf.length && buf.every((elem, idx) => {
            return elem === testBuf[idx];
        }));

        // test offsets as well
        buf = new Array(19);
        for (let i = 0; i < 3; ++i) {
            buf[i] = "landmaster";
        }
        v5("hello.example.com", v5.DNS, buf, 3);
        assert.ok(buf.length === testBuf.length + 3 && buf.every((elem, idx) => {
            return (idx >= 3) ? (elem === testBuf[idx - 3]) : (elem === "landmaster");
        }));
    });


    // Verify ordering of v1 ids created using default behavior
    compare("uuids with current time", [
        uuid.v1(),
        uuid.v1(),
        uuid.v1(),
        uuid.v1(),
        uuid.v1()
    ]);

    // Verify ordering of v1 ids created with explicit times
    compare("uuids with time option", [
        uuid.v1({ msecs: TIME - 10 * 3600 * 1000 }),
        uuid.v1({ msecs: TIME - 1 }),
        uuid.v1({ msecs: TIME }),
        uuid.v1({ msecs: TIME + 1 }),
        uuid.v1({ msecs: TIME + 28 * 24 * 3600 * 1000 })
    ]);

    it("msec", () => {
        assert.ok(uuid.v1({ msecs: TIME }) !== uuid.v1({ msecs: TIME }), "IDs created at same msec are different");
    });

    it("exception thrown when > 10k ids created in 1ms", () => {
        // Verify throw if too many ids created
        let thrown = false;
        try {
            uuid.v1({ msecs: TIME, nsecs: 10000 });
        } catch (e) {
            thrown = true;
        }
        assert(thrown, "Exception thrown when > 10K ids created in 1 ms");
    });

    it("clock regression by msec", () => {
        // Verify clock regression bumps clockseq
        const uidt = uuid.v1({ msecs: TIME });
        const uidtb = uuid.v1({ msecs: TIME - 1 });
        assert(
            parseInt(uidtb.split("-")[3], 16) - parseInt(uidt.split("-")[3], 16) === 1,
            "Clock regression by msec increments the clockseq"
        );
    });

    it("clock regression by nsec", () => {
        // Verify clock regression bumps clockseq
        const uidtn = uuid.v1({ msecs: TIME, nsecs: 10 });
        const uidtnb = uuid.v1({ msecs: TIME, nsecs: 9 });
        assert(
            parseInt(uidtnb.split("-")[3], 16) - parseInt(uidtn.split("-")[3], 16) === 1,
            "Clock regression by nsec increments the clockseq"
        );
    });

    it("explicit options product expected id", () => {
        // Verify explicit options produce expected id
        const id = uuid.v1({
            msecs: 1321651533573,
            nsecs: 5432,
            clockseq: 0x385c,
            node: [0x61, 0xcd, 0x3c, 0xbb, 0x32, 0x10]
        });
        assert(id === "d9428888-122b-11e1-b85c-61cd3cbb3210", "Explicit options produce expected id");
    });

    it("ids spanning 1ms boundary are 100ns apart", () => {
        // Verify adjacent ids across a msec boundary are 1 time unit apart
        const u0 = uuid.v1({ msecs: TIME, nsecs: 9999 });
        const u1 = uuid.v1({ msecs: TIME + 1, nsecs: 0 });

        const before = u0.split("-")[0];
        const after = u1.split("-")[0];
        const dt = parseInt(after, 16) - parseInt(before, 16);
        assert(dt === 1, "Ids spanning 1ms boundary are 100ns apart");
    });
});
