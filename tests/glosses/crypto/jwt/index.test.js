const ms = require("ms");

const {
    crypto: { jws, jwt },
    std: { path, fs },
    is
} = adone;

const FIXTURES_PATH = path.join(__dirname, "fixtures");
const filePath = (name) => path.join(FIXTURES_PATH, name);

describe("crypto", "jwt", () => {
    describe("verify", () => {
        const pub = fs.readFileSync(filePath("pub.pem"));
        const priv = fs.readFileSync(filePath("priv.pem"));

        it("should first assume JSON claim set", (done) => {
            const header = { alg: "RS256" };
            const payload = { iat: Math.floor(Date.now() / 1000) };

            const signed = jws.sign({
                header,
                payload,
                secret: priv,
                encoding: "utf8"
            });

            jwt.verify(signed, pub, { typ: "JWT" }, (err, p) => {
                assert.isNull(err);
                assert.deepEqual(p, payload);
                done();
            });
        });

        it("should be able to validate unsigned token", (done) => {
            const header = { alg: "none" };
            const payload = { iat: Math.floor(Date.now() / 1000) };

            const signed = jws.sign({
                header,
                payload,
                secret: priv,
                encoding: "utf8"
            });

            jwt.verify(signed, null, { typ: "JWT" }, (err, p) => {
                assert.isNull(err);
                assert.deepEqual(p, payload);
                done();
            });
        });

        it("should not mutate options", (done) => {
            const header = { alg: "none" };

            const payload = { iat: Math.floor(Date.now() / 1000) };

            const options = { typ: "JWT" };

            const signed = jws.sign({
                header,
                payload,
                secret: priv,
                encoding: "utf8"
            });

            jwt.verify(signed, null, options, (err) => {
                assert.isNull(err);
                assert.deepEqual(Object.keys(options).length, 1);
                done();
            });
        });

        describe("expiration", () => {
            // { foo: 'bar', iat: 1437018582, exp: 1437018592 }
            const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJmb28iOiJiYXIiLCJpYXQiOjE0MzcwMTg1ODIsImV4cCI6MTQzNzAxODU5Mn0.3aR3vocmgRpG05rsI9MpR6z2T_BGtMQaPq2YR6QaroU";
            const key = "key";

            let clock;
            afterEach(() => {
                try {
                    clock.uninstall();
                } catch (e) {
                    //
                }
            });

            it("should error on expired token", (done) => {
                clock = fakeClock.install(1437018650000); // iat + 58s, exp + 48s
                const options = { algorithms: ["HS256"] };

                jwt.verify(token, key, options, (err, p) => {
                    assert.equal(err.name, "TokenExpiredError");
                    assert.equal(err.message, "jwt expired");
                    assert.equal(err.expiredAt.constructor.name, "Date");
                    assert.equal(Number(err.expiredAt), 1437018592000);
                    assert.isUndefined(p);
                    done();
                });
            });

            it("should not error on expired token within clockTolerance interval", (done) => {
                clock = fakeClock.install(1437018594000); // iat + 12s, exp + 2s
                const options = { algorithms: ["HS256"], clockTolerance: 5 };

                jwt.verify(token, key, options, (err, p) => {
                    assert.isNull(err);
                    assert.equal(p.foo, "bar");
                    done();
                });
            });

            it("should not error if within maxAge timespan", (done) => {
                clock = fakeClock.install(1437018587500); // iat + 5.5s, exp - 4.5s
                const options = { algorithms: ["HS256"], maxAge: "6s" };

                jwt.verify(token, key, options, (err, p) => {
                    assert.isNull(err);
                    assert.equal(p.foo, "bar");
                    done();
                });
            });

            describe("option: maxAge", () => {

                [String("3s"), "3s", 3].forEach((maxAge) => {
                    it(`should error for claims issued before a certain timespan (${typeof maxAge} type)`, (done) => {
                        clock = fakeClock.install(1437018587000); // iat + 5s, exp - 5s
                        const options = { algorithms: ["HS256"], maxAge };

                        jwt.verify(token, key, options, (err, p) => {
                            assert.equal(err.name, "TokenExpiredError");
                            assert.equal(err.message, "maxAge exceeded");
                            assert.equal(err.expiredAt.constructor.name, "Date");
                            assert.equal(Number(err.expiredAt), 1437018585000);
                            assert.isUndefined(p);
                            done();
                        });
                    });
                });

                [String("5s"), "5s", 5].forEach((maxAge) => {
                    it(`should not error for claims issued before a certain timespan but still inside clockTolerance timespan (${typeof maxAge} type)`, (done) => {
                        clock = fakeClock.install(1437018587500); // iat + 5.5s, exp - 4.5s
                        const options = { algorithms: ["HS256"], maxAge, clockTolerance: 1 };

                        jwt.verify(token, key, options, (err, p) => {
                            assert.isNull(err);
                            assert.equal(p.foo, "bar");
                            done();
                        });
                    });
                });

                [String("6s"), "6s", 6].forEach((maxAge) => {
                    it(`should not error if within maxAge timespan (${typeof maxAge} type)`, (done) => {
                        clock = fakeClock.install(1437018587500);// iat + 5.5s, exp - 4.5s
                        const options = { algorithms: ["HS256"], maxAge };

                        jwt.verify(token, key, options, (err, p) => {
                            assert.isNull(err);
                            assert.equal(p.foo, "bar");
                            done();
                        });
                    });
                });

                [String("8s"), "8s", 8].forEach((maxAge) => {
                    it(`can be more restrictive than expiration (${typeof maxAge} type)`, (done) => {
                        clock = fakeClock.install(1437018591900); // iat + 9.9s, exp - 0.1s
                        const options = { algorithms: ["HS256"], maxAge };

                        jwt.verify(token, key, options, (err, p) => {
                            assert.equal(err.name, "TokenExpiredError");
                            assert.equal(err.message, "maxAge exceeded");
                            assert.equal(err.expiredAt.constructor.name, "Date");
                            assert.equal(Number(err.expiredAt), 1437018590000);
                            assert.isUndefined(p);
                            done();
                        });
                    });
                });

                [String("12s"), "12s", 12].forEach((maxAge) => {
                    it(`cannot be more permissive than expiration (${typeof maxAge} type)`, (done) => {
                        clock = fakeClock.install(1437018593000); // iat + 11s, exp + 1s
                        const options = { algorithms: ["HS256"], maxAge: "12s" };

                        jwt.verify(token, key, options, (err, p) => {
                            // maxAge not exceded, but still expired
                            assert.equal(err.name, "TokenExpiredError");
                            assert.equal(err.message, "jwt expired");
                            assert.equal(err.expiredAt.constructor.name, "Date");
                            assert.equal(Number(err.expiredAt), 1437018592000);
                            assert.isUndefined(p);
                            done();
                        });
                    });
                });

                [new String("1s"), "no-timespan-string"].forEach((maxAge) => {
                    it(`should error if maxAge is specified with a wrong string format/type (value: ${maxAge}, type: ${typeof maxAge})`, (done) => {
                        clock = fakeClock.install(1437018587000); // iat + 5s, exp - 5s
                        const options = { algorithms: ["HS256"], maxAge };

                        jwt.verify(token, key, options, (err, p) => {
                            assert.equal(err.name, "JsonWebTokenError");
                            assert.equal(err.message, '"maxAge" should be a number of seconds or string representing a timespan eg: "1d", "20h", 60');
                            assert.isUndefined(p);
                            done();
                        });
                    });
                });

                it("should error if maxAge is specified but there is no iat claim", (done) => {
                    const token = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJmb28iOiJiYXIifQ.0MBPd4Bru9-fK_HY3xmuDAc6N_embknmNuhdb9bKL_U";
                    const options = { algorithms: ["HS256"], maxAge: "1s" };

                    jwt.verify(token, key, options, (err, p) => {
                        assert.equal(err.name, "JsonWebTokenError");
                        assert.equal(err.message, "iat required when maxAge is specified");
                        assert.isUndefined(p);
                        done();
                    });
                });

            });

            describe("option: clockTimestamp", () => {
                const clockTimestamp = 1000000000;
                it("should verify unexpired token relative to user-provided clockTimestamp", (done) => {
                    const token = jwt.sign({ foo: "bar", iat: clockTimestamp, exp: clockTimestamp + 1 }, key);
                    jwt.verify(token, key, { clockTimestamp }, (err, p) => {
                        assert.isNull(err);
                        done();
                    });
                });
                it("should error on expired token relative to user-provided clockTimestamp", (done) => {
                    const token = jwt.sign({ foo: "bar", iat: clockTimestamp, exp: clockTimestamp + 1 }, key);
                    jwt.verify(token, key, { clockTimestamp: clockTimestamp + 1 }, (err, p) => {
                        assert.equal(err.name, "TokenExpiredError");
                        assert.equal(err.message, "jwt expired");
                        assert.equal(err.expiredAt.constructor.name, "Date");
                        assert.equal(Number(err.expiredAt), (clockTimestamp + 1) * 1000);
                        assert.isUndefined(p);
                        done();
                    });
                });
                it("should verify clockTimestamp is a number", (done) => {
                    const token = jwt.sign({ foo: "bar", iat: clockTimestamp, exp: clockTimestamp + 1 }, key);
                    jwt.verify(token, key, { clockTimestamp: "notANumber" }, (err, p) => {
                        assert.equal(err.name, "JsonWebTokenError");
                        assert.equal(err.message, "clockTimestamp must be a number");
                        assert.isUndefined(p);
                        done();
                    });
                });
                it("should verify valid token with nbf", (done) => {
                    const token = jwt.sign({
                        foo: "bar",
                        iat: clockTimestamp,
                        nbf: clockTimestamp + 1,
                        exp: clockTimestamp + 2
                    }, key);
                    jwt.verify(token, key, { clockTimestamp: clockTimestamp + 1 }, (err, p) => {
                        assert.isNull(err);
                        done();
                    });
                });
                it("should error on token used before nbf", (done) => {
                    const token = jwt.sign({
                        foo: "bar",
                        iat: clockTimestamp,
                        nbf: clockTimestamp + 1,
                        exp: clockTimestamp + 2
                    }, key);
                    jwt.verify(token, key, { clockTimestamp }, (err, p) => {
                        assert.equal(err.name, "NotBeforeError");
                        assert.equal(err.date.constructor.name, "Date");
                        assert.equal(Number(err.date), (clockTimestamp + 1) * 1000);
                        assert.isUndefined(p);
                        done();
                    });
                });
            });

            describe("option: maxAge and clockTimestamp", () => {
                // { foo: 'bar', iat: 1437018582, exp: 1437018800 } exp = iat + 218s
                const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJmb28iOiJiYXIiLCJpYXQiOjE0MzcwMTg1ODIsImV4cCI6MTQzNzAxODgwMH0.AVOsNC7TiT-XVSpCpkwB1240izzCIJ33Lp07gjnXVpA";
                it("should error for claims issued before a certain timespan", (done) => {
                    const clockTimestamp = 1437018682;
                    const options = { algorithms: ["HS256"], clockTimestamp, maxAge: "1m" };

                    jwt.verify(token, key, options, (err, p) => {
                        assert.equal(err.name, "TokenExpiredError");
                        assert.equal(err.message, "maxAge exceeded");
                        assert.equal(err.expiredAt.constructor.name, "Date");
                        assert.equal(Number(err.expiredAt), 1437018642000);
                        assert.isUndefined(p);
                        done();
                    });
                });
                it("should not error for claims issued before a certain timespan but still inside clockTolerance timespan", (done) => {
                    const clockTimestamp = 1437018592; // iat + 10s
                    const options = {
                        algorithms: ["HS256"],
                        clockTimestamp,
                        maxAge: "3s",
                        clockTolerance: 10
                    };

                    jwt.verify(token, key, options, (err, p) => {
                        assert.isNull(err);
                        assert.equal(p.foo, "bar");
                        done();
                    });
                });
                it("should not error if within maxAge timespan", (done) => {
                    const clockTimestamp = 1437018587; // iat + 5s
                    const options = { algorithms: ["HS256"], clockTimestamp, maxAge: "6s" };

                    jwt.verify(token, key, options, (err, p) => {
                        assert.isNull(err);
                        assert.equal(p.foo, "bar");
                        done();
                    });
                });
                it("can be more restrictive than expiration", (done) => {
                    const clockTimestamp = 1437018588; // iat + 6s
                    const options = { algorithms: ["HS256"], clockTimestamp, maxAge: "5s" };

                    jwt.verify(token, key, options, (err, p) => {
                        assert.equal(err.name, "TokenExpiredError");
                        assert.equal(err.message, "maxAge exceeded");
                        assert.equal(err.expiredAt.constructor.name, "Date");
                        assert.equal(Number(err.expiredAt), 1437018587000);
                        assert.isUndefined(p);
                        done();
                    });
                });
                it("cannot be more permissive than expiration", (done) => {
                    const clockTimestamp = 1437018900; // iat + 318s (exp: iat + 218s)
                    const options = { algorithms: ["HS256"], clockTimestamp, maxAge: "1000y" };

                    jwt.verify(token, key, options, (err, p) => {
                        // maxAge not exceded, but still expired
                        assert.equal(err.name, "TokenExpiredError");
                        assert.equal(err.message, "jwt expired");
                        assert.equal(err.expiredAt.constructor.name, "Date");
                        assert.equal(Number(err.expiredAt), 1437018800000);
                        assert.isUndefined(p);
                        done();
                    });
                });
                it("should error if maxAge is specified but there is no iat claim", (done) => {
                    const clockTimestamp = 1437018582;
                    const token = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJmb28iOiJiYXIifQ.0MBPd4Bru9-fK_HY3xmuDAc6N_embknmNuhdb9bKL_U";
                    const options = { algorithms: ["HS256"], clockTimestamp, maxAge: "1s" };

                    jwt.verify(token, key, options, (err, p) => {
                        assert.equal(err.name, "JsonWebTokenError");
                        assert.equal(err.message, "iat required when maxAge is specified");
                        assert.isUndefined(p);
                        done();
                    });
                });
            });
        });
    });

    describe("Asymmetric Algorithms", () => {
        const loadKey = (filename) => fs.readFileSync(filePath(filename));

        const algorithms = {
            RS256: {
                pub_key: loadKey("pub.pem"),
                priv_key: loadKey("priv.pem"),
                invalid_pub_key: loadKey("invalid_pub.pem")
            },
            ES256: {
                // openssl ecparam -name secp256r1 -genkey -param_enc explicit -out ecdsa-private.pem
                priv_key: loadKey("ecdsa-private.pem"),
                // openssl ec -in ecdsa-private.pem -pubout -out ecdsa-public.pem
                pub_key: loadKey("ecdsa-public.pem"),
                invalid_pub_key: loadKey("ecdsa-public-invalid.pem")
            }
        };

        const oldDate = global.Date;
        global.Date.fix = function (timestamp) {
            const time = timestamp * 1000;

            if (global.Date.unfake) {
                global.Date.unfake();
            }

            global.Date = function (ts) {
                return new oldDate(ts || time);
            };

            global.Date.prototype = Object.create(oldDate.prototype);
            global.Date.prototype.constructor = global.Date;

            global.Date.prototype.now = function () {
                return time;
            };

            global.Date.now = function () {
                return time;
            };

            global.Date.unfix = function () {
                global.Date = oldDate;
            };
        };

        for (const algorithm of Object.keys(algorithms)) {
            describe(algorithm, () => {
                const pub = algorithms[algorithm].pub_key;
                const priv = algorithms[algorithm].priv_key;

                // "invalid" means it is not the public key for the loaded "priv" key
                const invalid_pub = algorithms[algorithm].invalid_pub_key;

                describe("when signing a token", () => {
                    const token = jwt.sign({ foo: "bar" }, priv, { algorithm });

                    it("should be syntactically valid", () => {
                        expect(token).to.be.a("string");
                        expect(token.split(".")).to.have.length(3);
                    });

                    context("asynchronous", () => {
                        it("should validate with public key", (done) => {
                            jwt.verify(token, pub, (err, decoded) => {
                                assert.ok(decoded.foo);
                                assert.equal("bar", decoded.foo);
                                done();
                            });
                        });

                        it("should throw with invalid public key", (done) => {
                            jwt.verify(token, invalid_pub, (err, decoded) => {
                                assert.isUndefined(decoded);
                                assert.isNotNull(err);
                                done();
                            });
                        });
                    });

                    context("synchronous", () => {
                        it("should validate with public key", () => {
                            const decoded = jwt.verify(token, pub);
                            assert.ok(decoded.foo);
                            assert.equal("bar", decoded.foo);
                        });

                        it("should throw with invalid public key", () => {
                            const jwtVerify = jwt.verify.bind(null, token, invalid_pub);
                            assert.throw(jwtVerify, "invalid signature");
                        });
                    });

                });

                describe("when signing a token with expiration", () => {
                    let token = jwt.sign({ foo: "bar" }, priv, { algorithm, expiresIn: "10m" });

                    it("should be valid expiration", (done) => {
                        jwt.verify(token, pub, (err, decoded) => {
                            assert.isNotNull(decoded);
                            assert.isNull(err);
                            done();
                        });
                    });

                    it("should be invalid", (done) => {
                        // expired token
                        token = jwt.sign({ foo: "bar" }, priv, { algorithm, expiresIn: -1 * ms("10m") });

                        jwt.verify(token, pub, (err, decoded) => {
                            assert.isUndefined(decoded);
                            assert.isNotNull(err);
                            assert.equal(err.name, "TokenExpiredError");
                            assert.instanceOf(err.expiredAt, Date);
                            assert.instanceOf(err, jwt.TokenExpiredError);
                            done();
                        });
                    });

                    it("should NOT be invalid", (done) => {
                        // expired token
                        token = jwt.sign({ foo: "bar" }, priv, { algorithm, expiresIn: -1 * ms("10m") });

                        jwt.verify(token, pub, { ignoreExpiration: true }, (err, decoded) => {
                            assert.ok(decoded.foo);
                            assert.equal("bar", decoded.foo);
                            done();
                        });
                    });
                });

                describe("when signing a token with not before", () => {
                    let token = jwt.sign({ foo: "bar" }, priv, { algorithm, notBefore: -10 * 3600 });

                    it("should be valid expiration", (done) => {
                        jwt.verify(token, pub, (err, decoded) => {
                            assert.isNotNull(decoded);
                            assert.isNull(err);
                            done();
                        });
                    });

                    it("should be invalid", (done) => {
                        // not active token
                        token = jwt.sign({ foo: "bar" }, priv, { algorithm, notBefore: "10m" });

                        jwt.verify(token, pub, (err, decoded) => {
                            assert.isUndefined(decoded);
                            assert.isNotNull(err);
                            assert.equal(err.name, "NotBeforeError");
                            assert.instanceOf(err.date, Date);
                            assert.instanceOf(err, jwt.NotBeforeError);
                            done();
                        });
                    });

                    it("should valid when date are equals", (done) => {
                        Date.fix(1451908031);

                        token = jwt.sign({ foo: "bar" }, priv, { algorithm, notBefore: 0 });

                        jwt.verify(token, pub, (err, decoded) => {
                            assert.isNull(err);
                            assert.isNotNull(decoded);
                            Date.unfix();
                            done();
                        });
                    });

                    it("should NOT be invalid", (done) => {
                        // not active token
                        token = jwt.sign({ foo: "bar" }, priv, { algorithm, notBefore: "10m" });

                        jwt.verify(token, pub, { ignoreNotBefore: true }, (err, decoded) => {
                            assert.ok(decoded.foo);
                            assert.equal("bar", decoded.foo);
                            done();
                        });
                    });
                });

                describe("when signing a token with audience", () => {
                    const token = jwt.sign({ foo: "bar" }, priv, { algorithm, audience: "urn:foo" });

                    it("should check audience", (done) => {
                        jwt.verify(token, pub, { audience: "urn:foo" }, (err, decoded) => {
                            assert.isNotNull(decoded);
                            assert.isNull(err);
                            done();
                        });
                    });

                    it("should check audience using RegExp", (done) => {
                        jwt.verify(token, pub, { audience: /urn:f[o]{2}/ }, (err, decoded) => {
                            assert.isNotNull(decoded);
                            assert.isNull(err);
                            done();
                        });
                    });

                    it("should check audience in array", (done) => {
                        jwt.verify(token, pub, { audience: ["urn:foo", "urn:other"] }, (err, decoded) => {
                            assert.isNotNull(decoded);
                            assert.isNull(err);
                            done();
                        });
                    });

                    it("should check audience in array using RegExp", (done) => {
                        jwt.verify(token, pub, { audience: ["urn:bar", /urn:f[o]{2}/, "urn:other"] }, (err, decoded) => {
                            assert.isNotNull(decoded);
                            assert.isNull(err);
                            done();
                        });
                    });

                    it("should throw when invalid audience", (done) => {
                        jwt.verify(token, pub, { audience: "urn:wrong" }, (err, decoded) => {
                            assert.isUndefined(decoded);
                            assert.isNotNull(err);
                            assert.equal(err.name, "JsonWebTokenError");
                            assert.instanceOf(err, jwt.JsonWebTokenError);
                            done();
                        });
                    });

                    it("should throw when invalid audience using RegExp", (done) => {
                        jwt.verify(token, pub, { audience: /urn:bar/ }, (err, decoded) => {
                            assert.isUndefined(decoded);
                            assert.isNotNull(err);
                            assert.equal(err.name, "JsonWebTokenError");
                            assert.instanceOf(err, jwt.JsonWebTokenError);
                            done();
                        });
                    });

                    it("should throw when invalid audience in array", (done) => {
                        jwt.verify(token, pub, { audience: ["urn:wrong", "urn:morewrong", /urn:bar/] }, (err, decoded) => {
                            assert.isUndefined(decoded);
                            assert.isNotNull(err);
                            assert.equal(err.name, "JsonWebTokenError");
                            assert.instanceOf(err, jwt.JsonWebTokenError);
                            done();
                        });
                    });

                });

                describe("when signing a token with array audience", () => {
                    const token = jwt.sign({ foo: "bar" }, priv, { algorithm, audience: ["urn:foo", "urn:bar"] });

                    it("should check audience", (done) => {
                        jwt.verify(token, pub, { audience: "urn:foo" }, (err, decoded) => {
                            assert.isNotNull(decoded);
                            assert.isNull(err);
                            done();
                        });
                    });

                    it("should check other audience", (done) => {
                        jwt.verify(token, pub, { audience: "urn:bar" }, (err, decoded) => {
                            assert.isNotNull(decoded);
                            assert.isNull(err);
                            done();
                        });
                    });

                    it("should check audience using RegExp", (done) => {
                        jwt.verify(token, pub, { audience: /urn:f[o]{2}/ }, (err, decoded) => {
                            assert.isNotNull(decoded);
                            assert.isNull(err);
                            done();
                        });
                    });

                    it("should check audience in array", (done) => {
                        jwt.verify(token, pub, { audience: ["urn:foo", "urn:other"] }, (err, decoded) => {
                            assert.isNotNull(decoded);
                            assert.isNull(err);
                            done();
                        });
                    });

                    it("should check audience in array using RegExp", (done) => {
                        jwt.verify(token, pub, { audience: ["urn:one", "urn:other", /urn:f[o]{2}/] }, (err, decoded) => {
                            assert.isNotNull(decoded);
                            assert.isNull(err);
                            done();
                        });
                    });

                    it("should throw when invalid audience", (done) => {
                        jwt.verify(token, pub, { audience: "urn:wrong" }, (err, decoded) => {
                            assert.isUndefined(decoded);
                            assert.isNotNull(err);
                            assert.equal(err.name, "JsonWebTokenError");
                            assert.instanceOf(err, jwt.JsonWebTokenError);
                            done();
                        });
                    });

                    it("should throw when invalid audience using RegExp", (done) => {
                        jwt.verify(token, pub, { audience: /urn:wrong/ }, (err, decoded) => {
                            assert.isUndefined(decoded);
                            assert.isNotNull(err);
                            assert.equal(err.name, "JsonWebTokenError");
                            assert.instanceOf(err, jwt.JsonWebTokenError);
                            done();
                        });
                    });

                    it("should throw when invalid audience in array", (done) => {
                        jwt.verify(token, pub, { audience: ["urn:wrong", "urn:morewrong"] }, (err, decoded) => {
                            assert.isUndefined(decoded);
                            assert.isNotNull(err);
                            assert.equal(err.name, "JsonWebTokenError");
                            assert.instanceOf(err, jwt.JsonWebTokenError);
                            done();
                        });
                    });

                    it("should throw when invalid audience in array", (done) => {
                        jwt.verify(token, pub, { audience: ["urn:wrong", "urn:morewrong", /urn:alsowrong/] }, (err, decoded) => {
                            assert.isUndefined(decoded);
                            assert.isNotNull(err);
                            assert.equal(err.name, "JsonWebTokenError");
                            assert.instanceOf(err, jwt.JsonWebTokenError);
                            done();
                        });
                    });

                });

                describe("when signing a token without audience", () => {
                    const token = jwt.sign({ foo: "bar" }, priv, { algorithm });

                    it("should check audience", (done) => {
                        jwt.verify(token, pub, { audience: "urn:wrong" }, (err, decoded) => {
                            assert.isUndefined(decoded);
                            assert.isNotNull(err);
                            assert.equal(err.name, "JsonWebTokenError");
                            assert.instanceOf(err, jwt.JsonWebTokenError);
                            done();
                        });
                    });

                    it("should check audience using RegExp", (done) => {
                        jwt.verify(token, pub, { audience: /urn:wrong/ }, (err, decoded) => {
                            assert.isUndefined(decoded);
                            assert.isNotNull(err);
                            assert.equal(err.name, "JsonWebTokenError");
                            assert.instanceOf(err, jwt.JsonWebTokenError);
                            done();
                        });
                    });

                    it("should check audience in array", (done) => {
                        jwt.verify(token, pub, { audience: ["urn:wrong", "urn:morewrong", /urn:alsowrong/] }, (err, decoded) => {
                            assert.isUndefined(decoded);
                            assert.isNotNull(err);
                            assert.equal(err.name, "JsonWebTokenError");
                            assert.instanceOf(err, jwt.JsonWebTokenError);
                            done();
                        });
                    });

                });

                describe("when signing a token with issuer", () => {
                    const token = jwt.sign({ foo: "bar" }, priv, { algorithm, issuer: "urn:foo" });

                    it("should check issuer", (done) => {
                        jwt.verify(token, pub, { issuer: "urn:foo" }, (err, decoded) => {
                            assert.isNotNull(decoded);
                            assert.isNull(err);
                            done();
                        });
                    });

                    it("should check the issuer when providing a list of valid issuers", (done) => {
                        jwt.verify(token, pub, { issuer: ["urn:foo", "urn:bar"] }, (err, decoded) => {
                            assert.isNotNull(decoded);
                            assert.isNull(err);
                            done();
                        });
                    });

                    it("should throw when invalid issuer", (done) => {
                        jwt.verify(token, pub, { issuer: "urn:wrong" }, (err, decoded) => {
                            assert.isUndefined(decoded);
                            assert.isNotNull(err);
                            assert.equal(err.name, "JsonWebTokenError");
                            assert.instanceOf(err, jwt.JsonWebTokenError);
                            done();
                        });
                    });
                });

                describe("when signing a token without issuer", () => {
                    const token = jwt.sign({ foo: "bar" }, priv, { algorithm });

                    it("should check issuer", (done) => {
                        jwt.verify(token, pub, { issuer: "urn:foo" }, (err, decoded) => {
                            assert.isUndefined(decoded);
                            assert.isNotNull(err);
                            assert.equal(err.name, "JsonWebTokenError");
                            assert.instanceOf(err, jwt.JsonWebTokenError);
                            done();
                        });
                    });
                });

                describe("when signing a token with subject", () => {
                    const token = jwt.sign({ foo: "bar" }, priv, { algorithm, subject: "subject" });

                    it("should check subject", (done) => {
                        jwt.verify(token, pub, { subject: "subject" }, (err, decoded) => {
                            assert.isNotNull(decoded);
                            assert.isNull(err);
                            done();
                        });
                    });

                    it("should throw when invalid subject", (done) => {
                        jwt.verify(token, pub, { subject: "wrongSubject" }, (err, decoded) => {
                            assert.isUndefined(decoded);
                            assert.isNotNull(err);
                            assert.equal(err.name, "JsonWebTokenError");
                            assert.instanceOf(err, jwt.JsonWebTokenError);
                            done();
                        });
                    });
                });

                describe("when signing a token without subject", () => {
                    const token = jwt.sign({ foo: "bar" }, priv, { algorithm });

                    it("should check subject", (done) => {
                        jwt.verify(token, pub, { subject: "subject" }, (err, decoded) => {
                            assert.isUndefined(decoded);
                            assert.isNotNull(err);
                            assert.equal(err.name, "JsonWebTokenError");
                            assert.instanceOf(err, jwt.JsonWebTokenError);
                            done();
                        });
                    });
                });

                describe("when signing a token with jwt id", () => {
                    const token = jwt.sign({ foo: "bar" }, priv, { algorithm, jwtid: "jwtid" });

                    it("should check jwt id", (done) => {
                        jwt.verify(token, pub, { jwtid: "jwtid" }, (err, decoded) => {
                            assert.isNotNull(decoded);
                            assert.isNull(err);
                            done();
                        });
                    });

                    it("should throw when invalid jwt id", (done) => {
                        jwt.verify(token, pub, { jwtid: "wrongJwtid" }, (err, decoded) => {
                            assert.isUndefined(decoded);
                            assert.isNotNull(err);
                            assert.equal(err.name, "JsonWebTokenError");
                            assert.instanceOf(err, jwt.JsonWebTokenError);
                            done();
                        });
                    });
                });

                describe("when signing a token without jwt id", () => {
                    const token = jwt.sign({ foo: "bar" }, priv, { algorithm });

                    it("should check jwt id", (done) => {
                        jwt.verify(token, pub, { jwtid: "jwtid" }, (err, decoded) => {
                            assert.isUndefined(decoded);
                            assert.isNotNull(err);
                            assert.equal(err.name, "JsonWebTokenError");
                            assert.instanceOf(err, jwt.JsonWebTokenError);
                            done();
                        });
                    });
                });

                describe("when verifying a malformed token", () => {
                    it("should throw", (done) => {
                        jwt.verify("fruit.fruit.fruit", pub, (err, decoded) => {
                            assert.isUndefined(decoded);
                            assert.isNotNull(err);
                            assert.equal(err.name, "JsonWebTokenError");
                            done();
                        });
                    });
                });

                describe("when decoding a jwt token with additional parts", () => {
                    const token = jwt.sign({ foo: "bar" }, priv, { algorithm });

                    it("should throw", (done) => {
                        jwt.verify(`${token}.foo`, pub, (err, decoded) => {
                            assert.isUndefined(decoded);
                            assert.isNotNull(err);
                            done();
                        });
                    });
                });

                describe("when decoding a invalid jwt token", () => {
                    it("should return null", (done) => {
                        const payload = jwt.decode("whatever.token");
                        assert.isNull(payload);
                        done();
                    });
                });

                describe("when decoding a valid jwt token", () => {
                    it("should return the payload", (done) => {
                        const obj = { foo: "bar" };
                        const token = jwt.sign(obj, priv, { algorithm });
                        const payload = jwt.decode(token);
                        assert.equal(payload.foo, obj.foo);
                        done();
                    });
                    it("should return the header and payload and signature if complete option is set", (done) => {
                        const obj = { foo: "bar" };
                        const token = jwt.sign(obj, priv, { algorithm });
                        const decoded = jwt.decode(token, { complete: true });
                        assert.equal(decoded.payload.foo, obj.foo);
                        assert.deepEqual(decoded.header, { typ: "JWT", alg: algorithm });
                        assert.ok(is.string(decoded.signature));
                        done();
                    });
                });
            });
        }
    });

    describe("signing a token asynchronously", () => {
        describe("when signing a token", () => {
            const secret = "shhhhhh";

            it("should return the same result as singing synchronously", (done) => {
                jwt.sign({ foo: "bar" }, secret, { algorithm: "HS256" }, (err, asyncToken) => {
                    if (err) {
                        return done(err);
                    }
                    const syncToken = jwt.sign({ foo: "bar" }, secret, { algorithm: "HS256" });
                    expect(asyncToken).to.be.a("string");
                    expect(asyncToken.split(".")).to.have.length(3);
                    expect(asyncToken).to.equal(syncToken);
                    done();
                });
            });

            it("should work with empty options", (done) => {
                jwt.sign({ abc: 1 }, "secret", {}, (err, res) => {
                    assert.isNull(err);
                    done();
                });
            });

            it("should work without options object at all", (done) => {
                jwt.sign({ abc: 1 }, "secret", (err, res) => {
                    assert.isNull(err);
                    done();
                });
            });

            it("should work with none algorithm where secret is set", (done) => {
                jwt.sign({ foo: "bar" }, "secret", { algorithm: "none" }, (err, token) => {
                    expect(token).to.be.a("string");
                    expect(token.split(".")).to.have.length(3);
                    done();
                });
            });

            //Known bug: https://github.com/brianloveswords/node-jws/issues/62
            //If you need this use case, you need to go for the non-callback-ish code style.
            it.skip("should work with none algorithm where secret is falsy", (done) => {
                jwt.sign({ foo: "bar" }, undefined, { algorithm: "none" }, (err, token) => {
                    expect(token).to.be.a("string");
                    expect(token.split(".")).to.have.length(3);
                    done();
                });
            });

            it("should return error when secret is not a cert for RS256", (done) => {
                //this throw an error because the secret is not a cert and RS256 requires a cert.
                jwt.sign({ foo: "bar" }, secret, { algorithm: "RS256" }, (err) => {
                    assert.ok(err);
                    done();
                });
            });

            it("should return error on wrong arguments", (done) => {
                //this throw an error because the secret is not a cert and RS256 requires a cert.
                jwt.sign({ foo: "bar" }, secret, { notBefore: {} }, (err) => {
                    assert.ok(err);
                    done();
                });
            });

            it("should return error on wrong arguments (2)", (done) => {
                jwt.sign("string", "secret", { noTimestamp: true }, (err) => {
                    assert.instanceOf(err, Error);
                    done();
                });
            });

            // it.skip("should not stringify the payload", (done) => {
            //     jwt.sign("string", "secret", {}, (err, token) => {
            //         if (err) {
            //             return done(err);
            //         }
            //         assert.equal(jws.decode(token).payload, "string");
            //         done();
            //     });
            // });

            describe("secret must have a value", () => {
                [undefined, "", 0].forEach((secret) => {
                    it(`should return an error if the secret is falsy and algorithm is not set to none: ${is.string(secret) ? "(empty string)" : secret}`, (done) => {
                        // This is needed since jws will not answer for falsy secrets
                        jwt.sign("string", secret, {}, (err, token) => {
                            assert.exists(err);
                            assert.equal(err.message, "secretOrPrivateKey must have a value");
                            assert.notExists(token);
                            done();
                        });
                    });
                });
            });
        });
    });

    describe("buffer payload", () => {
        it("should work", () => {
            const payload = Buffer.from("TkJyotZe8NFpgdfnmgINqg==", "base64");
            const token = jwt.sign(payload, "signing key");
            assert.equal(jwt.decode(token), payload.toString());
        });
    });

    describe("encoding", () => {
        it("should properly encode the token (utf8)", () => {
            const expected = "José";
            const token = jwt.sign({ name: expected }, "shhhhh");
            const decodedName = JSON.parse(decodeURIComponent(adone.data.base64url.decode(token.split(".")[1]))).name;
            expect(decodedName).to.equal(expected);
        });

        it("should properly encode the token (binary)", () => {
            const expected = "José";
            const token = jwt.sign({ name: expected }, "shhhhh", { encoding: "binary" });
            const decodedName = JSON.parse(adone.data.base64.decode(token.split(".")[1], { encoding: "utf8" })).name;
            expect(decodedName).to.equal(expected);
        });

        it("should return the same result when decoding", () => {
            const username = "測試";

            const token = jwt.sign({
                username
            }, "test");

            const payload = jwt.verify(token, "test");

            expect(payload.username).to.equal(username);
        });
    });

    describe("expires option", () => {
        it("should work with a number of seconds", () => {
            const token = jwt.sign({ foo: 123 }, "123", { expiresIn: 10 });
            const result = jwt.verify(token, "123");
            expect(result.exp).to.be.closeTo(Math.floor(Date.now() / 1000) + 10, 0.2);
        });

        it("should work with a string", () => {
            const token = jwt.sign({ foo: 123 }, "123", { expiresIn: "2d" });
            const result = jwt.verify(token, "123");
            const two_days_in_secs = 2 * 24 * 60 * 60;
            expect(result.exp).to.be.closeTo(Math.floor(Date.now() / 1000) + two_days_in_secs, 0.2);
        });

        it("should work with a string second example", () => {
            const token = jwt.sign({ foo: 123 }, "123", { expiresIn: "36h" });
            const result = jwt.verify(token, "123");
            const day_and_a_half_in_secs = 1.5 * 24 * 60 * 60;
            expect(result.exp).to.be.closeTo(Math.floor(Date.now() / 1000) + day_and_a_half_in_secs, 0.2);
        });


        it("should throw if expires has a bad string format", () => {
            expect(() => {
                jwt.sign({ foo: 123 }, "123", { expiresIn: "1 monkey" });
            }).to.throw(/"expiresIn" should be a number of seconds or string representing a timespan/);
        });

        it("should throw if expires is not an string or number", () => {
            expect(() => {
                jwt.sign({ foo: 123 }, "123", { expiresIn: { crazy: 213 } });
            }).to.throw(/"expiresIn" should be a number of seconds or string representing a timespan/);
        });

        it("should throw an error if expiresIn and exp are provided", () => {
            expect(() => {
                jwt.sign({ foo: 123, exp: 839218392183 }, "123", { expiresIn: "5h" });
            }).to.throw(/Bad "options.expiresIn" option the payload already has an "exp" property./);
        });


        it("should throw on deprecated expiresInSeconds option", () => {
            expect(() => {
                jwt.sign({ foo: 123 }, "123", { expiresInSeconds: 5 });
            }).to.throw('"expiresInSeconds" is not allowed');
        });
    });

    describe("HS256", () => {
        describe("when signing a token", () => {
            const secret = "shhhhhh";

            const token = jwt.sign({ foo: "bar" }, secret, { algorithm: "HS256" });

            it("should be syntactically valid", () => {
                expect(token).to.be.a("string");
                expect(token.split(".")).to.have.length(3);
            });

            it("should be able to validate without options", (done) => {
                const callback = function (err, decoded) {
                    assert.ok(decoded.foo);
                    assert.equal("bar", decoded.foo);
                    done();
                };
                callback.issuer = "shouldn't affect";
                jwt.verify(token, secret, callback);
            });

            it("should validate with secret", (done) => {
                jwt.verify(token, secret, (err, decoded) => {
                    assert.ok(decoded.foo);
                    assert.equal("bar", decoded.foo);
                    done();
                });
            });

            it("should throw with invalid secret", (done) => {
                jwt.verify(token, "invalid secret", (err, decoded) => {
                    assert.isUndefined(decoded);
                    assert.isNotNull(err);
                    done();
                });
            });

            it("should throw with secret and token not signed", (done) => {
                const signed = jwt.sign({ foo: "bar" }, secret, { algorithm: "none" });
                const unsigned = `${signed.split(".")[0]}.${signed.split(".")[1]}.`;
                jwt.verify(unsigned, "secret", (err, decoded) => {
                    assert.isUndefined(decoded);
                    assert.isNotNull(err);
                    done();
                });
            });

            it("should work with falsy secret and token not signed", (done) => {
                const signed = jwt.sign({ foo: "bar" }, null, { algorithm: "none" });
                const unsigned = `${signed.split(".")[0]}.${signed.split(".")[1]}.`;
                jwt.verify(unsigned, "secret", (err, decoded) => {
                    assert.isUndefined(decoded);
                    assert.isNotNull(err);
                    done();
                });
            });

            it("should throw when verifying null", (done) => {
                jwt.verify(null, "secret", (err, decoded) => {
                    assert.isUndefined(decoded);
                    assert.isNotNull(err);
                    done();
                });
            });

            it("should return an error when the token is expired", (done) => {
                const token = jwt.sign({ exp: 1 }, secret, { algorithm: "HS256" });
                jwt.verify(token, secret, { algorithm: "HS256" }, (err, decoded) => {
                    assert.isUndefined(decoded);
                    assert.isNotNull(err);
                    done();
                });
            });

            it('should NOT return an error when the token is expired with "ignoreExpiration"', (done) => {
                const token = jwt.sign({ exp: 1, foo: "bar" }, secret, { algorithm: "HS256" });
                jwt.verify(token, secret, { algorithm: "HS256", ignoreExpiration: true }, (err, decoded) => {
                    assert.ok(decoded.foo);
                    assert.equal("bar", decoded.foo);
                    assert.isNull(err);
                    done();
                });
            });

            it("should default to HS256 algorithm when no options are passed", () => {
                const token = jwt.sign({ foo: "bar" }, secret);
                const verifiedToken = jwt.verify(token, secret);
                assert.ok(verifiedToken.foo);
                assert.equal("bar", verifiedToken.foo);
            });
        });

        describe("should fail verification gracefully with trailing space in the jwt", () => {
            const secret = "shhhhhh";
            const token = jwt.sign({ foo: "bar" }, secret, { algorithm: "HS256" });

            it('should return the "invalid token" error', (done) => {
                const malformedToken = `${token} `; // corrupt the token by adding a space
                jwt.verify(malformedToken, secret, { algorithm: "HS256", ignoreExpiration: true }, (err, decoded) => {
                    assert.isNotNull(err);
                    assert.equal("JsonWebTokenError", err.name);
                    assert.equal("invalid token", err.message);
                    done();
                });
            });
        });
    });

    describe("iat", () => {
        it("should work with a exp calculated based on numeric iat", () => {
            const dateNow = Math.floor(Date.now() / 1000);
            const iat = dateNow - 30;
            const expiresIn = 50;
            const token = jwt.sign({ foo: 123, iat }, "123", { expiresIn });
            const result = jwt.verify(token, "123");
            expect(result.exp).to.be.closeTo(iat + expiresIn, 0.2);
        });
    });

    describe("invalid expiration", () => {
        it("should fail with string", (done) => {
            const broken_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOiIxMjMiLCJmb28iOiJhZGFzIn0.cDa81le-pnwJMcJi3o3PBwB7cTJMiXCkizIhxbXAKRg";

            jwt.verify(broken_token, "123", (err, decoded) => {
                expect(err.name).to.equal("JsonWebTokenError");
                done();
            });

        });

        it("should fail with 0", (done) => {
            const broken_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjAsImZvbyI6ImFkYXMifQ.UKxix5T79WwfqAA0fLZr6UrhU-jMES2unwCOFa4grEA";

            jwt.verify(broken_token, "123", (err) => {
                expect(err.name).to.equal("TokenExpiredError");
                done();
            });

        });

        it("should fail with false", (done) => {
            const broken_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOmZhbHNlLCJmb28iOiJhZGFzIn0.iBn33Plwhp-ZFXqppCd8YtED77dwWU0h68QS_nEQL8I";

            jwt.verify(broken_token, "123", (err) => {
                expect(err.name).to.equal("JsonWebTokenError");
                done();
            });

        });

        it("should fail with true", (done) => {
            const broken_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOnRydWUsImZvbyI6ImFkYXMifQ.eOWfZCTM5CNYHAKSdFzzk2tDkPQmRT17yqllO-ItIMM";

            jwt.verify(broken_token, "123", (err) => {
                expect(err.name).to.equal("JsonWebTokenError");
                done();
            });

        });

        it("should fail with object", (done) => {
            const broken_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOnt9LCJmb28iOiJhZGFzIn0.1JjCTsWLJ2DF-CfESjLdLfKutUt3Ji9cC7ESlcoBHSY";

            jwt.verify(broken_token, "123", (err) => {
                expect(err.name).to.equal("JsonWebTokenError");
                done();
            });

        });
    });

    describe("issue 70 - public key start with BEING PUBLIC KEY", () => {

        it("should work", (done) => {
            const fs = require("fs");
            const cert_pub = fs.readFileSync(filePath("rsa-public.pem"));
            const cert_priv = fs.readFileSync(filePath("rsa-private.pem"));

            const token = jwt.sign({ foo: "bar" }, cert_priv, { algorithm: "RS256" });

            jwt.verify(token, cert_pub, done);
        });

    });

    describe("issue 147 - signing with a sealed payload", () => {
        it("should put the expiration claim", () => {
            const token = jwt.sign(Object.seal({ foo: 123 }), "123", { expiresIn: 10 });
            const result = jwt.verify(token, "123");
            expect(result.exp).to.be.closeTo(Math.floor(Date.now() / 1000) + 10, 0.2);
        });
    });

    describe("issue 196", () => {
        function b64_to_utf8(str) {
            return decodeURIComponent(adone.data.base64url.decode(str));
        }

        it("should use issuer provided in payload.iss", () => {
            const token = jwt.sign({ iss: "foo" }, "shhhhh");
            const decoded_issuer = JSON.parse(b64_to_utf8(token.split(".")[1])).iss;
            expect(decoded_issuer).to.equal("foo");
        });
    });

    describe("issue 304 - verifying values other than strings", () => {

        it("should fail with numbers", (done) => {
            jwt.verify(123, "foo", (err, decoded) => {
                expect(err.name).to.equal("JsonWebTokenError");
                done();
            });
        });

        it("should fail with objects", (done) => {
            jwt.verify({ foo: "bar" }, "biz", (err, decoded) => {
                expect(err.name).to.equal("JsonWebTokenError");
                done();
            });
        });

        it("should fail with arrays", (done) => {
            jwt.verify(["foo"], "bar", (err, decoded) => {
                expect(err.name).to.equal("JsonWebTokenError");
                done();
            });
        });

        it("should fail with functions", (done) => {
            jwt.verify(() => { }, "foo", (err, decoded) => {
                expect(err.name).to.equal("JsonWebTokenError");
                done();
            });
        });

        it("should fail with booleans", (done) => {
            jwt.verify(true, "foo", (err, decoded) => {
                expect(err.name).to.equal("JsonWebTokenError");
                done();
            });
        });
    });

    describe("noTimestamp", () => {

        it("should work with string", () => {
            var token = jwt.sign({ foo: 123 }, '123', { expiresIn: '5m', noTimestamp: true });
            var result = jwt.verify(token, '123');
            expect(result.exp).to.be.closeTo(Math.floor(Date.now() / 1000) + (5 * 60), 0.5);
        });
    });

    describe("public key start with BEGIN RSA PUBLIC KEY", () => {
        it("should work", (done) => {
            const fs = require("fs");
            const cert_pub = fs.readFileSync(filePath("rsa-public-key.pem"));
            const cert_priv = fs.readFileSync(filePath("rsa-private.pem"));

            const token = jwt.sign({ foo: "bar" }, cert_priv, { algorithm: "RS256" });

            jwt.verify(token, cert_pub, done);
        });
    });

    describe("schema", () => {
        describe("sign options", () => {
            const cert_rsa_priv = fs.readFileSync(filePath("rsa-private.pem"));
            const cert_ecdsa_priv = fs.readFileSync(filePath("ecdsa-private.pem"));

            function sign(options) {
                const isEcdsa = options.algorithm && options.algorithm.indexOf("ES") === 0;
                jwt.sign({ foo: 123 }, isEcdsa ? cert_ecdsa_priv : cert_rsa_priv, options);
            }

            it("should validate expiresIn", () => {
                expect(() => {
                    sign({ expiresIn: "1 monkey" });
                }).to.throw(/"expiresIn" should be a number of seconds or string representing a timespan/);
                expect(() => {
                    sign({ expiresIn: 1.1 });
                }).to.throw(/"expiresIn" should be a number of seconds or string representing a timespan/);
                sign({ expiresIn: "10s" });
                sign({ expiresIn: 10 });
            });

            it("should validate notBefore", () => {
                expect(() => {
                    sign({ notBefore: "1 monkey" });
                }).to.throw(/"notBefore" should be a number of seconds or string representing a timespan/);
                expect(() => {
                    sign({ notBefore: 1.1 });
                }).to.throw(/"notBefore" should be a number of seconds or string representing a timespan/);
                sign({ notBefore: "10s" });
                sign({ notBefore: 10 });
            });

            it("should validate audience", () => {
                expect(() => {
                    sign({ audience: 10 });
                }).to.throw(/"audience" must be a string or array/);
                sign({ audience: "urn:foo" });
                sign({ audience: ["urn:foo"] });
            });

            it("should validate algorithm", () => {
                expect(() => {
                    sign({ algorithm: "foo" });
                }).to.throw(/"algorithm" must be a valid string enum value/);
                sign({ algorithm: "RS256" });
                sign({ algorithm: "RS384" });
                sign({ algorithm: "RS512" });
                sign({ algorithm: "ES256" });
                sign({ algorithm: "ES384" });
                sign({ algorithm: "ES512" });
                sign({ algorithm: "HS256" });
                sign({ algorithm: "HS384" });
                sign({ algorithm: "HS512" });
                sign({ algorithm: "none" });
            });

            it("should validate header", () => {
                expect(() => {
                    sign({ header: "foo" });
                }).to.throw(/"header" must be an object/);
                sign({ header: {} });
            });

            it("should validate encoding", () => {
                expect(() => {
                    sign({ encoding: 10 });
                }).to.throw(/"encoding" must be a string/);
                sign({ encoding: "utf8" });
            });

            it("should validate issuer", () => {
                expect(() => {
                    sign({ issuer: 10 });
                }).to.throw(/"issuer" must be a string/);
                sign({ issuer: "foo" });
            });

            it("should validate subject", () => {
                expect(() => {
                    sign({ subject: 10 });
                }).to.throw(/"subject" must be a string/);
                sign({ subject: "foo" });
            });

            it("should validate noTimestamp", () => {
                expect(() => {
                    sign({ noTimestamp: 10 });
                }).to.throw(/"noTimestamp" must be a boolean/);
                sign({ noTimestamp: true });
            });

            it("should validate keyid", () => {
                expect(() => {
                    sign({ keyid: 10 });
                }).to.throw(/"keyid" must be a string/);
                sign({ keyid: "foo" });
            });

        });

        describe("sign payload registered claims", () => {

            function sign(payload) {
                jwt.sign(payload, "foo123");
            }

            it("should validate iat", () => {
                expect(() => {
                    sign({ iat: "1 monkey" });
                }).to.throw(/"iat" should be a number of seconds/);
                sign({ iat: 10.1 });
            });

            it("should validate exp", () => {
                expect(() => {
                    sign({ exp: "1 monkey" });
                }).to.throw(/"exp" should be a number of seconds/);
                sign({ exp: 10.1 });
            });

            it("should validate nbf", () => {
                expect(() => {
                    sign({ nbf: "1 monkey" });
                }).to.throw(/"nbf" should be a number of seconds/);
                sign({ nbf: 10.1 });
            });
        });
    });

    describe("set header", () => {

        it("should add the header", () => {
            const token = jwt.sign({ foo: 123 }, "123", { header: { foo: "bar" } });
            const decoded = jwt.decode(token, { complete: true });
            expect(decoded.header.foo).to.equal("bar");
        });

        it("should allow overriding header", () => {
            const token = jwt.sign({ foo: 123 }, "123", { header: { alg: "HS512" } });
            const decoded = jwt.decode(token, { complete: true });
            expect(decoded.header.alg).to.equal("HS512");
        });
    });


    describe("verifying without specified secret or public key", () => {
        const TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.t-IDcSemACt8x4iTMCda8Yhe3iZaWbvV5XKSTbuAn0M";

        it("should not verify null", () => {
            expect(() => {
                jwt.verify(TOKEN, null);
            }).to.throw(jwt.JsonWebTokenError, /secret or public key must be provided/);
        });

        it("should not verify undefined", () => {
            expect(() => {
                jwt.verify(TOKEN);
            }).to.throw(jwt.JsonWebTokenError, /secret or public key must be provided/);
        });
    });

    describe("when setting a wrong `header.alg`", () => {
        const pub = fs.readFileSync(filePath("pub.pem"), "utf8");

        const TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJmb28iOiJiYXIiLCJpYXQiOjE0MjY1NDY5MTl9.ETgkTn8BaxIX4YqvUWVFPmum3moNZ7oARZtSBXb_vP4";

        describe("signing with pub key as symmetric", () => {
            it("should not verify", () => {
                expect(() => {
                    jwt.verify(TOKEN, pub);
                }).to.throw(jwt.JsonWebTokenError, /invalid algorithm/);
            });
        });

        describe("signing with pub key as HS256 and whitelisting only RS256", () => {
            it("should not verify", () => {
                expect(() => {
                    jwt.verify(TOKEN, pub, { algorithms: ["RS256"] });
                }).to.throw(jwt.JsonWebTokenError, /invalid algorithm/);
            });
        });

        describe("signing with HS256 and checking with HS384", () => {
            it("should not verify", () => {
                expect(() => {
                    const token = jwt.sign({ foo: "bar" }, "secret", { algorithm: "HS256" });
                    jwt.verify(token, "some secret", { algorithms: ["HS384"] });
                }).to.throw(jwt.JsonWebTokenError, /invalid algorithm/);
            });
        });
    });
});
