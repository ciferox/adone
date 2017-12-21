const series = require("async/series");
const fixtures = require("./fixtures/aes");
const goFixtures = require("./fixtures/go-aes");

const {
    netron2: { crypto }
} = adone;

const bytes = {
    16: "AES-128",
    32: "AES-256"
};

const encryptAndDecrypt = function (cipher) {
    const data = Buffer.alloc(100);
    data.fill(Math.ceil(Math.random() * 100));
    return (cb) => {
        cipher.encrypt(data, (err, res) => {
            assert.notExists(err);
            cipher.decrypt(res, (err, res) => {
                assert.notExists(err);
                expect(res).to.be.eql(data);
                cb();
            });
        });
    };
};


describe("netron2", "crypto", "AES-CTR", () => {
    Object.keys(bytes).forEach((byte) => {
        it(`${bytes[byte]} - encrypt and decrypt`, (done) => {
            const key = Buffer.alloc(parseInt(byte, 10));
            key.fill(5);

            const iv = Buffer.alloc(16);
            iv.fill(1);

            crypto.aes.create(key, iv, (err, cipher) => {
                assert.notExists(err);

                series([
                    encryptAndDecrypt(cipher),
                    encryptAndDecrypt(cipher),
                    encryptAndDecrypt(cipher),
                    encryptAndDecrypt(cipher),
                    encryptAndDecrypt(cipher)
                ], done);
            });
        });
    });

    Object.keys(bytes).forEach((byte) => {
        it(`${bytes[byte]} - fixed - encrypt and decrypt`, (done) => {
            const key = Buffer.alloc(parseInt(byte, 10));
            key.fill(5);

            const iv = Buffer.alloc(16);
            iv.fill(1);

            crypto.aes.create(key, iv, (err, cipher) => {
                assert.notExists(err);

                series(fixtures[byte].inputs.map((rawIn, i) => (cb) => {
                    const input = Buffer.from(rawIn);
                    const output = Buffer.from(fixtures[byte].outputs[i]);
                    cipher.encrypt(input, (err, res) => {
                        assert.notExists(err);
                        expect(res).to.have.length(output.length);
                        expect(res).to.eql(output);
                        cipher.decrypt(res, (err, res) => {
                            assert.notExists(err);
                            expect(res).to.eql(input);
                            cb();
                        });
                    });
                }), done);
            });
        });
    });

    Object.keys(bytes).forEach((byte) => {
        if (!goFixtures[byte]) {
            return;
        }

        it(`${bytes[byte]} - go interop - encrypt and decrypt`, (done) => {
            const key = Buffer.alloc(parseInt(byte, 10));
            key.fill(5);

            const iv = Buffer.alloc(16);
            iv.fill(1);

            crypto.aes.create(key, iv, (err, cipher) => {
                assert.notExists(err);

                series(goFixtures[byte].inputs.map((rawIn, i) => (cb) => {
                    const input = Buffer.from(rawIn);
                    const output = Buffer.from(goFixtures[byte].outputs[i]);
                    cipher.encrypt(input, (err, res) => {
                        assert.notExists(err);
                        expect(res).to.have.length(output.length);
                        expect(res).to.be.eql(output);
                        cipher.decrypt(res, (err, res) => {
                            assert.notExists(err);
                            expect(res).to.be.eql(input);
                            cb();
                        });
                    });
                }), done);
            });
        });
    });
});
