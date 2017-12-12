import Support from "../../support";

const dialect = Support.getTestDialect();
const { orm } = adone;
const { type } = orm;

describe("[POSTGRES Specific] DAO", {
    skip: !/^postgres/.test(dialect)
}, () => {
    beforeEach(function () {
        this.sequelize.options.quoteIdentifiers = true;
        this.User = this.sequelize.define("User", {
            username: type.STRING,
            email: { type: new type.ARRAY(type.TEXT) },
            settings: type.HSTORE,
            document: { type: type.HSTORE, defaultValue: { default: "'value'" } },
            phones: new type.ARRAY(type.HSTORE),
            emergency_contact: type.JSON,
            emergencyContact: type.JSON,
            friends: {
                type: new type.ARRAY(type.JSON),
                defaultValue: []
            },
            magic_numbers: {
                type: new type.ARRAY(type.INTEGER),
                defaultValue: []
            },
            course_period: new type.RANGE(type.DATE),
            acceptable_marks: { type: new type.RANGE(type.DECIMAL), defaultValue: [0.65, 1] },
            available_amount: type.RANGE,
            holidays: new type.ARRAY(new type.RANGE(type.DATE)),
            location: new type.GEOMETRY()
        });
        return this.User.sync({ force: true });
    });

    afterEach(function () {
        this.sequelize.options.quoteIdentifiers = true;
    });

    it("should be able to search within an array", function () {
        return this.User.findAll({
            where: {
                email: ["hello", "world"]
            },
            attributes: ["id", "username", "email", "settings", "document", "phones", "emergency_contact", "friends"],
            logging(sql) {
                expect(sql).to.equal('Executing (default): SELECT "id", "username", "email", "settings", "document", "phones", "emergency_contact", "friends" FROM "Users" AS "User" WHERE "User"."email" = ARRAY[\'hello\',\'world\']::TEXT[];');
            }
        });
    });

    it("should be able to update a field with type ARRAY(JSON)", async function () {
        const userInstance = await this.User.create({
            username: "bob",
            email: ["myemail@email.com"],
            friends: [{
                name: "John Smith"
            }]
        });
        expect(userInstance.friends).to.have.length(1);
        expect(userInstance.friends[0].name).to.equal("John Smith");

        const { friends } = await userInstance.update({
            friends: [{
                name: "John Smythe"
            }]
        });

        expect(friends).to.have.length(1);
        expect(friends[0].name).to.equal("John Smythe");
    });

    it("should be able to find a record while searching in an array", function () {
        return this.User.bulkCreate([
            { username: "bob", email: ["myemail@email.com"] },
            { username: "tony", email: ["wrongemail@email.com"] }
        ]).then(() => {
            return this.User.findAll({ where: { email: ["myemail@email.com"] } }).then((user) => {
                expect(user).to.be.instanceof(Array);
                expect(user).to.have.length(1);
                expect(user[0].username).to.equal("bob");
            });
        });
    });

    describe("json", () => {
        it("should be able to retrieve a row with ->> operator", function () {
            return Promise.all([
                this.User.create({ username: "swen", emergency_contact: { name: "kate" } }),
                this.User.create({ username: "anna", emergency_contact: { name: "joe" } })])
                .then(() => {
                    return this.User.find({ where: orm.util.json("emergency_contact->>'name'", "kate"), attributes: ["username", "emergency_contact"] });
                })
                .then((user) => {
                    expect(user.emergency_contact.name).to.equal("kate");
                });
        });

        it("should be able to query using the nested query language", function () {
            return Promise.all([
                this.User.create({ username: "swen", emergency_contact: { name: "kate" } }),
                this.User.create({ username: "anna", emergency_contact: { name: "joe" } })])
                .then(() => {
                    return this.User.find({
                        where: orm.util.json({ emergency_contact: { name: "kate" } })
                    });
                })
                .then((user) => {
                    expect(user.emergency_contact.name).to.equal("kate");
                });
        });

        it("should be able to query using dot syntax", function () {
            return Promise.all([
                this.User.create({ username: "swen", emergency_contact: { name: "kate" } }),
                this.User.create({ username: "anna", emergency_contact: { name: "joe" } })])
                .then(() => {
                    return this.User.find({ where: orm.util.json("emergency_contact.name", "joe") });
                })
                .then((user) => {
                    expect(user.emergency_contact.name).to.equal("joe");
                });
        });

        it("should be able to query using dot syntax with uppercase name", function () {
            return Promise.all([
                this.User.create({ username: "swen", emergencyContact: { name: "kate" } }),
                this.User.create({ username: "anna", emergencyContact: { name: "joe" } })])
                .then(() => {
                    return this.User.find({
                        attributes: [[orm.util.json("emergencyContact.name"), "contactName"]],
                        where: orm.util.json("emergencyContact.name", "joe")
                    });
                })
                .then((user) => {
                    expect(user.get("contactName")).to.equal("joe");
                });
        });

        it("should be able to store values that require JSON escaping", function () {
            const text = "Multi-line '$string' needing \"escaping\" for $$ and $1 type values";

            return this.User.create({ username: "swen", emergency_contact: { value: text } })
                .then((user) => {
                    expect(user.isNewRecord).to.equal(false);
                })
                .then(() => {
                    return this.User.find({ where: { username: "swen" } });
                })
                .then(() => {
                    return this.User.find({ where: orm.util.json("emergency_contact.value", text) });
                })
                .then((user) => {
                    expect(user.username).to.equal("swen");
                });
        });

        it("should be able to findOrCreate with values that require JSON escaping", function () {
            const text = "Multi-line '$string' needing \"escaping\" for $$ and $1 type values";

            return this.User.findOrCreate({ where: { username: "swen" }, defaults: { emergency_contact: { value: text } } })
                .then((user) => {
                    expect(!user.isNewRecord).to.equal(true);
                })
                .then(() => {
                    return this.User.find({ where: { username: "swen" } });
                })
                .then(() => {
                    return this.User.find({ where: orm.util.json("emergency_contact.value", text) });
                })
                .then((user) => {
                    expect(user.username).to.equal("swen");
                });
        });
    });

    describe("hstore", () => {
        it("should tell me that a column is hstore and not USER-DEFINED", function () {
            return this.sequelize.queryInterface.describeTable("Users").then((table) => {
                expect(table.settings.type).to.equal("HSTORE");
                expect(table.document.type).to.equal("HSTORE");
            });
        });

        it("should stringify hstore with insert", function () {
            return this.User.create({
                username: "bob",
                email: ["myemail@email.com"],
                settings: { mailing: false, push: "facebook", frequency: 3 }
            }, {
                logging(sql) {
                    const expected = '\'"mailing"=>"false","push"=>"facebook","frequency"=>"3"\',\'"default"=>"\'\'value\'\'"\'';
                    expect(sql.indexOf(expected)).not.to.equal(-1);
                }
            });
        });

        it("should not rename hstore fields", function () {
            const Equipment = this.sequelize.define("Equipment", {
                grapplingHook: {
                    type: type.STRING,
                    field: "grappling_hook"
                },
                utilityBelt: {
                    type: type.HSTORE
                }
            });

            return Equipment.sync({ force: true }).then(() => {
                return Equipment.findAll({
                    where: {
                        utilityBelt: {
                            grapplingHook: true
                        }
                    },
                    logging(sql) {
                        expect(sql).to.equal('Executing (default): SELECT "id", "grappling_hook" AS "grapplingHook", "utilityBelt", "createdAt", "updatedAt" FROM "Equipment" AS "Equipment" WHERE "Equipment"."utilityBelt" = \'"grapplingHook"=>"true"\';');
                    }
                });
            });
        });

        it("should not rename json fields", function () {
            const Equipment = this.sequelize.define("Equipment", {
                grapplingHook: {
                    type: type.STRING,
                    field: "grappling_hook"
                },
                utilityBelt: {
                    type: type.JSON
                }
            });

            return Equipment.sync({ force: true }).then(() => {
                return Equipment.findAll({
                    where: {
                        utilityBelt: {
                            grapplingHook: true
                        }
                    },
                    logging(sql) {
                        expect(sql).to.equal('Executing (default): SELECT "id", "grappling_hook" AS "grapplingHook", "utilityBelt", "createdAt", "updatedAt" FROM "Equipment" AS "Equipment" WHERE CAST(("Equipment"."utilityBelt"#>>\'{grapplingHook}\') AS BOOLEAN) = true;');
                    }
                });
            });
        });

    });

    describe("range", () => {
        it("should tell me that a column is range and not USER-DEFINED", function () {
            return this.sequelize.queryInterface.describeTable("Users").then((table) => {
                expect(table.course_period.type).to.equal("TSTZRANGE");
                expect(table.available_amount.type).to.equal("INT4RANGE");
            });
        });

    });

    describe("enums", () => {
        it("should be able to ignore enum types that already exist", function () {
            const User = this.sequelize.define("UserEnums", {
                mood: new type.ENUM("happy", "sad", "meh")
            });

            return User.sync({ force: true }).then(() => {
                return User.sync();
            });
        });

        it("should be able to create/drop enums multiple times", function () {
            const User = this.sequelize.define("UserEnums", {
                mood: new type.ENUM("happy", "sad", "meh")
            });

            return User.sync({ force: true }).then(() => {
                return User.sync({ force: true });
            });
        });

        it("should be able to create/drop multiple enums multiple times", function () {
            const DummyModel = this.sequelize.define("Dummy-pg", {
                username: type.STRING,
                theEnumOne: {
                    type: type.ENUM,
                    values: [
                        "one",
                        "two",
                        "three"
                    ]
                },
                theEnumTwo: {
                    type: type.ENUM,
                    values: [
                        "four",
                        "five",
                        "six"
                    ]
                }
            });

            return DummyModel.sync({ force: true }).then(() => {
                // now sync one more time:
                return DummyModel.sync({ force: true }).then(() => {
                    // sync without dropping
                    return DummyModel.sync();
                });
            });
        });

        it("should be able to create/drop multiple enums multiple times with field name (#7812)", async function () {
            const DummyModel = this.sequelize.define("Dummy-pg", {
                username: type.STRING,
                theEnumOne: {
                    field: "oh_my_this_enum_one",
                    type: type.ENUM,
                    values: [
                        "one",
                        "two",
                        "three"
                    ]
                },
                theEnumTwo: {
                    field: "oh_my_this_enum_two",
                    type: type.ENUM,
                    values: [
                        "four",
                        "five",
                        "six"
                    ]
                }
            });

            await DummyModel.sync({ force: true });
            // now sync one more time:
            await DummyModel.sync({ force: true });
            // sync without dropping
            await DummyModel.sync();
        });

        it("should be able to add values to enum types", function () {
            let User = this.sequelize.define("UserEnums", {
                mood: new type.ENUM("happy", "sad", "meh")
            });

            return User.sync({ force: true }).then(() => {
                User = this.sequelize.define("UserEnums", {
                    mood: new type.ENUM("neutral", "happy", "sad", "ecstatic", "meh", "joyful")
                });

                return User.sync();
            }).then(() => {
                return this.sequelize.getQueryInterface().pgListEnums(User.getTableName());
            }).then((enums) => {
                expect(enums).to.have.length(1);
                expect(enums[0].enum_value).to.equal("{neutral,happy,sad,ecstatic,meh,joyful}");
            });
        });

        describe("ARRAY(ENUM)", () => {
            it("should be able to ignore enum types that already exist", async function () {
                const User = this.sequelize.define("UserEnums", {
                    permissions: new type.ARRAY(new type.ENUM([
                        "access",
                        "write",
                        "check",
                        "delete"
                    ]))
                });

                await User.sync({ force: true });
                await User.sync();
            });

            it("should be able to create/drop enums multiple times", async function () {
                const User = this.sequelize.define("UserEnums", {
                    permissions: new type.ARRAY(new type.ENUM([
                        "access",
                        "write",
                        "check",
                        "delete"
                    ]))
                });

                await User.sync({ force: true });
                await User.sync({ force: true });
            });

            it("should be able to add values to enum types", async function () {
                let User = this.sequelize.define("UserEnums", {
                    permissions: new type.ARRAY(new type.ENUM([
                        "access",
                        "write",
                        "check",
                        "delete"
                    ]))
                });

                await User.sync({ force: true });
                User = this.sequelize.define("UserEnums", {
                    permissions: new type.ARRAY(
                        new type.ENUM("view", "access", "edit", "write", "check", "delete")
                    )
                });

                await User.sync();
                const enums = await this.sequelize.getQueryInterface().pgListEnums(User.getTableName());
                expect(enums).to.have.length(1);
                expect(enums[0].enum_value).to.equal("{view,access,edit,write,check,delete}");
            });

            it("should be able to insert new record", async function () {
                const User = this.sequelize.define("UserEnums", {
                    name: type.STRING,
                    type: new type.ENUM("A", "B", "C"),
                    owners: new type.ARRAY(type.STRING),
                    permissions: new type.ARRAY(new type.ENUM([
                        "access",
                        "write",
                        "check",
                        "delete"
                    ]))
                });

                await User.sync({ force: true })
                const user = await User.create({
                    name: "file.exe",
                    type: "C",
                    owners: ["userA", "userB"],
                    permissions: ["access", "write"]
                });
                expect(user.name).to.equal("file.exe");
                expect(user.type).to.equal("C");
                expect(user.owners).to.deep.equal(["userA", "userB"]);
                expect(user.permissions).to.deep.equal(["access", "write"]);
            });

            it("should fail when trying to insert foreign element on ARRAY(ENUM)", async function () {
                const User = this.sequelize.define("UserEnums", {
                    name: type.STRING,
                    type: new type.ENUM("A", "B", "C"),
                    owners: new type.ARRAY(type.STRING),
                    permissions: new type.ARRAY(new type.ENUM([
                        "access",
                        "write",
                        "check",
                        "delete"
                    ]))
                });

                await User.sync({ force: true });

                await assert.throws(async () => {
                    await User.create({
                        name: "file.exe",
                        type: "C",
                        owners: ["userA", "userB"],
                        permissions: ["cosmic_ray_disk_access"]
                    });
                }, /invalid input value for enum "enum_UserEnums_permissions": "cosmic_ray_disk_access"/);
            });

            it("should be able to find records", async function () {
                const User = this.sequelize.define("UserEnums", {
                    name: type.STRING,
                    type: new type.ENUM("A", "B", "C"),
                    permissions: new type.ARRAY(new type.ENUM([
                        "access",
                        "write",
                        "check",
                        "delete"
                    ]))
                });

                await User.sync({ force: true });
                await User.bulkCreate([{
                    name: "file1.exe",
                    type: "C",
                    permissions: ["access", "write"]
                }, {
                    name: "file2.exe",
                    type: "A",
                    permissions: ["access", "check"]
                }, {
                    name: "file3.exe",
                    type: "B",
                    permissions: ["access", "write", "delete"]
                }]);
                const users = await User.findAll({
                    where: {
                        type: {
                            $in: ["A", "C"]
                        },
                        permissions: {
                            $contains: ["write"]
                        }
                    }
                });
                expect(users.length).to.equal(1);
                expect(users[0].name).to.equal("file1.exe");
                expect(users[0].type).to.equal("C");
                expect(users[0].permissions).to.deep.equal(["access", "write"]);
            });
        });
    });

    describe("integers", () => {
        describe("integer", () => {
            beforeEach(function () {
                this.User = this.sequelize.define("User", {
                    aNumber: type.INTEGER
                });

                return this.User.sync({ force: true });
            });

            it("positive", function () {
                const User = this.User;

                return User.create({ aNumber: 2147483647 }).then((user) => {
                    expect(user.aNumber).to.equal(2147483647);
                    return User.find({ where: { aNumber: 2147483647 } }).then((_user) => {
                        expect(_user.aNumber).to.equal(2147483647);
                    });
                });
            });

            it("negative", function () {
                const User = this.User;

                return User.create({ aNumber: -2147483647 }).then((user) => {
                    expect(user.aNumber).to.equal(-2147483647);
                    return User.find({ where: { aNumber: -2147483647 } }).then((_user) => {
                        expect(_user.aNumber).to.equal(-2147483647);
                    });
                });
            });
        });

        describe("bigint", () => {
            beforeEach(function () {
                this.User = this.sequelize.define("User", {
                    aNumber: type.BIGINT
                });

                return this.User.sync({ force: true });
            });

            it("positive", function () {
                const User = this.User;

                return User.create({ aNumber: "9223372036854775807" }).then((user) => {
                    expect(user.aNumber).to.equal("9223372036854775807");
                    return User.find({ where: { aNumber: "9223372036854775807" } }).then((_user) => {
                        expect(_user.aNumber).to.equal("9223372036854775807");
                    });
                });
            });

            it("negative", function () {
                const User = this.User;

                return User.create({ aNumber: "-9223372036854775807" }).then((user) => {
                    expect(user.aNumber).to.equal("-9223372036854775807");
                    return User.find({ where: { aNumber: "-9223372036854775807" } }).then((_user) => {
                        expect(_user.aNumber).to.equal("-9223372036854775807");
                    });
                });
            });
        });
    });

    describe("timestamps", () => {
        beforeEach(function () {
            this.User = this.sequelize.define("User", {
                dates: new type.ARRAY(type.DATE)
            });
            return this.User.sync({ force: true });
        });

        it('should use postgres "TIMESTAMP WITH TIME ZONE" instead of "DATETIME"', function () {
            return this.User.create({
                dates: []
            }, {
                logging(sql) {
                    expect(sql.indexOf("TIMESTAMP WITH TIME ZONE")).to.be.greaterThan(0);
                }
            });
        });
    });

    describe("model", () => {
        it("create handles array correctly", function () {
            return this.User
                .create({ username: "user", email: ["foo@bar.com", "bar@baz.com"] })
                .then((oldUser) => {
                    expect(oldUser.email).to.contain.members(["foo@bar.com", "bar@baz.com"]);
                });
        });

        it("should save hstore correctly", function () {
            return this.User.create({ username: "user", email: ["foo@bar.com"], settings: { created: '"value"' } }).then((newUser) => {
                // Check to see if the default value for an hstore field works
                expect(newUser.document).to.deep.equal({ default: "'value'" });
                expect(newUser.settings).to.deep.equal({ created: '"value"' });

                // Check to see if updating an hstore field works
                return newUser.updateAttributes({ settings: { should: "update", to: "this", first: "place" } }).then((oldUser) => {
                    // Postgres always returns keys in alphabetical order (ascending)
                    expect(oldUser.settings).to.deep.equal({ first: "place", should: "update", to: "this" });
                });
            });
        });

        it("should save hstore array correctly", function () {
            const User = this.User;

            return this.User.create({
                username: "bob",
                email: ["myemail@email.com"],
                phones: [{ number: "123456789", type: "mobile" }, { number: "987654321", type: "landline" }, { number: "8675309", type: "Jenny's" }, { number: "5555554321", type: '"home\n"' }]
            }).then(() => {
                return User.findById(1).then((user) => {
                    expect(user.phones.length).to.equal(4);
                    expect(user.phones[1].number).to.equal("987654321");
                    expect(user.phones[2].type).to.equal("Jenny's");
                    expect(user.phones[3].type).to.equal('"home\n"');
                });
            });
        });

        it("should bulkCreate with hstore property", function () {
            const User = this.User;

            return this.User.bulkCreate([{
                username: "bob",
                email: ["myemail@email.com"],
                settings: { mailing: true, push: "facebook", frequency: 3 }
            }]).then(() => {
                return User.findById(1).then((user) => {
                    expect(user.settings.mailing).to.equal("true");
                });
            });
        });

        it("should update hstore correctly", function () {
            return this.User.create({ username: "user", email: ["foo@bar.com"], settings: { test: '"value"' } }).then((newUser) => {
                // Check to see if the default value for an hstore field works
                expect(newUser.document).to.deep.equal({ default: "'value'" });
                expect(newUser.settings).to.deep.equal({ test: '"value"' });

                // Check to see if updating an hstore field works
                return this.User.update({ settings: { should: "update", to: "this", first: "place" } }, { where: newUser.where() }).then(() => {
                    return newUser.reload().then(() => {
                        // Postgres always returns keys in alphabetical order (ascending)
                        expect(newUser.settings).to.deep.equal({ first: "place", should: "update", to: "this" });
                    });
                });
            });
        });

        it("should update hstore correctly and return the affected rows", async function () {
            const oldUser = await this.User.create({ username: "user", email: ["foo@bar.com"], settings: { test: '"value"' } });
            // Update the user and check that the returned object's fields have been parsed by the hstore library
            const [count, users] = await this.User.update({
                settings: {
                    should: "update",
                    to: "this",
                    first: "place"
                }
            }, {
                where: oldUser.where(),
                returning: true
            });
            expect(count).to.equal(1);
            expect(users[0].settings).to.deep.equal({ should: "update", to: "this", first: "place" });
        });

        it("should read hstore correctly", function () {
            const data = { username: "user", email: ["foo@bar.com"], settings: { test: '"value"' } };

            return this.User.create(data)
                .then(() => {
                    return this.User.find({ where: { username: "user" } });
                })
                .then((user) => {
                    // Check that the hstore fields are the same when retrieving the user
                    expect(user.settings).to.deep.equal(data.settings);
                });
        });

        it("should read an hstore array correctly", function () {
            const data = { username: "user", email: ["foo@bar.com"], phones: [{ number: "123456789", type: "mobile" }, { number: "987654321", type: "landline" }] };

            return this.User.create(data)
                .then(() => {
                    // Check that the hstore fields are the same when retrieving the user
                    return this.User.find({ where: { username: "user" } });
                }).then((user) => {
                    expect(user.phones).to.deep.equal(data.phones);
                });
        });

        it("should read hstore correctly from multiple rows", function () {
            return this.User
                .create({ username: "user1", email: ["foo@bar.com"], settings: { test: '"value"' } })
                .then(() => {
                    return this.User.create({ username: "user2", email: ["foo2@bar.com"], settings: { another: '"example"' } });
                })
                .then(() => {
                    // Check that the hstore fields are the same when retrieving the user
                    return this.User.findAll({ order: ["username"] });
                })
                .then((users) => {
                    expect(users[0].settings).to.deep.equal({ test: '"value"' });
                    expect(users[1].settings).to.deep.equal({ another: '"example"' });
                });
        });

        it("should read hstore correctly from included models as well", function () {
            const HstoreSubmodel = this.sequelize.define("hstoreSubmodel", {
                someValue: type.HSTORE
            });
            const submodelValue = { testing: '"hstore"' };

            this.User.hasMany(HstoreSubmodel);

            return this.sequelize
                .sync({ force: true })
                .then(() => {
                    return this.User.create({ username: "user1" })
                        .then((user) => {
                            return HstoreSubmodel.create({ someValue: submodelValue })
                                .then((submodel) => {
                                    return user.setHstoreSubmodels([submodel]);
                                });
                        });
                })
                .then(() => {
                    return this.User.find({ where: { username: "user1" }, include: [HstoreSubmodel] });
                })
                .then((user) => {
                    expect(user.hasOwnProperty("hstoreSubmodels")).to.be.ok;
                    expect(user.hstoreSubmodels.length).to.equal(1);
                    expect(user.hstoreSubmodels[0].someValue).to.deep.equal(submodelValue);
                });
        });

        it("should save range correctly", function () {
            const period = [new Date(2015, 0, 1), new Date(2015, 11, 31)];
            return this.User.create({ username: "user", email: ["foo@bar.com"], course_period: period }).then((newUser) => {
                // Check to see if the default value for a range field works

                expect(newUser.acceptable_marks.length).to.equal(2);
                expect(newUser.acceptable_marks[0]).to.equal("0.65"); // lower bound
                expect(newUser.acceptable_marks[1]).to.equal("1"); // upper bound
                expect(newUser.acceptable_marks.inclusive).to.deep.equal([true, false]); // inclusive, exclusive
                expect(newUser.course_period[0] instanceof Date).to.be.ok; // lower bound
                expect(newUser.course_period[1] instanceof Date).to.be.ok; // upper bound
                expect(newUser.course_period[0]).to.be.deep.equal(period[0]); // lower bound
                expect(newUser.course_period[1]).to.be.deep.equal(period[1]); // upper bound
                expect(newUser.course_period.inclusive).to.deep.equal([true, false]); // inclusive, exclusive

                // Check to see if updating a range field works
                return newUser.updateAttributes({ acceptable_marks: [0.8, 0.9] }).then(() => {
                    expect(newUser.acceptable_marks.length).to.equal(2);
                    expect(newUser.acceptable_marks[0]).to.equal(0.8); // lower bound
                    expect(newUser.acceptable_marks[1]).to.equal(0.9); // upper bound
                });
            });
        });

        it("should save range array correctly", function () {
            const User = this.User;
            const holidays = [
                [new Date(2015, 3, 1), new Date(2015, 3, 15)],
                [new Date(2015, 8, 1), new Date(2015, 9, 15)]
            ];

            return User.create({
                username: "bob",
                email: ["myemail@email.com"],
                holidays
            }).then(() => {
                return User.findById(1).then((user) => {
                    expect(user.holidays.length).to.equal(2);
                    expect(user.holidays[0].length).to.equal(2);
                    expect(user.holidays[0][0] instanceof Date).to.be.ok;
                    expect(user.holidays[0][1] instanceof Date).to.be.ok;
                    expect(user.holidays[0][0]).to.be.deep.equal(holidays[0][0]);
                    expect(user.holidays[0][1]).to.be.deep.equal(holidays[0][1]);
                    expect(user.holidays[1].length).to.equal(2);
                    expect(user.holidays[1][0] instanceof Date).to.be.ok;
                    expect(user.holidays[1][1] instanceof Date).to.be.ok;
                    expect(user.holidays[1][0]).to.be.deep.equal(holidays[1][0]);
                    expect(user.holidays[1][1]).to.be.deep.equal(holidays[1][1]);
                });
            });
        });

        it("should bulkCreate with range property", function () {
            const User = this.User;
            const period = [new Date(2015, 0, 1), new Date(2015, 11, 31)];

            return User.bulkCreate([{
                username: "bob",
                email: ["myemail@email.com"],
                course_period: period
            }]).then(() => {
                return User.findById(1).then((user) => {
                    expect(user.course_period[0] instanceof Date).to.be.ok;
                    expect(user.course_period[1] instanceof Date).to.be.ok;
                    expect(user.course_period[0]).to.be.deep.equal(period[0]); // lower bound
                    expect(user.course_period[1]).to.be.deep.equal(period[1]); // upper bound
                    expect(user.course_period.inclusive).to.deep.equal([true, false]); // inclusive, exclusive
                });
            });
        });

        it("should update range correctly", function () {
            const User = this.User;
            const period = [new Date(2015, 0, 1), new Date(2015, 11, 31)];

            return User.create({ username: "user", email: ["foo@bar.com"], course_period: period }).then((newUser) => {
                // Check to see if the default value for a range field works
                expect(newUser.acceptable_marks.length).to.equal(2);
                expect(newUser.acceptable_marks[0]).to.equal("0.65"); // lower bound
                expect(newUser.acceptable_marks[1]).to.equal("1"); // upper bound
                expect(newUser.acceptable_marks.inclusive).to.deep.equal([true, false]); // inclusive, exclusive
                expect(newUser.course_period[0] instanceof Date).to.be.ok;
                expect(newUser.course_period[1] instanceof Date).to.be.ok;
                expect(newUser.course_period[0]).to.deep.equal(period[0]); // lower bound
                expect(newUser.course_period[1]).to.deep.equal(period[1]); // upper bound
                expect(newUser.course_period.inclusive).to.deep.equal([true, false]); // inclusive, exclusive

                const period2 = [new Date(2015, 1, 1), new Date(2015, 10, 30)];

                // Check to see if updating a range field works
                return User.update({ course_period: period2 }, { where: newUser.where() }).then(() => {
                    return newUser.reload().then(() => {
                        expect(newUser.course_period[0] instanceof Date).to.be.ok;
                        expect(newUser.course_period[1] instanceof Date).to.be.ok;
                        expect(newUser.course_period[0]).to.deep.equal(period2[0]); // lower bound
                        expect(newUser.course_period[1]).to.deep.equal(period2[1]); // upper bound
                        expect(newUser.course_period.inclusive).to.deep.equal([true, false]); // inclusive, exclusive
                    });
                });
            });
        });

        it("should update range correctly and return the affected rows", async function () {
            const User = this.User;
            const period = [new Date(2015, 1, 1), new Date(2015, 10, 30)];

            const oldUser = await User.create({
                username: "user",
                email: ["foo@bar.com"],
                course_period: [new Date(2015, 0, 1), new Date(2015, 11, 31)]
            });
            // Update the user and check that the returned object's fields have been parsed by the range parser
            const [count, users] = await User.update({ course_period: period }, { where: oldUser.where(), returning: true });
            expect(count).to.equal(1);
            expect(users[0].course_period[0] instanceof Date).to.be.ok;
            expect(users[0].course_period[1] instanceof Date).to.be.ok;
            expect(users[0].course_period[0]).to.be.deep.equal(period[0]); // lower bound
            expect(users[0].course_period[1]).to.be.deep.equal(period[1]); // upper bound
            expect(users[0].course_period.inclusive).to.deep.equal([true, false]); // inclusive, exclusive
        });

        it("should read range correctly", function () {
            const User = this.User;

            const course_period = [new Date(2015, 1, 1), new Date(2015, 10, 30)];
            course_period.inclusive = [false, false];

            const data = { username: "user", email: ["foo@bar.com"], course_period };

            return User.create(data)
                .then(() => {
                    return User.find({ where: { username: "user" } });
                })
                .then((user) => {
                    // Check that the range fields are the same when retrieving the user
                    expect(user.course_period).to.deep.equal(data.course_period);
                });
        });

        it("should read range array correctly", function () {
            const User = this.User;
            const holidays = [
                [new Date(2015, 3, 1, 10), new Date(2015, 3, 15)],
                [new Date(2015, 8, 1), new Date(2015, 9, 15)]
            ];

            holidays[0].inclusive = [true, true];
            holidays[1].inclusive = [true, true];

            const data = { username: "user", email: ["foo@bar.com"], holidays };

            return User.create(data)
                .then(() => {
                    // Check that the range fields are the same when retrieving the user
                    return User.find({ where: { username: "user" } });
                }).then((user) => {
                    expect(user.holidays).to.deep.equal(data.holidays);
                });
        });

        it("should read range correctly from multiple rows", function () {
            const User = this.User;
            const periods = [
                [new Date(2015, 0, 1), new Date(2015, 11, 31)],
                [new Date(2016, 0, 1), new Date(2016, 11, 31)]
            ];

            return User
                .create({ username: "user1", email: ["foo@bar.com"], course_period: periods[0] })
                .then(() => {
                    return User.create({ username: "user2", email: ["foo2@bar.com"], course_period: periods[1] });
                })
                .then(() => {
                    // Check that the range fields are the same when retrieving the user
                    return User.findAll({ order: ["username"] });
                })
                .then((users) => {
                    expect(users[0].course_period[0]).to.be.deep.equal(periods[0][0]); // lower bound
                    expect(users[0].course_period[1]).to.be.deep.equal(periods[0][1]); // upper bound
                    expect(users[0].course_period.inclusive).to.deep.equal([true, false]); // inclusive, exclusive
                    expect(users[1].course_period[0]).to.be.deep.equal(periods[1][0]); // lower bound
                    expect(users[1].course_period[1]).to.be.deep.equal(periods[1][1]); // upper bound
                    expect(users[1].course_period.inclusive).to.deep.equal([true, false]); // inclusive, exclusive
                });
        });

        it("should read range correctly from included models as well", function () {
            const period = [new Date(2016, 0, 1), new Date(2016, 11, 31)];
            const HolidayDate = this.sequelize.define("holidayDate", {
                period: new type.RANGE(type.DATE)
            });

            this.User.hasMany(HolidayDate);

            return this.sequelize
                .sync({ force: true })
                .then(() => {
                    return this.User
                        .create({ username: "user", email: ["foo@bar.com"] })
                        .then((user) => {
                            return HolidayDate.create({ period })
                                .then((holidayDate) => {
                                    return user.setHolidayDates([holidayDate]);
                                });
                        });
                })
                .then(() => {
                    return this.User.find({ where: { username: "user" }, include: [HolidayDate] });
                })
                .then((user) => {
                    expect(user.hasOwnProperty("holidayDates")).to.be.ok;
                    expect(user.holidayDates.length).to.equal(1);
                    expect(user.holidayDates[0].period.length).to.equal(2);
                    expect(user.holidayDates[0].period[0]).to.be.deep.equal(period[0]);
                    expect(user.holidayDates[0].period[1]).to.be.deep.equal(period[1]);
                });
        });
    });

    it("should save geometry correctly", function () {
        const point = { type: "Point", coordinates: [39.807222, -76.984722] };
        return this.User.create({ username: "user", email: ["foo@bar.com"], location: point }).then((newUser) => {
            expect(newUser.location).to.deep.eql(point);
        });
    });

    it("should update geometry correctly", async function () {
        const User = this.User;
        const point1 = { type: "Point", coordinates: [39.807222, -76.984722] };
        const point2 = { type: "Point", coordinates: [39.828333, -77.232222] };
        const oldUser = await User.create({ username: "user", email: ["foo@bar.com"], location: point1 });
        const [, updatedUsers] = await User.update({ location: point2 }, { where: { username: oldUser.username }, returning: true });
        expect(updatedUsers[0].location).to.deep.eql(point2);
    });

    it("should read geometry correctly", function () {
        const User = this.User;
        const point = { type: "Point", coordinates: [39.807222, -76.984722] };

        return User.create({ username: "user", email: ["foo@bar.com"], location: point }).then((user) => {
            return User.find({ where: { username: user.username } });
        }).then((user) => {
            expect(user.location).to.deep.eql(point);
        });
    });

    describe("[POSTGRES] Unquoted identifiers", () => {
        it("can insert and select", function () {
            this.sequelize.options.quoteIdentifiers = false;
            this.sequelize.getQueryInterface().QueryGenerator.options.quoteIdentifiers = false;

            this.User = this.sequelize.define("Userxs", {
                username: type.STRING,
                fullName: type.STRING // Note mixed case
            }, {
                quoteIdentifiers: false
            });

            return this.User.sync({ force: true }).then(() => {
                return this.User
                    .create({ username: "user", fullName: "John Smith" })
                    .then((user) => {
                        // We can insert into a table with non-quoted identifiers
                        expect(user.id).to.exist;
                        expect(user.id).not.to.be.null;
                        expect(user.username).to.equal("user");
                        expect(user.fullName).to.equal("John Smith");

                        // We can query by non-quoted identifiers
                        return this.User.find({
                            where: { fullName: "John Smith" }
                        }).then((user2) => {
                            // We can map values back to non-quoted identifiers
                            expect(user2.id).to.equal(user.id);
                            expect(user2.username).to.equal("user");
                            expect(user2.fullName).to.equal("John Smith");

                            // We can query and aggregate by non-quoted identifiers
                            return this.User
                                .count({
                                    where: { fullName: "John Smith" }
                                })
                                .then((count) => {
                                    this.sequelize.options.quoteIndentifiers = true;
                                    this.sequelize.getQueryInterface().QueryGenerator.options.quoteIdentifiers = true;
                                    this.sequelize.options.logging = false;
                                    expect(count).to.equal(1);
                                });
                        });
                    });
            });
        });

        it("can select nested include", {
            before() {
                this.sequelize.options.quoteIdentifiers = false;
            },
            after() {
                this.sequelize.options.quoteIdentifiers = true;
            }
        }, async function () {
            this.Professor = this.sequelize.define("Professor", {
                fullName: type.STRING
            }, {
                quoteIdentifiers: false
            });
            this.Class = this.sequelize.define("Class", {
                name: type.STRING
            }, {
                quoteIdentifiers: false
            });
            this.Student = this.sequelize.define("Student", {
                fullName: type.STRING
            }, {
                quoteIdentifiers: false
            });
            this.ClassStudent = this.sequelize.define("ClassStudent", {
            }, {
                quoteIdentifiers: false,
                tableName: "class_student"
            });
            this.Professor.hasMany(this.Class);
            this.Class.belongsTo(this.Professor);
            this.Class.belongsToMany(this.Student, { through: this.ClassStudent });
            this.Student.belongsToMany(this.Class, { through: this.ClassStudent });
            await this.Professor.sync({ force: true });
            await this.Student.sync({ force: true });
            await this.Class.sync({ force: true });
            await this.ClassStudent.sync({ force: true });
            await this.Professor.bulkCreate([
                {
                    id: 1,
                    fullName: "Albus Dumbledore"
                },
                {
                    id: 2,
                    fullName: "Severus Snape"
                }
            ]);
            await this.Class.bulkCreate([
                {
                    id: 1,
                    name: "Transfiguration",
                    ProfessorId: 1
                },
                {
                    id: 2,
                    name: "Potions",
                    ProfessorId: 2
                },
                {
                    id: 3,
                    name: "Defence Against the Dark Arts",
                    ProfessorId: 2
                }
            ]);
            await this.Student.bulkCreate([
                {
                    id: 1,
                    fullName: "Harry Potter"
                },
                {
                    id: 2,
                    fullName: "Ron Weasley"
                },
                {
                    id: 3,
                    fullName: "Ginny Weasley"
                },
                {
                    id: 4,
                    fullName: "Hermione Granger"
                }
            ]);
            await Promise.all([
                this.Student.findById(1)
                    .then((Harry) => {
                        return Harry.setClasses([1, 2, 3]);
                    }),
                this.Student.findById(2)
                    .then((Ron) => {
                        return Ron.setClasses([1, 2]);
                    }),
                this.Student.findById(3)
                    .then((Ginny) => {
                        return Ginny.setClasses([2, 3]);
                    }),
                this.Student.findById(4)
                    .then((Hermione) => {
                        return Hermione.setClasses([1, 2, 3]);
                    })
            ]);
            const professors = await this.Professor.findAll({
                include: [
                    {
                        model: this.Class,
                        include: [
                            {
                                model: this.Student
                            }
                        ]
                    }
                ],
                order: [
                    ["id"],
                    [this.Class, "id"],
                    [this.Class, this.Student, "id"]
                ]
            });
            expect(professors.length).to.eql(2);
            expect(professors[0].fullName).to.eql("Albus Dumbledore");
            expect(professors[0].Classes.length).to.eql(1);
            expect(professors[0].Classes[0].Students.length).to.eql(3);
        });
    });
});