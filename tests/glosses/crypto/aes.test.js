const fixtures = require("./fixtures/aes");
const goFixtures = require("./fixtures/go-aes");

const {
    crypto
} = adone;

const bytes = {
    16: "AES-128",
    32: "AES-256"
};

const encryptAndDecrypt = function (cipher) {
    const data = Buffer.alloc(100);
    data.fill(Math.ceil(Math.random() * 100));
    return () => {
        let res = cipher.encrypt(data);
        res = cipher.decrypt(res);
        expect(res).to.be.eql(data);
    };
};


describe("crypto", "AES-CTR", () => {
    Object.keys(bytes).forEach((byte) => {
        it(`${bytes[byte]} - encrypt and decrypt`, () => {
            const key = Buffer.alloc(parseInt(byte, 10));
            key.fill(5);

            const iv = Buffer.alloc(16);
            iv.fill(1);

            const cipher = crypto.aes.create(key, iv);
            encryptAndDecrypt(cipher);
            encryptAndDecrypt(cipher);
            encryptAndDecrypt(cipher);
            encryptAndDecrypt(cipher);
            encryptAndDecrypt(cipher);
        });
    });

    Object.keys(bytes).forEach((byte) => {
        it(`${bytes[byte]} - fixed - encrypt and decrypt`, () => {
            const key = Buffer.alloc(parseInt(byte, 10));
            key.fill(5);

            const iv = Buffer.alloc(16);
            iv.fill(1);

            const cipher = crypto.aes.create(key, iv);
            let i = 0;
            for (const rawIn of fixtures[byte].inputs) {
                const input = Buffer.from(rawIn);
                const output = Buffer.from(fixtures[byte].outputs[i]);
                let res = cipher.encrypt(input);
                expect(res).to.have.length(output.length);
                expect(res).to.eql(output);
                res = cipher.decrypt(res);
                expect(res).to.eql(input);
                i++;
            }
        });
    });

    Object.keys(bytes).forEach((byte) => {
        if (!goFixtures[byte]) {
            return;
        }

        it(`${bytes[byte]} - go interop - encrypt and decrypt`, () => {
            const key = Buffer.alloc(parseInt(byte, 10));
            key.fill(5);

            const iv = Buffer.alloc(16);
            iv.fill(1);

            const cipher = crypto.aes.create(key, iv);
            let i = 0;
            for (const rawIn of goFixtures[byte].inputs) {
                const input = Buffer.from(rawIn);
                const output = Buffer.from(goFixtures[byte].outputs[i]);
                let res = cipher.encrypt(input);
                expect(res).to.have.length(output.length);
                expect(res).to.be.eql(output);
                res = cipher.decrypt(res);
                expect(res).to.be.eql(input);
                i++;
            }
        });
    });
});
