describe("generateKeyPair", () => {
    const {
        is,
        crypto
    } = adone;

    // const forge = require("node-forge");

    // const RANDOM = forge.random;
    // const UTIL = forge.util;

    // check a pair
    const _pairCheck = (pair) => {
        // PEM check
        assert.equal(crypto.pki.privateKeyToPem(pair.privateKey).indexOf("-----BEGIN RSA PRIVATE KEY-----"), 0);
        assert.equal(crypto.pki.publicKeyToPem(pair.publicKey).indexOf("-----BEGIN PUBLIC KEY-----"), 0);
        // sign and verify
        const md = crypto.md.sha1.create();
        md.update("0123456789abcdef");
        const signature = pair.privateKey.sign(md);
        assert.ok(pair.publicKey.verify(md.digest(), signature));
    };

    // compare pairs
    const _pairCmp = (pair1, pair2) => {
        const pem1 = {
            privateKey: crypto.pki.privateKeyToPem(pair1.privateKey),
            publicKey: crypto.pki.publicKeyToPem(pair1.publicKey)
        };
        const pem2 = {
            privateKey: crypto.pki.privateKeyToPem(pair2.privateKey),
            publicKey: crypto.pki.publicKeyToPem(pair2.publicKey)
        };
        assert.equal(pem1.privateKey, pem2.privateKey);
        assert.equal(pem1.publicKey, pem2.publicKey);
    };

    // create same prng
    const _samePrng = () => {
        const prng = RANDOM.createInstance();
        prng.seedFileSync = function (needed) {
            return UTIL.fillString("a", needed);
        };
        return prng;
    };


    // generate pair in sync mode
    const _genSync = (options) => {
        options = options || { samePrng: false };
        let pair;
        if (options.samePrng) {
            pair = crypto.pki.rsa.generateKeyPair(512, { prng: _samePrng() });
        } else {
            pair = crypto.pki.rsa.generateKeyPair(512);
        }
        _pairCheck(pair);
        return pair;
    };

    // generate pair in async mode
    const _genAsync = (options, callback) => {
        if (!is.function(callback)) {
            callback = options;
            options = { samePrng: false };
        }
        const genOptions = {
            bits: 512,
            workerScript: "/forge/prime.worker.js"
        };
        if (options.samePrng) {
            genOptions.prng = _samePrng();
        }
        if ("workers" in options) {
            genOptions.workers = options.workers;
        }
        crypto.pki.rsa.generateKeyPair(genOptions, (err, pair) => {
            assert.ifError(err);
            _pairCheck(pair);
            callback(pair);
        });
    };

    it("should generate 512 bit key pair (sync)", () => {
        _genSync();
    });

    it("should generate 512 bit key pair (async)", (done) => {
        _genAsync(() => {
            done();
        });
    });

    it.todo("should generate the same 512 bit key pair (sync+sync)", () => {
        const pair1 = _genSync({ samePrng: true });
        const pair2 = _genSync({ samePrng: true });
        _pairCmp(pair1, pair2);
    });

    it.todo("should generate 512 bit key pairs (sync+async)", (done) => {
        const pair1 = _genSync({ samePrng: true });
        _genAsync({ samePrng: true }, (pair2) => {
            // check if the same on supported deterministic platforms
            if (UTIL.isNodejs) {
                _pairCmp(pair1, pair2);
            }
            done();
        });
    });

    it.todo("should generate 512 bit key pairs (async+sync)", (done) => {
        _genAsync({ samePrng: true }, (pair1) => {
            const pair2 = _genSync({ samePrng: true });
            // check if the same on supported deterministic platforms
            if (UTIL.isNodejs) {
                _pairCmp(pair1, pair2);
            }
            done();
        });
    });

    it.todo("should generate 512 bit key pairs (async+async)", (done) => {
        let pair1;
        let pair2;
        // finish when both complete
        const _done = () => {
            if (pair1 && pair2) {
            // check if the same on supported deterministic platforms
                if (UTIL.isNodejs) {
                    _pairCmp(pair1, pair2);
                }
                done();
            }
        };
        _genAsync({ samePrng: true }, (pair) => {
            pair1 = pair;
            _done();
        });
        _genAsync({ samePrng: true }, (pair) => {
            pair2 = pair;
            _done();
        });
    });
});
