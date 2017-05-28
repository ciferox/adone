describe("crypto", "Password hash and salt", () => {
    const { crypto: { password } } = adone;

    const splitHash = function (hash) {
        const opt = hash.split("$");
        if (opt.length !== 4) {
            throw new Error("Hash expected to have four parts");
        }
        return {
            algorithm: opt[0],
            iterations: opt[1],
            hash: opt[2],
            salt: opt[3]
        };
    };

    describe("Hash creation", () => {
        it("should not hash empty passwords", async () => {
            let isOK = false;
            try {
                await password.hash("");
            } catch (err) {
                isOK = true;
            }
            expect(isOK).to.be.ok;
        });

        it("should return a key formatted as: alg$iterations$hash$salt", async () => {
            const key1 = await password.hash("secret");
            const split = splitHash(key1);
            expect(split.algorithm).to.equal("pbkdf2");
            expect(split.iterations).to.equal("10000");
            expect(split.hash.length).to.be.at.least(10);
            expect(split.salt.length).to.be.at.least(10);
        });

        it("should create unique hashes", async () => {
            const key1 = await password.hash("password 1");
            const key2 = await password.hash("password 2");
            expect(key1).not.to.be.null;
            expect(key2).not.to.be.null;
            expect(key1).to.not.equal(key2);
            expect(splitHash(key1).hash).to.not.equal(splitHash(key2).hash);
        });

        it("should create unique salts", async () => {
            const key1 = await password.hash("password 1");
            const key2 = await password.hash("password 1");
            expect(key1).not.to.be.null;
            expect(key2).not.to.be.null;
            expect(splitHash(key1).salt).to.not.equal(splitHash(key2).salt);
        });

        it("should create same hash for same password and salt", async () => {
            const key1 = await password.hash("password 1");
            const salt1 = splitHash(key1).salt;
            const key2 = await password.hash("password 1", salt1);
            expect(key1).to.exist;
            expect(salt1).to.exist;
            expect(key2).to.exist;
            expect(key1).to.equal(key2);
        });
    });

    describe("Hash verification", () => {
        it("should not verify empty passwords - 1", async () => {
            const key1 = await password.hash("password 1");
            expect(key1).to.exist;
            const validated = await password.verify("password 1", "");
            expect(validated).to.equal(false);
        });

        it("should not verify empty passwords - 2", async () => {
            const key1 = await password.hash("password 1");
            expect(key1).to.exist;
            const validated = await password.verify("", "password 1");
            expect(validated).to.equal(false);
        });

        it("should not verify with empty salt", async () => {
            let validated;
            let isOK = false;
            try {
                validated = await password.verify("secret", "pbkdf2$10000$5e45$");
            } catch (err) {
                isOK = true;
            }

            expect(isOK).to.be.ok;
            expect(validated).to.not.equal(true);
        });

        it("should not verify with empty hash", async () => {
            let validated;
            let isOK = false;
            try {
                validated = await password.verify("secret", "pbkdf2$10000$$5e45");
            } catch (err) {
                isOK = true;
            }
            expect(isOK).to.be.ok;
            expect(validated).to.not.equal(true);
        });

        it("should not verify with wrong or empty algorithm", async () => {
            let validated;
            let isOK = false;
            try {
                validated = await password.verify("secret", "$10000$5e45$5e45");
            } catch (err) {
                isOK = true;
            }

            expect(isOK).to.be.ok;
            expect(validated).to.not.equal(true);
            isOK = false;
            try {
                validated = await password.verify("secret", "new$10000$5e45$5e45");
            } catch (err) {
                isOK = true;
            }
            expect(isOK).to.be.ok;
            expect(validated).to.not.equal(true);
        });

        it("should not verify with wrong or empty iterations", async () => {
            let validated;
            let isOK = false;
            try {
                validated = await password.verify("secret", "pbkdf2$$5e45$5e45");
            } catch (err) {
                isOK = true;
            }

            expect(isOK).to.be.ok;
            expect(validated).to.not.equal(true);
            isOK = false;
            try {
                validated = await password.verify("secret", "pbkdf2$9999$5e45$5e45");
            } catch (err) {
                isOK = true;
            }

            expect(isOK).to.be.ok;
            expect(validated).to.not.equal(true);
        });

        it("should not verify with wrongly formatted hash - 1", async () => {
            let validated;
            let isOK = false;
            try {
                validated = await password.verify("secret", "random characters");
            } catch (err) {
                isOK = true;
            }

            expect(isOK).to.be.ok;
            expect(validated).to.not.equal(true);
        });

        it("should not verify with wrongly formatted hash - 2", async () => {
            let validated;
            let isOK = false;
            try {
                validated = await password.verify("secret", "alg$1000$5e45$5e45$something");
            } catch (err) {
                isOK = true;
            }
            expect(isOK).to.be.ok;
            expect(validated).to.not.equal(true);
        });

        it("should not verify wrong passwords", async () => {
            const key1 = await password.hash("secret");
            expect(key1).to.exist;
            const validated = await password.verify("secret", "pbkdf2$10000$5e45$5e45");
            expect(validated).to.equal(false);
        });

        it("should verify correct passwords", async () => {
            const key1 = await password.hash("secret");
            expect(key1).to.exist;
            const validated = await password.verify("secret", key1);
            expect(validated).to.equal(true);
        });
    });

    describe("When using the password generator, it:", () => {
        it("should generate a 10 chararacter memorable password", () => {
            expect(password.generate()).to.match(/([bcdfghjklmnpqrstvwxyz][aeiou]){5}/);
        });

        it("should generate a 6 chararacter memorable password", () => {
            expect(password.generate()).to.match(/([bcdfghjklmnpqrstvwxyz][aeiou]){3}/);
        });

        it("should generate a 1000 chararacter non memorable password", () => {
            const pass = password.generate(1000, false);
            expect(pass).to.match(/[bcdfghjklmnpqrstvwxyz]{4}/ig);
            expect(pass.length).to.be.equal(1000);
        });

        it("should generate passwords matching regex pattern", () => {
            const pass = password.generate(5, false, /\d/);
            expect(pass).to.match(/^\d{5}$/);
        });

        it("should generate passwords with a given preffix", () => {
            const pass = password.generate(7, false, /\d/, "foo-");
            expect(pass).to.match(/^foo\-\d{3}$/);
        });

        it("should generate long passwords without throwing call stack limit exceptions", () => {
            const pass = password.generate(1200, false, /\d/);
            expect(pass).to.match(/^\d{1200}$/);
        });

        it("should generate passwords with a very short /(t|e|s|t)/ pattern", () => {
            const pass = password.generate(11, false, /(t|e|s|t)/);
            expect(pass.length).to.be.equal(11);
            expect(pass).to.match(/(t|e|s|t)/);
        });

        it("should prevent using invalid patterns", () => {
            assert.throws(() => password.generate(11, false, /test/), adone.x.NotValid);
        });
    });
});
