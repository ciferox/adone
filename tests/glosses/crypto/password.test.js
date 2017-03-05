/* global describe it */

var password = adone.crypto.password;

const splitHash = function (hash) {
    const opt = hash.split("$");
    if (opt.length !== 4)
        throw new Error("Hash expected to have four parts");
    return {
        algorithm: opt[0],
        iterations: opt[1],
        hash: opt[2],
        salt: opt[3]
    };
};

describe("Password hash and salt", function () {
    describe("Hash creation", function () {
        it("should not hash empty passwords", async function () {
            let isOK = false;
            try {
                await password("").hash();
            } catch (err) {
                isOK = true;
            }
            expect(isOK).to.be.ok;
        });

        it("should return a key formatted as: alg$iterations$hash$salt", async function () {
            const key1 = await password("secret").hash();
            const split = splitHash(key1);
            expect(split.algorithm).to.equal("pbkdf2");
            expect(split.iterations).to.equal("10000");
            expect(split.hash.length).to.be.at.least(10);
            expect(split.salt.length).to.be.at.least(10);
        });

        it("should create unique hashes", async function () {
            const key1 = await password("password 1").hash();
            const key2 = await password("password 2").hash();
            expect(key1).not.to.be.null;
            expect(key2).not.to.be.null;
            expect(key1).to.not.equal(key2);
            expect(splitHash(key1).hash).to.not.equal(splitHash(key2).hash);
        });

        it("should create unique salts", async function () {
            const key1 = await password("password 1").hash();
            const key2 = await password("password 1").hash();
            expect(key1).not.to.be.null;
            expect(key2).not.to.be.null;
            expect(splitHash(key1).salt).to.not.equal(splitHash(key2).salt);
        });

        it("should create same hash for same password and salt", async function () {
            const key1 = await password("password 1").hash();
            const salt1 = splitHash(key1).salt;
            const key2 = await password("password 1").hash(salt1);
            expect(key1).to.exist;
            expect(salt1).to.exist;
            expect(key2).to.exist;
            expect(key1).to.equal(key2);
        });
    });

    describe("Hash verification", function () {
        it("should not verify empty passwords - 1", async function () {
            const key1 = await password("password 1").hash();
            expect(key1).to.exist;
            const validated = await password("password 1").verifyAgainst("");
            expect(validated).to.equal(false);
        });

        it("should not verify empty passwords - 2", async function () {
            const key1 = await password("password 1").hash();
            expect(key1).to.exist;
            const validated = await password("").verifyAgainst("password 1");
            expect(validated).to.equal(false);
        });

        it("should not verify with empty salt", async function () {
            let validated;
            let isOK = false;
            try {
                validated = await password("secret").verifyAgainst("pbkdf2$10000$5e45$");
            } catch (err) {
                isOK = true;
            }

            expect(isOK).to.be.ok;
            expect(validated).to.not.equal(true);
        });

        it("should not verify with empty hash", async function () {
            let validated;
            let isOK = false;            
            try {
                validated = await password("secret").verifyAgainst("pbkdf2$10000$$5e45");
            } catch (err) {
                isOK = true;
            }
            expect(isOK).to.be.ok;
            expect(validated).to.not.equal(true);
        });

        it("should not verify with wrong or empty algorithm", async function () {
            let validated;
            let isOK = false;
            try {
                validated = await password("secret").verifyAgainst("$10000$5e45$5e45");
            } catch (err) {
                isOK = true;
            }

            expect(isOK).to.be.ok;
            expect(validated).to.not.equal(true);
            isOK = false;
            try {
                validated = await password("secret").verifyAgainst("new$10000$5e45$5e45");
            } catch (err) {
                isOK = true;
            }
            expect(isOK).to.be.ok;
            expect(validated).to.not.equal(true);
        });

        it("should not verify with wrong or empty iterations", async function () {
            let validated;
            let isOK = false;
            try {
                validated = await password("secret").verifyAgainst("pbkdf2$$5e45$5e45");
            } catch (err) {
                isOK = true;
            }

            expect(isOK).to.be.ok;
            expect(validated).to.not.equal(true);
            isOK = false;
            try {
                validated = await password("secret").verifyAgainst("pbkdf2$9999$5e45$5e45");
            } catch (err) {
                isOK = true;
            }

            expect(isOK).to.be.ok;
            expect(validated).to.not.equal(true);
        });

        it("should not verify with wrongly formatted hash - 1", async function () {
            let validated;
            let isOK = false;
            try {
                validated = await password("secret").verifyAgainst("random characters");
            } catch (err) {
                isOK = true;
            }

            expect(isOK).to.be.ok;
            expect(validated).to.not.equal(true);
        });

        it("should not verify with wrongly formatted hash - 2", async function () {
            let validated;
            let isOK = false;
            try {
                validated = await password("secret").verifyAgainst("alg$1000$5e45$5e45$something");
            } catch (err) {
                isOK = true;
            }
            expect(isOK).to.be.ok;
            expect(validated).to.not.equal(true);
        });

        it("should not verify wrong passwords", async function () {
            const key1 = await password("secret").hash();
            expect(key1).to.exist;
            const validated = await password("secret").verifyAgainst("pbkdf2$10000$5e45$5e45");
            expect(validated).to.equal(false);
        });

        it("should verify correct passwords", async function () {
            const key1 = await password("secret").hash();
            expect(key1).to.exist;
            const validated = await password("secret").verifyAgainst(key1);
            expect(validated).to.equal(true);
        });
    });
});