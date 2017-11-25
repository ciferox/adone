import Support from "./support";
import config from "../config/config";

const { orm } = adone;
const { type } = orm;
const { is } = adone;

describe(Support.getTestDialectTeaser("InstanceValidator"), () => {
    describe("#update", () => {
        it("should allow us to update specific columns without tripping the validations", function () {
            const User = this.sequelize.define("model", {
                username: type.STRING,
                email: {
                    type: type.STRING,
                    allowNull: false,
                    validate: {
                        isEmail: {
                            msg: "You must enter a valid email address"
                        }
                    }
                }
            });

            return User.sync({ force: true }).then(() => {
                return User.create({ username: "bob", email: "hello@world.com" }).then((user) => {
                    return User
                        .update({ username: "toni" }, { where: { id: user.id } })
                        .then(() => {
                            return User.findById(1).then((user) => {
                                expect(user.username).to.equal("toni");
                            });
                        });
                });
            });
        });

        it("should be able to emit an error upon updating when a validation has failed from an instance", function () {
            const Model = this.sequelize.define("model", {
                name: {
                    type: type.STRING,
                    allowNull: false,
                    validate: {
                        notEmpty: true // don't allow empty strings
                    }
                }
            });

            return Model.sync({ force: true }).then(() => {
                return Model.create({ name: "World" }).then((model) => {
                    return model.updateAttributes({ name: "" }).catch((err) => {
                        expect(err).to.be.an.instanceOf(Error);
                        expect(err.get("name")[0].message).to.equal("Validation notEmpty on name failed");
                    });
                });
            });
        });

        it("should be able to emit an error upon updating when a validation has failed from the factory", function () {
            const Model = this.sequelize.define("model", {
                name: {
                    type: type.STRING,
                    allowNull: false,
                    validate: {
                        notEmpty: true // don't allow empty strings
                    }
                }
            });

            return Model.sync({ force: true }).then(() => {
                return Model.create({ name: "World" }).then(() => {
                    return Model.update({ name: "" }, { where: { id: 1 } }).catch((err) => {
                        expect(err).to.be.an.instanceOf(Error);
                        expect(err.get("name")[0].message).to.equal("Validation notEmpty on name failed");
                    });
                });
            });
        });

        it("should enforce a unique constraint", async function () {
            const Model = this.sequelize.define("model", {
                uniqueName: { type: type.STRING, unique: true }
            });
            const records = [
                { uniqueName: "unique name one" },
                { uniqueName: "unique name two" }
            ];
            await Model.sync({ force: true });
            let instance = await Model.create(records[0]);
            expect(instance).to.be.ok;

            instance = await Model.create(records[1]);
            expect(instance).to.be.ok;

            const err = await assert.throws(async () => {
                await Model.update(records[0], { where: { id: instance.id } });
            });
            expect(err).to.be.an.instanceOf(Error);
            expect(err.errors).to.have.length(1);
            expect(err.errors[0].path).to.include("uniqueName");
            expect(err.errors[0].message).to.include("must be unique");
        });

        it("should allow a custom unique constraint error message", async function () {
            const Model = this.sequelize.define("model", {
                uniqueName: {
                    type: type.STRING,
                    unique: { msg: "custom unique error message" }
                }
            });
            const records = [
                { uniqueName: "unique name one" },
                { uniqueName: "unique name two" }
            ];
            await Model.sync({ force: true });
            let instance = await Model.create(records[0]);
            expect(instance).to.be.ok;

            instance = await Model.create(records[1]);
            expect(instance).to.be.ok;

            const err = await assert.throws(async () => {
                await Model.update(records[0], { where: { id: instance.id } });
            });

            expect(err).to.be.an.instanceOf(Error);
            expect(err.errors).to.have.length(1);
            expect(err.errors[0].path).to.include("uniqueName");
            expect(err.errors[0].message).to.equal("custom unique error message");
        });

        it("should handle multiple unique messages correctly", async function () {
            const Model = this.sequelize.define("model", {
                uniqueName1: {
                    type: type.STRING,
                    unique: { msg: "custom unique error message 1" }
                },
                uniqueName2: {
                    type: type.STRING,
                    unique: { msg: "custom unique error message 2" }
                }
            });
            const records = [
                { uniqueName1: "unique name one", uniqueName2: "unique name one" },
                { uniqueName1: "unique name one", uniqueName2: "this is ok" },
                { uniqueName1: "this is ok", uniqueName2: "unique name one" }
            ];
            await Model.sync({ force: true });
            const instance = await Model.create(records[0]);
            expect(instance).to.be.ok;

            let err = await assert.throws(async () => {
                await Model.create(records[1]);
            });
            expect(err).to.be.an.instanceOf(Error);
            expect(err.errors).to.have.length(1);
            expect(err.errors[0].path).to.include("uniqueName1");
            expect(err.errors[0].message).to.equal("custom unique error message 1");

            err = await assert.throws(async () => {
                await Model.create(records[2]);
            });
            expect(err).to.be.an.instanceOf(Error);
            expect(err.errors).to.have.length(1);
            expect(err.errors[0].path).to.include("uniqueName2");
            expect(err.errors[0].message).to.equal("custom unique error message 2");
        });
    });

    describe("#create", () => {
        describe("generic", () => {
            beforeEach(function () {
                const self = this;

                const Project = this.sequelize.define("Project", {
                    name: {
                        type: type.STRING,
                        allowNull: false,
                        defaultValue: "unknown",
                        validate: {
                            isIn: [["unknown", "hello", "test"]]
                        }
                    }
                });

                const Task = this.sequelize.define("Task", {
                    something: type.INTEGER
                });

                Project.hasOne(Task);
                Task.belongsTo(Project);

                return this.sequelize.sync({ force: true }).then(() => {
                    self.Project = Project;
                    self.Task = Task;
                });
            });

            it("correctly throws an error using create method ", function () {
                return this.Project.create({ name: "nope" }).catch((err) => {
                    expect(err).to.have.ownProperty("name");
                });
            });

            it("correctly validates using create method ", function () {
                const self = this;
                return this.Project.create({}).then((project) => {
                    return self.Task.create({ something: 1 }).then((task) => {
                        return project.setTask(task).then((task) => {
                            expect(task.ProjectId).to.not.be.null;
                            return task.setProject(project).then((project) => {
                                expect(project.ProjectId).to.not.be.null;
                            });
                        });
                    });
                });
            });
        });

        describe("explicitly validating primary/auto incremented columns", () => {
            it("should emit an error when we try to enter in a string for the id key without validation arguments", function () {
                const User = this.sequelize.define("UserId", {
                    id: {
                        type: type.INTEGER,
                        autoIncrement: true,
                        primaryKey: true,
                        validate: {
                            isInt: true
                        }
                    }
                });

                return User.sync({ force: true }).then(() => {
                    return User.create({ id: "helloworld" }).catch((err) => {
                        expect(err).to.be.an.instanceOf(Error);
                        expect(err.get("id")[0].message).to.equal("Validation isInt on id failed");
                    });
                });
            });

            it("should emit an error when we try to enter in a string for an auto increment key (not named id)", function () {
                const User = this.sequelize.define("UserId", {
                    username: {
                        type: type.INTEGER,
                        autoIncrement: true,
                        primaryKey: true,
                        validate: {
                            isInt: { args: true, msg: "Username must be an integer!" }
                        }
                    }
                });

                return User.sync({ force: true }).then(() => {
                    return User.create({ username: "helloworldhelloworld" }).catch((err) => {
                        expect(err).to.be.an.instanceOf(Error);
                        expect(err.get("username")[0].message).to.equal("Username must be an integer!");
                    });
                });
            });

            describe("primaryKey with the name as id with arguments for it's validatio", () => {
                beforeEach(function () {
                    this.User = this.sequelize.define("UserId", {
                        id: {
                            type: type.INTEGER,
                            autoIncrement: true,
                            primaryKey: true,
                            validate: {
                                isInt: { args: true, msg: "ID must be an integer!" }
                            }
                        }
                    });

                    return this.User.sync({ force: true });
                });

                it("should emit an error when we try to enter in a string for the id key with validation arguments", function () {
                    return this.User.create({ id: "helloworld" }).catch((err) => {
                        expect(err).to.be.an.instanceOf(Error);
                        expect(err.get("id")[0].message).to.equal("ID must be an integer!");
                    });
                });

                it("should emit an error when we try to enter in a string for an auto increment key through .build().validate()", async function () {
                    const user = this.User.build({ id: "helloworld" });

                    const err = await assert.throws(async () => {
                        await user.validate();
                    });

                    expect(err.get("id")[0].message).to.equal("ID must be an integer!");
                });

                it("should emit an error when we try to .save()", function () {
                    const user = this.User.build({ id: "helloworld" });
                    return user.save().catch((err) => {
                        expect(err).to.be.an.instanceOf(Error);
                        expect(err.get("id")[0].message).to.equal("ID must be an integer!");
                    });
                });
            });
        });

        describe("pass all paths when validating", () => {
            beforeEach(function () {
                const self = this;
                const Project = this.sequelize.define("Project", {
                    name: {
                        type: type.STRING,
                        allowNull: false,
                        validate: {
                            isIn: [["unknown", "hello", "test"]]
                        }
                    },
                    creatorName: {
                        type: type.STRING,
                        allowNull: false
                    },
                    cost: {
                        type: type.INTEGER,
                        allowNull: false
                    }

                });

                const Task = this.sequelize.define("Task", {
                    something: type.INTEGER
                });

                Project.hasOne(Task);
                Task.belongsTo(Project);

                return Project.sync({ force: true }).then(() => {
                    return Task.sync({ force: true }).then(() => {
                        self.Project = Project;
                        self.Task = Task;
                    });
                });
            });

            it("produce 3 errors", function () {
                return this.Project.create({}).catch((err) => {
                    expect(err).to.be.an.instanceOf(Error);
                    delete err.stack; // longStackTraces
                    expect(err.errors).to.have.length(3);
                });
            });
        });

        describe("not null schema validation", () => {
            beforeEach(function () {
                const Project = this.sequelize.define("Project", {
                    name: {
                        type: type.STRING,
                        allowNull: false,
                        validate: {
                            isIn: [["unknown", "hello", "test"]] // important to be
                        }
                    }
                });

                return this.sequelize.sync({ force: true }).then(() => {
                    this.Project = Project;
                });
            });

            it("correctly throws an error using create method ", function () {
                return this.Project.create({})
                    .then(() => {
                        throw new Error("Validation must be failed");
                    }, () => {
                        // fail is ok
                    });
            });

            it("correctly throws an error using create method with default generated messages", function () {
                return this.Project.create({}).catch((err) => {
                    expect(err).to.have.property("name", "ValidationError");
                    expect(err.message).equal("notNull Violation: Project.name cannot be null");
                    expect(err.errors).to.be.an("array").and.have.length(1);
                    expect(err.errors[0]).to.have.property("message", "Project.name cannot be null");
                });
            });
        });
    });

    it("correctly validates using custom validation methods", async function () {
        const User = this.sequelize.define(`User${config.rand()}`, {
            name: {
                type: type.STRING,
                validate: {
                    customFn(val, next) {
                        if (val !== "2") {
                            next("name should equal '2'");
                        } else {
                            next();
                        }
                    }
                }
            }
        });

        const failingUser = User.build({ name: "3" });

        const error = await assert.throws(async () => {
            await failingUser.validate();
        });

        expect(error).to.be.an.instanceOf(Error);
        expect(error.get("name")[0].message).to.equal("name should equal '2'");

        const successfulUser = User.build({ name: "2" });
        await successfulUser.validate();
    });

    it("supports promises with custom validation methods", async function () {
        const self = this;
        const User = this.sequelize.define(`User${config.rand()}`, {
            name: {
                type: type.STRING,
                validate: {
                    customFn(val) {
                        return User.findAll()
                            .then(() => {
                                if (val === "error") {
                                    throw new Error("Invalid username");
                                }
                            });
                    }
                }
            }
        });

        await User.sync();
        const error = await assert.throws(async () => {
            await User.build({ name: "error" }).validate();
        });
        expect(error).to.be.instanceof(self.sequelize.ValidationError);
        expect(error.get("name")[0].message).to.equal("Invalid username");

        await User.build({ name: "no error" }).validate();
    });

    it("skips other validations if allowNull is true and the value is null", async function () {
        const User = this.sequelize.define(`User${config.rand()}`, {
            age: {
                type: type.INTEGER,
                allowNull: true,
                validate: {
                    min: { args: 0, msg: "must be positive" }
                }
            }
        });

        const err = await assert.throws(async () => {
            await User.build({ age: -1 }).validate();
        });

        expect(err.get("age")[0].message).to.equal("must be positive");
    });

    it("validates a model with custom model-wide validation methods", async function () {
        const Foo = this.sequelize.define(`Foo${config.rand()}`, {
            field1: {
                type: type.INTEGER,
                allowNull: true
            },
            field2: {
                type: type.INTEGER,
                allowNull: true
            }
        }, {
            validate: {
                xnor() {
                    if (is.null(this.field1) === (is.null(this.field2))) {
                        throw new Error("xnor failed");
                    }
                }
            }
        });

        const error = await assert.throws(async () => {
            await Foo.build({ field1: null, field2: null }).validate();
        });
        expect(error.get("xnor")[0].message).to.equal("xnor failed");

        await Foo.build({ field1: 33, field2: null }).validate();
    });

    it("validates model with a validator whose arg is an Array successfully twice in a row", async function () {
        const Foo = this.sequelize.define(`Foo${config.rand()}`, {
            bar: {
                type: type.STRING,
                validate: {
                    isIn: [["a", "b"]]
                }
            }
        });
        const foo = Foo.build({ bar: "a" });
        await foo.validate();
        await foo.validate();
    });

    it("validates enums", async function () {
        const values = ["value1", "value2"];

        const Bar = this.sequelize.define(`Bar${config.rand()}`, {
            field: {
                type: type.ENUM,
                values,
                validate: {
                    isIn: [values]
                }
            }
        });

        const failingBar = Bar.build({ field: "value3" });

        const errors = await assert.throws(async () => {
            await failingBar.validate();
        });

        expect(errors.get("field")).to.have.length(1);
        expect(errors.get("field")[0].message).to.equal("Validation isIn on field failed");
    });

    it("skips validations for the given fields", async function () {
        const values = ["value1", "value2"];

        const Bar = this.sequelize.define(`Bar${config.rand()}`, {
            field: {
                type: type.ENUM,
                values,
                validate: {
                    isIn: [values]
                }
            }
        });

        const failingBar = Bar.build({ field: "value3" });

        await failingBar.validate({ skip: ["field"] });
    });

    it("raises an error if saving a different value into an immutable field", async function () {
        const User = this.sequelize.define("User", {
            name: {
                type: type.STRING,
                validate: {
                    isImmutable: true
                }
            }
        });

        await User.sync({ force: true });
        const user = await User.create({ name: "RedCat" });
        expect(user.getDataValue("name")).to.equal("RedCat");
        user.setDataValue("name", "YellowCat");

        const errors = await assert.throws(async () => {
            await user.save();
        });
        expect(errors.get("name")[0].message).to.eql("Validation isImmutable on name failed");
    });

    it("allows setting an immutable field if the record is unsaved", async function () {
        const User = this.sequelize.define("User", {
            name: {
                type: type.STRING,
                validate: {
                    isImmutable: true
                }
            }
        });

        const user = User.build({ name: "RedCat" });
        expect(user.getDataValue("name")).to.equal("RedCat");

        user.setDataValue("name", "YellowCat");
        await user.validate();
    });

    it("raises an error for array on a STRING", async function () {
        const User = this.sequelize.define("User", {
            email: {
                type: type.STRING
            }
        });

        const err = await assert.throws(async () => {
            await User.build({
                email: ["iama", "dummy.com"]
            }).validate();
        });

        expect(err).to.be.instanceof(orm.x.ValidationError);
    });

    it("raises an error for array on a STRING(20)", async function () {
        const User = this.sequelize.define("User", {
            email: {
                type: new type.STRING(20)
            }
        });

        await assert.throws(async () => {
            await User.build({
                email: ["iama", "dummy.com"]
            }).validate();
        }, orm.x.ValidationError);
    });

    it("raises an error for array on a TEXT", async function () {
        const User = this.sequelize.define("User", {
            email: {
                type: type.TEXT
            }
        });

        await assert.throws(async () => {
            await User.build({
                email: ["iama", "dummy.com"]
            }).validate();
        }, orm.x.ValidationError);
    });

    it("raises an error for {} on a STRING", async function () {
        const User = this.sequelize.define("User", {
            email: {
                type: type.STRING
            }
        });

        await assert.throws(async () => {
            await User.build({
                email: { lol: true }
            }).validate();
        }, orm.x.ValidationError);
    });

    it("raises an error for {} on a STRING(20)", async function () {
        const User = this.sequelize.define("User", {
            email: {
                type: new type.STRING(20)
            }
        });

        await assert.throws(async () => {
            await User.build({
                email: { lol: true }
            }).validate();
        }, orm.x.ValidationError);
    });

    it("raises an error for {} on a TEXT", async function () {
        const User = this.sequelize.define("User", {
            email: {
                type: type.TEXT
            }
        });

        await assert.throws(async () => {
            await User.build({
                email: { lol: true }
            }).validate();
        }, orm.x.ValidationError);
    });

    it("does not raise an error for null on a STRING (where null is allowed)", async function () {
        const User = this.sequelize.define("User", {
            email: {
                type: type.STRING
            }
        });

        await User.build({
            email: null
        }).validate();
    });

    it("validates VIRTUAL fields", async function () {
        const User = this.sequelize.define("user", {
            password_hash: type.STRING,
            salt: type.STRING,
            password: {
                type: type.VIRTUAL,
                set(val) {
                    this.setDataValue("password", val);
                    this.setDataValue("password_hash", this.salt + val);
                },
                validate: {
                    isLongEnough(val) {
                        if (val.length < 7) {
                            throw new Error("Please choose a longer password");
                        }
                    }
                }
            }
        });

        const errors = await assert.throws(async () => {
            await User.build({
                password: "short",
                salt: "42"
            }).validate();
        });

        expect(errors.get("password")[0].message).to.equal("Please choose a longer password");

        await User.build({
            password: "loooooooong",
            salt: "42"
        }).validate();
    });

    it("allows me to add custom validation functions to validator.js", async function () {
        this.sequelize.Validator.extend("isExactly7Characters", (val) => {
            return val.length === 7;
        });

        const User = this.sequelize.define("User", {
            name: {
                type: type.STRING,
                validate: {
                    isExactly7Characters: true
                }
            }
        });

        await User.build({
            name: "abcdefg"
        }).validate();

        const errors = await assert.throws(async () => {
            await User.build({
                name: "a"
            }).validate();
        });
        expect(errors.get("name")[0].message).to.equal("Validation isExactly7Characters on name failed");
    });
});
