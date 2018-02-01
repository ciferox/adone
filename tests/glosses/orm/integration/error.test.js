describe("errors", () => {
    const { orm } = adone;
    const { type } = orm;

    describe("API Surface", () => {

        it.skip("Should have the Error constructors exposed", () => {
            expect(Sequelize).to.have.property("Error");
            expect(Sequelize).to.have.property("ValidationError");
            expect(Sequelize).to.have.property("OptimisticLockError");
            const sequelize = new Sequelize("mysql://user:pass@example.com:9821/dbname");
            expect(sequelize).to.have.property("Error");
            expect(sequelize).to.have.property("ValidationError");
            expect(sequelize).to.have.property("OptimisticLockError");
        });

        it.skip("Sequelize Errors instances should be instances of Error", () => {
            const error = new Sequelize.Error();
            const errorMessage = "error message";
            const validationError = new orm.exception.ValidationError(errorMessage, [
                new orm.exception.ValidationErrorItem("<field name> cannot be null", "notNull Violation", "<field name>", null),
                new orm.exception.ValidationErrorItem("<field name> cannot be an array or an object", "string violation", "<field name>", null)
            ]);
            const optimisticLockError = new orm.exception.OptimisticLockError();

            const sequelize = new Sequelize("mysql://user:pass@example.com:9821/dbname");
            const instError = new sequelize.Error();
            const instValidationError = new sequelize.ValidationError();
            const instOptimisticLockError = new sequelize.OptimisticLockError();

            expect(error).to.be.instanceOf(Sequelize.Error);
            expect(error).to.be.instanceOf(Error);
            expect(error).to.have.property("name", "SequelizeBaseError");

            expect(validationError).to.be.instanceOf(orm.exception.ValidationError);
            expect(validationError).to.be.instanceOf(Error);
            expect(validationError).to.have.property("name", "ValidationError");
            expect(validationError.message).to.equal(errorMessage);

            expect(optimisticLockError).to.be.instanceOf(orm.exception.OptimisticLockError);
            expect(optimisticLockError).to.be.instanceOf(Error);
            expect(optimisticLockError).to.have.property("name", "OptimisticLockError");

            expect(instError).to.be.instanceOf(Sequelize.Error);
            expect(instError).to.be.instanceOf(Error);
            expect(instValidationError).to.be.instanceOf(orm.exception.ValidationError);
            expect(instValidationError).to.be.instanceOf(Error);
            expect(instOptimisticLockError).to.be.instanceOf(orm.exception.OptimisticLockError);
            expect(instOptimisticLockError).to.be.instanceOf(Error);
        });

        it("ValidationError should find errors by path", () => {
            const errorItems = [
                new orm.exception.ValidationErrorItem("invalid", "type", "first_name", null),
                new orm.exception.ValidationErrorItem("invalid", "type", "last_name", null)
            ];
            const validationError = new orm.exception.ValidationError("Validation error", errorItems);
            expect(validationError).to.have.property("get");
            expect(validationError.get).to.be.a("function");

            const matches = validationError.get("first_name");
            expect(matches).to.be.instanceOf(Array);
            expect(matches).to.have.lengthOf(1);
            expect(matches[0]).to.have.property("message", "invalid");
        });

        it("ValidationError should override message property when message parameter is specified", () => {
            const errorItems = [
                new orm.exception.ValidationErrorItem("invalid", "type", "first_name", null),
                new orm.exception.ValidationErrorItem("invalid", "type", "last_name", null)
            ];
            const customErrorMessage = "Custom validation error message";
            const validationError = new orm.exception.ValidationError(customErrorMessage, errorItems);

            expect(validationError).to.have.property("name", "ValidationError");
            expect(validationError.message).to.equal(customErrorMessage);
        });

        it("ValidationError should concatenate an error messages from given errors if no explicit message is defined", () => {
            const errorItems = [
                new orm.exception.ValidationErrorItem("<field name> cannot be null", "notNull Violation", "<field name>", null),
                new orm.exception.ValidationErrorItem("<field name> cannot be an array or an object", "string violation", "<field name>", null)
            ];
            const validationError = new orm.exception.ValidationError(null, errorItems);

            expect(validationError).to.have.property("name", "ValidationError");
            expect(validationError.message).to.match(/notNull Violation: <field name> cannot be null,\nstring violation: <field name> cannot be an array or an object/);
        });

        it("ValidationErrorItem does not require instance & validator constructor parameters", () => {
            const error = new orm.exception.ValidationErrorItem("error!", null, "myfield");

            expect(error).to.be.instanceOf(orm.exception.ValidationErrorItem);
        });

        it("ValidationErrorItem should have instance, key & validator properties when given to constructor", () => {
            const inst = { foo: "bar" };
            const vargs = [4];

            const error = new orm.exception.ValidationErrorItem("error!", "FUNCTION", "foo", "bar", inst, "klen", "len", vargs);

            expect(error).to.have.property("instance");
            expect(error.instance).to.equal(inst);

            expect(error).to.have.property("validatorKey", "klen");
            expect(error).to.have.property("validatorName", "len");
            expect(error).to.have.property("validatorArgs", vargs);
        });

        it("ValidationErrorItem.getValidatorKey() should return a string", () => {
            const error = new orm.exception.ValidationErrorItem("error!", "FUNCTION", "foo", "bar", null, "klen", "len", [4]);

            expect(error).to.have.property("getValidatorKey");
            expect(error.getValidatorKey).to.be.a("function");

            expect(error.getValidatorKey()).to.equal("function.klen");
            expect(error.getValidatorKey(false)).to.equal("klen");
            expect(error.getValidatorKey(0)).to.equal("klen");
            expect(error.getValidatorKey(1, ":")).to.equal("function:klen");
            expect(error.getValidatorKey(true, "-:-")).to.equal("function-:-klen");

            const empty = new orm.exception.ValidationErrorItem("error!", "FUNCTION", "foo", "bar");

            expect(empty.getValidatorKey()).to.equal("");
            expect(empty.getValidatorKey(false)).to.equal("");
            expect(empty.getValidatorKey(0)).to.equal("");
            expect(empty.getValidatorKey(1, ":")).to.equal("");
            expect(empty.getValidatorKey(true, "-:-")).to.equal("");
        });

        it("ValidationErrorItem.getValidatorKey() should throw if namespace separator is invalid (only if NS is used & available)", () => {
            const error = new orm.exception.ValidationErrorItem("error!", "FUNCTION", "foo", "bar", null, "klen", "len", [4]);

            expect(() => error.getValidatorKey(false, {})).to.not.throw();
            expect(() => error.getValidatorKey(false, [])).to.not.throw();
            expect(() => error.getValidatorKey(false, null)).to.not.throw();
            expect(() => error.getValidatorKey(false, "")).to.not.throw();
            expect(() => error.getValidatorKey(false, false)).to.not.throw();
            expect(() => error.getValidatorKey(false, true)).to.not.throw();
            expect(() => error.getValidatorKey(false, undefined)).to.not.throw();
            expect(() => error.getValidatorKey(true, undefined)).to.not.throw(); // undefined will trigger use of function parameter default

            expect(() => error.getValidatorKey(true, {})).to.throw(Error);
            expect(() => error.getValidatorKey(true, [])).to.throw(Error);
            expect(() => error.getValidatorKey(true, null)).to.throw(Error);
            expect(() => error.getValidatorKey(true, "")).to.throw(Error);
            expect(() => error.getValidatorKey(true, false)).to.throw(Error);
            expect(() => error.getValidatorKey(true, true)).to.throw(Error);
        });

        it('ValidationErrorItem should map deprecated "type" values to new "origin" values', () => {
            const data = {
                "notNull Violation": "CORE",
                "string violation": "CORE",
                "unique violation": "DB",
                "Validation error": "FUNCTION"
            };

            Object.keys(data).forEach((k) => {
                const error = new orm.exception.ValidationErrorItem("error!", k, "foo", null);

                expect(error).to.have.property("origin", data[k]);
                expect(error).to.have.property("type", k);
            });
        });

        it("ValidationErrorItem.Origins is valid", () => {
            const ORIGINS = orm.exception.ValidationErrorItem.Origins;

            expect(ORIGINS).to.have.property("CORE", "CORE");
            expect(ORIGINS).to.have.property("DB", "DB");
            expect(ORIGINS).to.have.property("FUNCTION", "FUNCTION");

        });

        it("DatabaseError should keep original message", () => {
            const orig = new Error("original database error message");
            const databaseError = new orm.exception.DatabaseError(orig);

            expect(databaseError).to.have.property("parent");
            expect(databaseError).to.have.property("original");
            expect(databaseError.name).to.equal("DatabaseError");
            expect(databaseError.message).to.equal("original database error message");
        });

        it("ConnectionError should keep original message", () => {
            const orig = new Error("original connection error message");
            const connectionError = new orm.exception.ConnectionError(orig);

            expect(connectionError).to.have.property("parent");
            expect(connectionError).to.have.property("original");
            expect(connectionError.name).to.equal("ConnectionError");
            expect(connectionError.message).to.equal("original connection error message");
        });

        it("ConnectionRefusedError should keep original message", () => {
            const orig = new Error("original connection error message");
            const connectionError = new orm.exception.ConnectionRefusedError(orig);

            expect(connectionError).to.have.property("parent");
            expect(connectionError).to.have.property("original");
            expect(connectionError.name).to.equal("ConnectionRefusedError");
            expect(connectionError.message).to.equal("original connection error message");
        });

        it("AccessDeniedError should keep original message", () => {
            const orig = new Error("original connection error message");
            const connectionError = new orm.exception.AccessDeniedError(orig);

            expect(connectionError).to.have.property("parent");
            expect(connectionError).to.have.property("original");
            expect(connectionError.name).to.equal("AccessDeniedError");
            expect(connectionError.message).to.equal("original connection error message");
        });

        it("HostNotFoundError should keep original message", () => {
            const orig = new Error("original connection error message");
            const connectionError = new orm.exception.HostNotFoundError(orig);

            expect(connectionError).to.have.property("parent");
            expect(connectionError).to.have.property("original");
            expect(connectionError.name).to.equal("HostNotFoundError");
            expect(connectionError.message).to.equal("original connection error message");
        });

        it("HostNotReachableError should keep original message", () => {
            const orig = new Error("original connection error message");
            const connectionError = new orm.exception.HostNotReachableError(orig);

            expect(connectionError).to.have.property("parent");
            expect(connectionError).to.have.property("original");
            expect(connectionError.name).to.equal("HostNotReachableError");
            expect(connectionError.message).to.equal("original connection error message");
        });

        it("InvalidConnectionError should keep original message", () => {
            const orig = new Error("original connection error message");
            const connectionError = new orm.exception.InvalidConnectionError(orig);

            expect(connectionError).to.have.property("parent");
            expect(connectionError).to.have.property("original");
            expect(connectionError.name).to.equal("InvalidConnectionError");
            expect(connectionError.message).to.equal("original connection error message");
        });

        it("ConnectionTimedOutError should keep original message", () => {
            const orig = new Error("original connection error message");
            const connectionError = new orm.exception.ConnectionTimedOutError(orig);

            expect(connectionError).to.have.property("parent");
            expect(connectionError).to.have.property("original");
            expect(connectionError.name).to.equal("ConnectionTimedOutError");
            expect(connectionError.message).to.equal("original connection error message");
        });
    });

    describe("Constraint error", () => {
        [
            {
                type: "UniqueConstraintError",
                exception: orm.exception.UniqueConstraintError
            },
            {
                type: "ValidationError",
                exception: orm.exception.ValidationError
            }
        ].forEach((constraintTest) => {

            it.skip(`Can be intercepted as ${constraintTest.type} using .catch`, function () {
                const s = spy();
                const User = this.sequelize.define("user", {
                    first_name: {
                        type: type.STRING,
                        unique: "unique_name"
                    },
                    last_name: {
                        type: type.STRING,
                        unique: "unique_name"
                    }
                });

                const record = { first_name: "jan", last_name: "meier" };
                return this.sequelize.sync({ force: true }).then(() => {
                    return User.create(record);
                }).then(() => {
                    return User.create(record).catch(constraintTest.exception, s);
                }).then(() => {
                    expect(s).to.have.been.calledOnce();
                });
            });

        });

        it("Supports newlines in keys", function () {
            const s = spy();
            const User = this.sequelize.define("user", {
                name: {
                    type: type.STRING,
                    unique: "unique \n unique"
                }
            });

            return this.sequelize.sync({ force: true }).then(() => {
                return User.create({ name: "jan" });
            }).then(() => {
                return User.create({ name: "jan" }).catch((err) => {
                    if (err instanceof this.sequelize.UniqueConstraintError) {
                        s();
                    }
                });
            }).then(() => {
                expect(s).to.have.been.calledOnce();
            });
        });

        it("Works when unique keys are not defined in sequelize", async function () {
            let User = this.sequelize.define("user", {
                name: {
                    type: type.STRING,
                    unique: "unique \n unique"
                }
            }, { timestamps: false });

            await this.sequelize.sync({ force: true });
            // Now let's pretend the index was created by someone else, and sequelize doesn't know about it
            User = this.sequelize.define("user", {
                name: type.STRING
            }, { timestamps: false });

            await User.create({ name: "jan" });

            // It should work even though the unique key is not defined in the model
            await assert.throws(async () => {
                await User.create({ name: "jan" });
            }, this.sequelize.UniqueConstraintError);

            // And when the model is not passed at all
            await assert.throws(async () => {
                await this.sequelize.query("INSERT INTO users (name) VALUES ('jan')");
            }, this.sequelize.UniqueConstraintError);
        });

        it("adds parent and sql properties", async function () {
            const User = this.sequelize.define("user", {
                name: {
                    type: type.STRING,
                    unique: "unique"
                }
            }, { timestamps: false });

            await this.sequelize.sync({ force: true });
            await User.create({ name: "jan" });
            const error = await assert.throws(async () => {
                await User.create({ name: "jan" });
            });
            expect(error).to.be.instanceOf(this.sequelize.UniqueConstraintError);
            expect(error).to.have.property("parent");
            expect(error).to.have.property("original");
            expect(error).to.have.property("sql");
        });
    });
});
