import Support from "../../support";
import config from "../../config/config";

const { is } = adone;
const Sequelize = Support.Sequelize;
const current = Support.sequelize;


describe(Support.getTestDialectTeaser("InstanceValidator"), () => {
    describe("validations", () => {
        const checks = {
            is: {
                spec: { args: ["[a-z]", "i"] },
                fail: "0",
                pass: "a"
            },
            not: {
                spec: { args: ["[a-z]", "i"] },
                fail: "a",
                pass: "0"
            },
            isEmail: {
                fail: "a",
                pass: "abc@abc.com"
            },
            isUrl: {
                fail: "abc",
                pass: "http://abc.com"
            },
            isIP: {
                fail: "abc",
                pass: "129.89.23.1"
            },
            isIPv4: {
                fail: "abc",
                pass: "129.89.23.1"
            },
            isIPv6: {
                fail: "1111:2222:3333::5555:",
                pass: "fe80:0000:0000:0000:0204:61ff:fe9d:f156"
            },
            isAlpha: {
                stringOrBoolean: true,
                spec: { args: "en-GB" },
                fail: "012",
                pass: "abc"
            },
            isAlphanumeric: {
                stringOrBoolean: true,
                spec: { args: "en-GB" },
                fail: "_abc019",
                pass: "abc019"
            },
            isNumeric: {
                fail: "abc",
                pass: "019"
            },
            isInt: {
                fail: "9.2",
                pass: "-9"
            },
            isLowercase: {
                fail: "AB",
                pass: "ab"
            },
            isUppercase: {
                fail: "ab",
                pass: "AB"
            },
            isDecimal: {
                fail: "a",
                pass: "0.2"
            },
            isFloat: {
                fail: "a",
                pass: "9.2"
            },
            isNull: {
                fail: 0,
                pass: null
            },
            notEmpty: {
                fail: "       ",
                pass: "a"
            },
            equals: {
                spec: { args: "bla bla bla" },
                fail: "bla",
                pass: "bla bla bla"
            },
            contains: {
                spec: { args: "bla" },
                fail: "la",
                pass: "0bla23"
            },
            notContains: {
                spec: { args: "bla" },
                fail: "0bla23",
                pass: "la"
            },
            regex: {
                spec: { args: ["[a-z]", "i"] },
                fail: "0",
                pass: "a"
            },
            notRegex: {
                spec: { args: ["[a-z]", "i"] },
                fail: "a",
                pass: "0"
            },
            len: {
                spec: { args: [2, 4] },
                fail: ["1", "12345"],
                pass: ["12", "123", "1234"],
                raw: true
            },
            len$: {
                spec: [2, 4],
                fail: ["1", "12345"],
                pass: ["12", "123", "1234"],
                raw: true
            },
            isUUID: {
                spec: { args: 4 },
                fail: "f47ac10b-58cc-3372-a567-0e02b2c3d479",
                pass: "f47ac10b-58cc-4372-a567-0e02b2c3d479"
            },
            isDate: {
                fail: "not a date",
                pass: "2011-02-04"
            },
            isAfter: {
                spec: { args: "2011-11-05" },
                fail: "2011-11-04",
                pass: "2011-11-06"
            },
            isBefore: {
                spec: { args: "2011-11-05" },
                fail: "2011-11-06",
                pass: "2011-11-04"
            },
            isIn: {
                spec: { args: "abcdefghijk" },
                fail: "ghik",
                pass: "ghij"
            },
            notIn: {
                spec: { args: "abcdefghijk" },
                fail: "ghij",
                pass: "ghik"
            },
            max: {
                spec: { args: 23 },
                fail: "24",
                pass: "23"
            },
            max$: {
                spec: 23,
                fail: "24",
                pass: "23"
            },
            min: {
                spec: { args: 23 },
                fail: "22",
                pass: "23"
            },
            min$: {
                spec: 23,
                fail: "22",
                pass: "23"
            },
            isCreditCard: {
                fail: "401288888888188f",
                pass: "4012888888881881"
            }
        };

        const applyFailTest = function applyFailTest(validatorDetails, i, validator) { // eslint-disable-line
                const failingValue = validatorDetails.fail[i];
                it(`correctly specifies an instance as invalid using a value of "${failingValue}" for the validation "${validator}"`, async function () {
                    const validations = {};
                    const message = `${validator}(${failingValue})`;

                    validations[validator] = validatorDetails.spec || {};
                    validations[validator].msg = message;

                    const UserFail = this.sequelize.define(`User${config.rand()}`, {
                        name: {
                            type: Sequelize.STRING,
                            validate: validations
                        }
                    });

                    const failingUser = UserFail.build({ name: failingValue });

                    const _errors = await assert.throws(async () => {
                        await failingUser.validate();
                    });
                    expect(_errors.get("name")[0].message).to.equal(message);
                    expect(_errors.get("name")[0].value).to.equal(failingValue);
                });
            },
            applyPassTest = function applyPassTest(validatorDetails, j, validator, type) {
                const succeedingValue = validatorDetails.pass[j];
                it(`correctly specifies an instance as valid using a value of "${succeedingValue}" for the validation "${validator}"`, async function () {
                    const validations = {};
                    const message = `${validator}(${succeedingValue})`;

                    validations[validator] = validatorDetails.spec || {};

                    if (type === "msg") {
                        validations[validator].msg = message;
                    } else if (type === "args") {
                        validations[validator].args = validations[validator].args || true;
                        validations[validator].msg = message;
                    } else if (type === "true") {
                        validations[validator] = true;
                    }

                    const UserSuccess = this.sequelize.define(`User${config.rand()}`, {
                        name: {
                            type: Sequelize.STRING,
                            validate: validations
                        }
                    });
                    const successfulUser = UserSuccess.build({ name: succeedingValue });
                    await successfulUser.validate();
                });
            };

        for (let validator in checks) {
            if (checks.hasOwnProperty(validator)) {
                validator = validator.replace(/\$$/, "");
                const validatorDetails = checks[validator];

                if (!validatorDetails.raw) {
                    validatorDetails.fail = is.array(validatorDetails.fail) ? validatorDetails.fail : [validatorDetails.fail];
                    validatorDetails.pass = is.array(validatorDetails.pass) ? validatorDetails.pass : [validatorDetails.pass];
                }

                for (let i = 0; i < validatorDetails.fail.length; i++) {
                    applyFailTest(validatorDetails, i, validator);
                }

                for (let i = 0; i < validatorDetails.pass.length; i++) {
                    applyPassTest(validatorDetails, i, validator);
                    applyPassTest(validatorDetails, i, validator, "msg");
                    applyPassTest(validatorDetails, i, validator, "args");
                    if (validatorDetails.stringOrBoolean || is.undefined(validatorDetails.spec)) {
                        applyPassTest(validatorDetails, i, validator, "true");
                    }
                }
            }
        }
    });

    describe("datatype validations", () => {
        const current = Support.createSequelizeInstance({
            typeValidation: true
        });

        const User = current.define("user", {
            age: Sequelize.INTEGER,
            name: Sequelize.STRING,
            awesome: Sequelize.BOOLEAN,
            number: Sequelize.DECIMAL,
            uid: Sequelize.UUID,
            date: Sequelize.DATE
        });

        before(function () {
            this.stub = stub(current, "query").callsFake(() => {
                return new Promise((resolve) => {
                    resolve([User.build({}), 1]);
                });
            });
        });

        after(function () {
            this.stub.restore();
        });

        describe("should not throw", () => {
            describe("create", () => {
                it("should allow number as a string", async () => {
                    await User.create({
                        age: "12"
                    });
                });

                it("should allow decimal as a string", async () => {
                    await User.create({
                        number: "12.6"
                    });
                });

                it("should allow dates as a string", async () => {
                    await User.find({
                        where: {
                            date: "2000-12-16"
                        }
                    });
                });

                it("should allow decimal big numbers as a string", async () => {
                    await User.create({
                        number: "2321312301230128391820831289123012"
                    });
                });

                it("should allow decimal as scientific notation", async () => {
                    await User.create({
                        number: "2321312301230128391820e219"
                    });
                    await User.create({
                        number: "2321312301230128391820e+219"
                    });
                    await assert.throws(async () => {
                        await User.create({
                            number: "2321312301230128391820f219"
                        });
                    });
                });

                it("should allow string as a number", async () => {
                    await User.create({
                        name: 12
                    });
                });

                it("should allow 0/1 as a boolean", async () => {
                    await User.create({
                        awesome: 1
                    });
                });

                it("should allow 0/1 string as a boolean", async () => {
                    await User.create({
                        awesome: "1"
                    });
                });

                it("should allow true/false string as a boolean", async () => {
                    await User.create({
                        awesome: "true"
                    });
                });
            });

            describe("findAll", () => {
                it("should allow $in", async () => {
                    await User.all({
                        where: {
                            name: {
                                $like: {
                                    $any: ["foo%", "bar%"]
                                }
                            }
                        }
                    });
                });

                it("should allow $like for uuid", async () => {
                    await User.all({
                        where: {
                            uid: {
                                $like: "12345678%"
                            }
                        }
                    });
                });
            });
        });

        describe("should throw validationerror", () => {

            describe("create", () => {
                it("should throw when passing string", async () => {
                    const err = await assert.throws(async () => {
                        await User.create({
                            age: "jan"
                        });
                    });
                    expect(err).to.be.instanceof(current.ValidationError);
                });

                it("should throw when passing decimal", async () => {
                    const err = await assert.throws(async () => {
                        await User.create({
                            age: 4.5
                        });
                    });
                    expect(err).to.be.instanceof(current.ValidationError);
                });
            });

            describe("update", () => {
                it("should throw when passing string", async () => {
                    const err = await assert.throws(async () => {
                        await User.update({
                            age: "jan"
                        }, { where: {} });
                    });
                    expect(err).to.be.instanceof(current.ValidationError);
                });

                it("should throw when passing decimal", async () => {
                    const err = await assert.throws(async () => {
                        await User.update({
                            age: 4.5
                        }, { where: {} });
                    });
                    expect(err).to.be.instanceof(current.ValidationError);
                });
            });

        });
    });

    describe("custom validation functions", () => {

        const User = current.define("user", {
            age: {
                type: Sequelize.INTEGER,
                validate: {
                    customFn(val, next) {
                        if (val < 0) {
                            next("age must be greater or equal zero");
                        } else {
                            next();
                        }
                    }
                }
            },
            name: Sequelize.STRING
        }, {
            validate: {
                customFn() {
                    if (this.get("name") === "error") {
                        return Promise.reject(new Error("Error from model validation promise"));
                    }
                    return Promise.resolve();
                }
            }
        });

        before(function () {
            this.stub = stub(current, "query").returns(Promise.resolve([User.build(), 1]));
        });

        after(function () {
            this.stub.restore();
        });

        describe("should not throw", () => {
            describe("create", () => {
                it("custom validation functions are successful", async () => {
                    await User.create({
                        age: 1,
                        name: "noerror"
                    });
                });
            });

            describe("update", () => {
                it("custom validation functions are successful", async () => {
                    await User.update({
                        age: 1,
                        name: "noerror"
                    }, { where: {} });
                });
            });
        });

        describe("should throw validationerror", () => {
            describe("create", () => {
                it("custom attribute validation function fails", async () => {
                    const err = await assert.throws(async () => {
                        await User.create({
                            age: -1
                        });
                    });
                    expect(err).to.be.instanceof(current.ValidationError);
                });

                it("custom model validation function fails", async () => {
                    const err = await assert.throws(async () => {
                        await User.create({
                            name: "error"
                        });
                    });
                    expect(err).to.be.instanceof(current.ValidationError);
                });
            });

            describe("update", () => {
                it("custom attribute validation function fails", async () => {
                    const err = await assert.throws(async () => {
                        await User.update({
                            age: -1
                        }, { where: {} });
                    });
                    expect(err).to.be.instanceof(current.ValidationError);
                });

                it("when custom model validation function fails", async () => {
                    const err = await assert.throws(async () => {
                        await User.update({
                            name: "error"
                        }, { where: {} });
                    });
                    expect(err).to.be.instanceof(current.ValidationError);
                });
            });
        });
    });

    describe("custom validation functions returning promises", () => {

        const User = current.define("user", {
            name: Sequelize.STRING
        }, {
            validate: {
                customFn() {
                    if (this.get("name") === "error") {
                        return Promise.reject(new Error("Error from model validation promise"));
                    }
                    return Promise.resolve();
                }
            }
        });

        before(function () {
            this.stub = stub(current, "query").returns(Promise.resolve([User.build(), 1]));
        });

        after(function () {
            this.stub.restore();
        });

        describe("should not throw", () => {
            describe("create", () => {
                it("custom model validation functions are successful", async () => {
                    await User.create({
                        name: "noerror"
                    });
                });
            });

            describe("update", () => {
                it("custom model validation functions are successful", async () => {
                    await User.update({
                        name: "noerror"
                    }, { where: {} });
                });
            });
        });

        describe("should throw validationerror", () => {
            describe("create", () => {
                it("custom model validation function fails", async () => {
                    const err = await assert.throws(async () => {
                        await User.create({
                            name: "error"
                        });
                    });
                    expect(err).to.be.instanceof(current.ValidationError);
                });
            });

            describe("update", () => {
                it("when custom model validation function fails", async () => {
                    const err = await assert.throws(async () => {
                        await User.update({
                            name: "error"
                        }, { where: {} });
                    });
                    expect(err).to.be.instanceof(current.ValidationError);
                });
            });
        });
    });

});
