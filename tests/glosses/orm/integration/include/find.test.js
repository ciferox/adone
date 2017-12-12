import Support from "../support";

const { orm } = adone;
const { type } = orm;

describe(Support.getTestDialectTeaser("Include"), () => {
    describe("find", () => {
        it("should include a non required model, with conditions and two includes N:M 1:M", function () {
            const A = this.sequelize.define("A", { name: new type.STRING(40) }, { paranoid: true });
            const B = this.sequelize.define("B", { name: new type.STRING(40) }, { paranoid: true });
            const C = this.sequelize.define("C", { name: new type.STRING(40) }, { paranoid: true });
            const D = this.sequelize.define("D", { name: new type.STRING(40) }, { paranoid: true });

            // Associations
            A.hasMany(B);

            B.belongsTo(D);
            B.belongsToMany(C, {
                through: "BC"
            });

            C.belongsToMany(B, {
                through: "BC"
            });

            D.hasMany(B);

            return this.sequelize.sync({ force: true }).then(() => {
                return A.find({
                    include: [
                        {
                            model: B, required: false, include: [
                                { model: C, required: false },
                                { model: D }
                            ]
                        }
                    ]
                });
            });
        });

        it("should work with a 1:M to M:1 relation with a where on the last include", async function () {
            const Model = this.sequelize.define("Model", {});
            const Model2 = this.sequelize.define("Model2", {});
            const Model4 = this.sequelize.define("Model4", { something: { type: type.INTEGER } });

            Model.belongsTo(Model2);
            Model2.hasMany(Model);

            Model2.hasMany(Model4);
            Model4.belongsTo(Model2);

            await this.sequelize.sync({ force: true });
            await Model.find({
                include: [
                    {
                        model: Model2, include: [
                            { model: Model4, where: { something: 2 } }
                        ]
                    }
                ]
            });
        });

        it("should include a model with a where condition but no required", function () {
            const User = this.sequelize.define("User", {}, { paranoid: false }),
                Task = this.sequelize.define("Task", {
                    deletedAt: {
                        type: type.DATE
                    }
                }, { paranoid: false });

            User.hasMany(Task, { foreignKey: "userId" });
            Task.belongsTo(User, { foreignKey: "userId" });

            return this.sequelize.sync({
                force: true
            }).then(() => {
                return User.create();
            }).then((user) => {
                return Task.bulkCreate([
                    { userId: user.get("id"), deletedAt: new Date() },
                    { userId: user.get("id"), deletedAt: new Date() },
                    { userId: user.get("id"), deletedAt: new Date() }
                ]);
            }).then(() => {
                return User.find({
                    include: [
                        { model: Task, where: { deletedAt: null }, required: false }
                    ]
                });
            }).then((user) => {
                expect(user).to.be.ok;
                expect(user.Tasks.length).to.equal(0);
            });
        });

        it("should include a model with a where clause when the PK field name and attribute name are different", function () {
            const User = this.sequelize.define("User", {
                id: {
                    type: type.UUID,
                    defaultValue: type.UUIDV4,
                    field: "main_id",
                    primaryKey: true
                }
            }),
                Task = this.sequelize.define("Task", {
                    searchString: { type: type.STRING }
                });

            User.hasMany(Task, { foreignKey: "userId" });
            Task.belongsTo(User, { foreignKey: "userId" });

            return this.sequelize.sync({
                force: true
            }).then(() => {
                return User.create();
            }).then((user) => {
                return Task.bulkCreate([
                    { userId: user.get("id"), searchString: "one" },
                    { userId: user.get("id"), searchString: "two" }
                ]);
            }).then(() => {
                return User.find({
                    include: [
                        { model: Task, where: { searchString: "one" } }
                    ]
                });
            }).then((user) => {
                expect(user).to.be.ok;
                expect(user.Tasks.length).to.equal(1);
            });
        });

        it("should include a model with a through.where and required true clause when the PK field name and attribute name are different", async function () {
            const A = this.sequelize.define("a", {});
            const B = this.sequelize.define("b", {});
            const AB = this.sequelize.define("a_b", {
                name: {
                    type: new type.STRING(40),
                    field: "name_id",
                    primaryKey: true
                }
            });

            A.belongsToMany(B, { through: AB });
            B.belongsToMany(A, { through: AB });

            await this.sequelize.sync({ force: true });
            const [a, b] = await Promise.all([
                A.create({}),
                B.create({})
            ]);
            await a.addB(b, { through: { name: "Foobar" } });
            {
                const a = await A.find({
                    include: [
                        { model: B, through: { where: { name: "Foobar" } }, required: true }
                    ]
                });
                expect(a).to.not.equal(null);
                expect(a.get("bs")).to.have.length(1);
            }
        });


        it("should still pull the main record when an included model is not required and has where restrictions without matches", function () {
            const A = this.sequelize.define("a", {
                name: new type.STRING(40)
            });
            const B = this.sequelize.define("b", {
                name: new type.STRING(40)
            });

            A.belongsToMany(B, { through: "a_b" });
            B.belongsToMany(A, { through: "a_b" });

            return this.sequelize
                .sync({ force: true })
                .then(() => {
                    return A.create({
                        name: "Foobar"
                    });
                })
                .then(() => {
                    return A.find({
                        where: { name: "Foobar" },
                        include: [
                            { model: B, where: { name: "idontexist" }, required: false }
                        ]
                    });
                })
                .then((a) => {
                    expect(a).to.not.equal(null);
                    expect(a.get("bs")).to.deep.equal([]);
                });
        });

        it("should support a nested include (with a where)", function () {
            const A = this.sequelize.define("A", {
                name: type.STRING
            });

            const B = this.sequelize.define("B", {
                flag: type.BOOLEAN
            });

            const C = this.sequelize.define("C", {
                name: type.STRING
            });

            A.hasOne(B);
            B.belongsTo(A);

            B.hasMany(C);
            C.belongsTo(B);

            return this.sequelize
                .sync({ force: true })
                .then(() => {
                    return A.find({
                        include: [
                            {
                                model: B,
                                where: { flag: true },
                                include: [
                                    {
                                        model: C
                                    }
                                ]
                            }
                        ]
                    });
                })
                .then((a) => {
                    expect(a).to.not.exist;
                });
        });

        it("should support a belongsTo with the targetKey option", function () {
            const User = this.sequelize.define("User", { username: type.STRING }),
                Task = this.sequelize.define("Task", { title: type.STRING });
            User.removeAttribute("id");
            Task.belongsTo(User, { foreignKey: "user_name", targetKey: "username" });

            return this.sequelize.sync({ force: true }).then(() => {
                return User.create({ username: "bob" }).then((newUser) => {
                    return Task.create({ title: "some task" }).then((newTask) => {
                        return newTask.setUser(newUser).then(() => {
                            return Task.find({
                                where: { title: "some task" },
                                include: [{ model: User }]
                            })
                                .then((foundTask) => {
                                    expect(foundTask).to.be.ok;
                                    expect(foundTask.User.username).to.equal("bob");
                                });
                        });
                    });
                });
            });
        });

        it("should support many levels of belongsTo (with a lower level having a where)", async function () {
            const A = this.sequelize.define("a", {});
            const B = this.sequelize.define("b", {});
            const C = this.sequelize.define("c", {});
            const D = this.sequelize.define("d", {});
            const E = this.sequelize.define("e", {});
            const F = this.sequelize.define("f", {});
            const G = this.sequelize.define("g", {
                name: type.STRING
            });
            const H = this.sequelize.define("h", {
                name: type.STRING
            });

            A.belongsTo(B);
            B.belongsTo(C);
            C.belongsTo(D);
            D.belongsTo(E);
            E.belongsTo(F);
            F.belongsTo(G);
            G.belongsTo(H);

            await this.sequelize.sync({ force: true });
            const [a, b] = await Promise.all([
                A.create({}),
                (function (singles) {
                    let promise = Promise.resolve();
                    let previousInstance;
                    let b;

                    singles.forEach((model) => {
                        const values = {};

                        if (model.name === "g") {
                            values.name = "yolo";
                        }

                        promise = promise.then(() => {
                            return model.create(values).then((instance) => {
                                if (previousInstance) {
                                    return previousInstance[`set${orm.util.uppercaseFirst(model.name)}`](instance).then(() => {
                                        previousInstance = instance;
                                    });
                                }
                                previousInstance = b = instance;

                            });
                        });
                    });

                    promise = promise.then(() => {
                        return b;
                    });

                    return promise;
                })([B, C, D, E, F, G, H])
            ]);
            await a.setB(b);
            {
                const a = await A.find({
                    include: [
                        {
                            model: B, include: [
                                {
                                    model: C, include: [
                                        {
                                            model: D, include: [
                                                {
                                                    model: E, include: [
                                                        {
                                                            model: F, include: [
                                                                {
                                                                    model: G, where: {
                                                                        name: "yolo"
                                                                    }, include: [
                                                                        { model: H }
                                                                    ]
                                                                }
                                                            ]
                                                        }
                                                    ]
                                                }
                                            ]
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                });
                expect(a.b.c.d.e.f.g.h).to.be.ok;
            }
        });

        it("should work with combinding a where and a scope", function () {
            const User = this.sequelize.define("User", {
                id: { type: type.INTEGER, primaryKey: true, autoIncrement: true },
                name: type.STRING
            }, { underscored: true });

            const Post = this.sequelize.define("Post", {
                id: { type: type.INTEGER, primaryKey: true, autoIncrement: true, unique: true },
                owner_id: { type: type.INTEGER, unique: "combiIndex" },
                owner_type: { type: type.ENUM, values: ["user", "org"], defaultValue: "user", unique: "combiIndex" },
                private: { type: type.BOOLEAN, defaultValue: false }
            }, { underscored: true });

            User.hasMany(Post, { foreignKey: "owner_id", scope: { owner_type: "user" }, as: "UserPosts", constraints: false });
            Post.belongsTo(User, { foreignKey: "owner_id", as: "Owner", constraints: false });

            return this.sequelize.sync({ force: true }).then(() => {
                return User.find({
                    where: { id: 2 },
                    include: [
                        { model: Post, as: "UserPosts", where: { private: true } }
                    ]
                });
            });
        });
    });
});