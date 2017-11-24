import Support from "../support";

const { vendor: { lodash: _ } } = adone;
const Sequelize = adone.orm;
const { DataTypes } = Sequelize;
const current = Support.sequelize;
const dialect = Support.getTestDialect();

describe(Support.getTestDialectTeaser("HasMany"), () => {
    describe("Model.associations", () => {
        it("should store all assocations when associting to the same table multiple times", function () {
            const User = this.sequelize.define("User", {});
            const Group = this.sequelize.define("Group", {});

            Group.hasMany(User);
            Group.hasMany(User, { foreignKey: "primaryGroupId", as: "primaryUsers" });
            Group.hasMany(User, { foreignKey: "secondaryGroupId", as: "secondaryUsers" });

            expect(Object.keys(Group.associations)).to.deep.equal(["Users", "primaryUsers", "secondaryUsers"]);
        });
    });

    describe("get", () => {
        if (current.dialect.supports.groupedLimit) {
            describe("multiple", () => {
                it("should fetch associations for multiple instances", function () {
                    const User = this.sequelize.define("User", {});
                    const Task = this.sequelize.define("Task", {});

                    User.Tasks = User.hasMany(Task, { as: "tasks" });

                    return this.sequelize.sync({ force: true }).then(() => {
                        return Promise.all([
                            User.create({
                                id: 1,
                                tasks: [
                                    {},
                                    {},
                                    {}
                                ]
                            }, {
                                include: [User.Tasks]
                            }),
                            User.create({
                                id: 2,
                                tasks: [
                                    {}
                                ]
                            }, {
                                include: [User.Tasks]
                            }),
                            User.create({
                                id: 3
                            })
                        ]);
                    }).then((users) => {
                        return User.Tasks.get(users).then((result) => {
                            expect(result[users[0].id].length).to.equal(3);
                            expect(result[users[1].id].length).to.equal(1);
                            expect(result[users[2].id].length).to.equal(0);
                        });
                    });
                });

                it("should fetch associations for multiple instances with limit and order", function () {
                    const User = this.sequelize.define("User", {});
                    const Task = this.sequelize.define("Task", {
                        title: DataTypes.STRING
                    });

                    User.Tasks = User.hasMany(Task, { as: "tasks" });

                    return this.sequelize.sync({ force: true }).then(() => {
                        return Promise.all([
                            User.create({
                                tasks: [
                                    { title: "b" },
                                    { title: "d" },
                                    { title: "c" },
                                    { title: "a" }
                                ]
                            }, {
                                include: [User.Tasks]
                            }),
                            User.create({
                                tasks: [
                                    { title: "a" },
                                    { title: "c" },
                                    { title: "b" }
                                ]
                            }, {
                                include: [User.Tasks]
                            })
                        ]);
                    }).then((users) => {
                        return User.Tasks.get(users, {
                            limit: 2,
                            order: [
                                ["title", "ASC"]
                            ]
                        }).then((result) => {
                            expect(result[users[0].id].length).to.equal(2);
                            expect(result[users[0].id][0].title).to.equal("a");
                            expect(result[users[0].id][1].title).to.equal("b");

                            expect(result[users[1].id].length).to.equal(2);
                            expect(result[users[1].id][0].title).to.equal("a");
                            expect(result[users[1].id][1].title).to.equal("b");
                        });
                    });
                });

                it("should fetch multiple layers of associations with limit and order with separate=true", function () {
                    const User = this.sequelize.define("User", {});
                    const Task = this.sequelize.define("Task", {
                        title: DataTypes.STRING
                    });
                    const SubTask = this.sequelize.define("SubTask", {
                        title: DataTypes.STRING
                    });

                    User.Tasks = User.hasMany(Task, { as: "tasks" });
                    Task.SubTasks = Task.hasMany(SubTask, { as: "subtasks" });

                    return this.sequelize.sync({ force: true }).then(() => {
                        return Promise.all([
                            User.create({
                                id: 1,
                                tasks: [
                                    {
                                        title: "b", subtasks: [
                                            { title: "c" },
                                            { title: "a" }
                                        ]
                                    },
                                    { title: "d" },
                                    {
                                        title: "c", subtasks: [
                                            { title: "b" },
                                            { title: "a" },
                                            { title: "c" }
                                        ]
                                    },
                                    {
                                        title: "a", subtasks: [
                                            { title: "c" },
                                            { title: "a" },
                                            { title: "b" }
                                        ]
                                    }
                                ]
                            }, {
                                include: [{ association: User.Tasks, include: [Task.SubTasks] }]
                            }),
                            User.create({
                                id: 2,
                                tasks: [
                                    {
                                        title: "a", subtasks: [
                                            { title: "b" },
                                            { title: "a" },
                                            { title: "c" }
                                        ]
                                    },
                                    {
                                        title: "c", subtasks: [
                                            { title: "a" }
                                        ]
                                    },
                                    {
                                        title: "b", subtasks: [
                                            { title: "a" },
                                            { title: "b" }
                                        ]
                                    }
                                ]
                            }, {
                                include: [{ association: User.Tasks, include: [Task.SubTasks] }]
                            })
                        ]);
                    }).then(() => {
                        return User.findAll({
                            include: [{
                                association: User.Tasks,
                                limit: 2,
                                order: [["title", "ASC"]],
                                separate: true,
                                as: "tasks",
                                include: [
                                    {
                                        association: Task.SubTasks,
                                        order: [["title", "DESC"]],
                                        separate: true,
                                        as: "subtasks"
                                    }
                                ]
                            }],
                            order: [
                                ["id", "ASC"]
                            ]
                        }).then((users) => {
                            expect(users[0].tasks.length).to.equal(2);

                            expect(users[0].tasks[0].title).to.equal("a");
                            expect(users[0].tasks[0].subtasks.length).to.equal(3);
                            expect(users[0].tasks[0].subtasks[0].title).to.equal("c");
                            expect(users[0].tasks[0].subtasks[1].title).to.equal("b");
                            expect(users[0].tasks[0].subtasks[2].title).to.equal("a");

                            expect(users[0].tasks[1].title).to.equal("b");
                            expect(users[0].tasks[1].subtasks.length).to.equal(2);
                            expect(users[0].tasks[1].subtasks[0].title).to.equal("c");
                            expect(users[0].tasks[1].subtasks[1].title).to.equal("a");

                            expect(users[1].tasks.length).to.equal(2);
                            expect(users[1].tasks[0].title).to.equal("a");
                            expect(users[1].tasks[0].subtasks.length).to.equal(3);
                            expect(users[1].tasks[0].subtasks[0].title).to.equal("c");
                            expect(users[1].tasks[0].subtasks[1].title).to.equal("b");
                            expect(users[1].tasks[0].subtasks[2].title).to.equal("a");

                            expect(users[1].tasks[1].title).to.equal("b");
                            expect(users[1].tasks[1].subtasks.length).to.equal(2);
                            expect(users[1].tasks[1].subtasks[0].title).to.equal("b");
                            expect(users[1].tasks[1].subtasks[1].title).to.equal("a");
                        });
                    });
                });

                it("should fetch associations for multiple instances with limit and order and a belongsTo relation", function () {
                    const User = this.sequelize.define("User", {});
                    const Task = this.sequelize.define("Task", {
                        title: DataTypes.STRING,
                        categoryId: {
                            type: DataTypes.INTEGER,
                            field: "category_id"
                        }
                    });
                    const Category = this.sequelize.define("Category", {});

                    User.Tasks = User.hasMany(Task, { as: "tasks" });
                    Task.Category = Task.belongsTo(Category, { as: "category", foreignKey: "categoryId" });

                    return this.sequelize.sync({ force: true }).then(() => {
                        return Promise.all([
                            User.create({
                                tasks: [
                                    { title: "b", category: {} },
                                    { title: "d", category: {} },
                                    { title: "c", category: {} },
                                    { title: "a", category: {} }
                                ]
                            }, {
                                include: [{ association: User.Tasks, include: [Task.Category] }]
                            }),
                            User.create({
                                tasks: [
                                    { title: "a", category: {} },
                                    { title: "c", category: {} },
                                    { title: "b", category: {} }
                                ]
                            }, {
                                include: [{ association: User.Tasks, include: [Task.Category] }]
                            })
                        ]);
                    }).then((users) => {
                        return User.Tasks.get(users, {
                            limit: 2,
                            order: [
                                ["title", "ASC"]
                            ],
                            include: [Task.Category]
                        }).then((result) => {
                            expect(result[users[0].id].length).to.equal(2);
                            expect(result[users[0].id][0].title).to.equal("a");
                            expect(result[users[0].id][0].category).to.be.ok;
                            expect(result[users[0].id][1].title).to.equal("b");
                            expect(result[users[0].id][1].category).to.be.ok;

                            expect(result[users[1].id].length).to.equal(2);
                            expect(result[users[1].id][0].title).to.equal("a");
                            expect(result[users[1].id][0].category).to.be.ok;
                            expect(result[users[1].id][1].title).to.equal("b");
                            expect(result[users[1].id][1].category).to.be.ok;
                        });
                    });
                });
            });
        }
    });

    describe("(1:N)", () => {

        describe("hasSingle", () => {
            beforeEach(function () {
                this.Article = this.sequelize.define("Article", { title: DataTypes.STRING });
                this.Label = this.sequelize.define("Label", { text: DataTypes.STRING });

                this.Article.hasMany(this.Label);

                return this.sequelize.sync({ force: true });
            });

            it("should only generate one set of foreignKeys", function () {
                this.Article = this.sequelize.define("Article", { title: DataTypes.STRING }, { timestamps: false });
                this.Label = this.sequelize.define("Label", { text: DataTypes.STRING }, { timestamps: false });

                this.Label.belongsTo(this.Article);
                this.Article.hasMany(this.Label);

                expect(Object.keys(this.Label.rawAttributes)).to.deep.equal(["id", "text", "ArticleId"]);
                expect(Object.keys(this.Label.rawAttributes).length).to.equal(3);
            });

            if (current.dialect.supports.transactions) {
                it("supports transactions", async function () {
                    const sequelize = await Support.prepareTransactionTest(this.sequelize);
                    const Article = sequelize.define("Article", { title: DataTypes.STRING });
                    const Label = sequelize.define("Label", { text: DataTypes.STRING });

                    Article.hasMany(Label);

                    await sequelize.sync({ force: true });
                    const [article, label] = await Promise.all([
                        Article.create({ title: "foo" }),
                        Label.create({ text: "bar" })
                    ]);
                    const t = await sequelize.transaction();
                    await article.setLabels([label], { transaction: t });
                    {
                        const articles = await Article.all({ transaction: t });
                        expect(await articles[0].hasLabel(label)).that.be.false;
                    }
                    {
                        const articles = await Article.all({ transaction: t });
                        expect(await articles[0].hasLabel(label, { transaction: t })).to.be.true;
                    }
                    await t.rollback();
                });
            }

            it("does not have any labels assigned to it initially", async function () {
                const [article, label1, label2] = await Promise.all([
                    this.Article.create({ title: "Article" }),
                    this.Label.create({ text: "Awesomeness" }),
                    this.Label.create({ text: "Epicness" })
                ]);
                const [hasLabel1, hasLabel2] = await Promise.all([
                    article.hasLabel(label1),
                    article.hasLabel(label2)
                ]);
                expect(hasLabel1).to.be.false;
                expect(hasLabel2).to.be.false;
            });

            it("answers true if the label has been assigned", async function () {
                const [article, label1, label2] = await Promise.all([
                    this.Article.create({ title: "Article" }),
                    this.Label.create({ text: "Awesomeness" }),
                    this.Label.create({ text: "Epicness" })
                ]);
                await article.addLabel(label1);
                const [hasLabel1, hasLabel2] = await Promise.all([
                    article.hasLabel(label1),
                    article.hasLabel(label2)
                ]);
                expect(hasLabel1).to.be.true;
                expect(hasLabel2).to.be.false;
            });

            it("answers correctly if the label has been assigned when passing a primary key instead of an object", async function () {
                const [article, label1, label2] = await Promise.all([
                    this.Article.create({ title: "Article" }),
                    this.Label.create({ text: "Awesomeness" }),
                    this.Label.create({ text: "Epicness" })
                ]);
                await article.addLabel(label1);
                const [hasLabel1, hasLabel2] = await Promise.all([
                    article.hasLabel(label1.id),
                    article.hasLabel(label2.id)
                ]);
                expect(hasLabel1).to.be.true;
                expect(hasLabel2).to.be.false;
            });
        });

        describe("hasAll", () => {
            beforeEach(function () {
                this.Article = this.sequelize.define("Article", {
                    title: DataTypes.STRING
                });
                this.Label = this.sequelize.define("Label", {
                    text: DataTypes.STRING
                });

                this.Article.hasMany(this.Label);

                return this.sequelize.sync({ force: true });
            });

            if (current.dialect.supports.transactions) {
                it("supports transactions", async function () {
                    const sequelize = await Support.prepareTransactionTest(this.sequelize);
                    const Article = sequelize.define("Article", { title: DataTypes.STRING });
                    const Label = sequelize.define("Label", { text: DataTypes.STRING });

                    Article.hasMany(Label);

                    await sequelize.sync({ force: true });
                    const [article, label] = await Promise.all([
                        Article.create({ title: "foo" }),
                        Label.create({ text: "bar" })
                    ]);
                    const t = await sequelize.transaction();
                    await article.setLabels([label], { transaction: t });
                    const articles = await Article.all({ transaction: t });

                    const [hasLabel1, hasLabel2] = await Promise.all([
                        articles[0].hasLabels([label]),
                        articles[0].hasLabels([label], { transaction: t })
                    ]);
                    expect(hasLabel1).to.be.false;
                    expect(hasLabel2).to.be.true;
                    await t.rollback();
                });
            }

            it("answers false if only some labels have been assigned", async function () {
                const [article, label1, label2] = await Promise.all([
                    this.Article.create({ title: "Article" }),
                    this.Label.create({ text: "Awesomeness" }),
                    this.Label.create({ text: "Epicness" })
                ]);
                await article.addLabel(label1);
                expect(await article.hasLabels([label1, label2])).to.be.false;
            });

            it("answers false if only some labels have been assigned when passing a primary key instead of an object", async function () {
                const [article, label1, label2] = await Promise.all([
                    this.Article.create({ title: "Article" }),
                    this.Label.create({ text: "Awesomeness" }),
                    this.Label.create({ text: "Epicness" })
                ]);
                await article.addLabel(label1);
                expect(await article.hasLabels([label1.id, label2.id])).to.be.false;
            });

            it("answers true if all label have been assigned", async function () {
                const [article, label1, label2] = await Promise.all([
                    this.Article.create({ title: "Article" }),
                    this.Label.create({ text: "Awesomeness" }),
                    this.Label.create({ text: "Epicness" })
                ]);
                await article.setLabels([label1, label2]);
                expect(await article.hasLabels([label1, label2])).to.be.true;
            });

            it("answers true if all label have been assigned when passing a primary key instead of an object", async function () {
                const [article, label1, label2] = await Promise.all([
                    this.Article.create({ title: "Article" }),
                    this.Label.create({ text: "Awesomeness" }),
                    this.Label.create({ text: "Epicness" })
                ]);
                await article.setLabels([label1, label2]);
                expect(await article.hasLabels([label1.id, label2.id])).to.be.true;
            });
        });

        describe("setAssociations", () => {
            if (current.dialect.supports.transactions) {
                it("supports transactions", async function () {
                    const sequelize = await Support.prepareTransactionTest(this.sequelize);
                    const Article = sequelize.define("Article", { title: DataTypes.STRING });
                    const Label = sequelize.define("Label", { text: DataTypes.STRING });

                    Article.hasMany(Label);

                    await sequelize.sync({ force: true });

                    const [article, label, t] = await Promise.all([
                        Article.create({ title: "foo" }),
                        Label.create({ text: "bar" }),
                        sequelize.transaction()
                    ]);
                    await article.setLabels([label], { transaction: t });
                    {
                        const labels = await Label.findAll({ where: { ArticleId: article.id }, transaction: undefined });
                        expect(labels.length).to.equal(0);
                    }
                    {
                        const labels = await Label.findAll({ where: { ArticleId: article.id }, transaction: t });
                        expect(labels.length).to.equal(1);
                    }
                    await t.rollback();
                });
            }

            it("clears associations when passing null to the set-method", async function () {
                const User = this.sequelize.define("User", { username: DataTypes.STRING });
                const Task = this.sequelize.define("Task", { title: DataTypes.STRING });

                Task.hasMany(User);

                await this.sequelize.sync({ force: true });
                const [user, task] = await Promise.all([
                    User.create({ username: "foo" }),
                    Task.create({ title: "task" })
                ]);
                await task.setUsers([user]);
                const users = await task.getUsers();
                expect(users).to.have.length(1);
                await task.setUsers(null);
                expect(await task.getUsers()).to.be.empty;
            });

            it("supports passing the primary key instead of an object", async function () {
                const Article = this.sequelize.define("Article", { title: DataTypes.STRING });
                const Label = this.sequelize.define("Label", { text: DataTypes.STRING });

                Article.hasMany(Label);

                await this.sequelize.sync({ force: true });

                const [article, label1, label2] = await Promise.all([
                    Article.create({}),
                    Label.create({ text: "label one" }),
                    Label.create({ text: "label two" })
                ]);
                await article.addLabel(label1.id);
                await article.setLabels([label2.id]);
                const labels = await article.getLabels();
                expect(labels).to.have.length(1);
                expect(labels[0].text).to.equal("label two");
            });
        });

        describe("addAssociations", () => {
            if (current.dialect.supports.transactions) {
                it("supports transactions", async function () {
                    const sequelize = await Support.prepareTransactionTest(this.sequelize);
                    const Article = sequelize.define("Article", { title: DataTypes.STRING });
                    const Label = sequelize.define("Label", { text: DataTypes.STRING });
                    Article.hasMany(Label);

                    await sequelize.sync({ force: true });

                    const [article, label] = await Promise.all([
                        Article.create({ title: "foo" }),
                        Label.create({ text: "bar" })
                    ]);

                    const t = await sequelize.transaction();
                    await article.addLabel(label, { transaction: t });
                    {
                        const labels = await Label.findAll({ where: { ArticleId: article.id }, transaction: undefined });
                        expect(labels.length).to.equal(0);
                    }
                    {
                        const labels = await Label.findAll({ where: { ArticleId: article.id }, transaction: t });
                        expect(labels.length).to.equal(1);
                    }
                    await t.rollback();
                });
            }

            it("supports passing the primary key instead of an object", async function () {
                const Article = this.sequelize.define("Article", { title: DataTypes.STRING });
                const Label = this.sequelize.define("Label", { text: DataTypes.STRING });

                Article.hasMany(Label);

                await this.sequelize.sync({ force: true });

                const [article, label] = await Promise.all([
                    Article.create({}),
                    Label.create({ text: "label one" })
                ]);
                await article.addLabel(label.id);
                const labels = await article.getLabels();
                expect(labels).to.have.length(1);
                expect(labels[0].text).to.equal("label one"); // Make sure that we didn't modify one of the other attributes while building / saving a new instance
            });
        });

        describe("addMultipleAssociations", () => {
            it("adds associations without removing the current ones", async function () {
                const User = this.sequelize.define("User", { username: DataTypes.STRING });
                const Task = this.sequelize.define("Task", { title: DataTypes.STRING });

                Task.hasMany(User);

                await this.sequelize.sync({ force: true });
                await User.bulkCreate([
                    { username: "foo " },
                    { username: "bar " },
                    { username: "baz " }
                ]);
                const task = await Task.create({ title: "task" });
                const users = await User.findAll();
                await task.setUsers([users[0]]);
                await task.addUsers([users[1], users[2]]);
                expect(await task.getUsers()).to.have.length(3);
            });

            it("handles decent sized bulk creates", async function () {
                const User = this.sequelize.define("User", { username: DataTypes.STRING, num: DataTypes.INTEGER, status: DataTypes.STRING });
                const Task = this.sequelize.define("Task", { title: DataTypes.STRING });

                Task.hasMany(User);

                await this.sequelize.sync({ force: true });
                const users = _.range(1000).map((i) => ({ username: `user${i}`, num: i, status: "live" }));
                await User.bulkCreate(users);
                {
                    const users = await User.findAll();
                    expect(users).to.have.length(1000);
                }
            });
        });
        it("clears associations when passing null to the set-method with omitNull set to true", async function () {
            this.sequelize.options.omitNull = true;

            const User = this.sequelize.define("User", { username: DataTypes.STRING });
            const Task = this.sequelize.define("Task", { title: DataTypes.STRING });

            Task.hasMany(User);

            await this.sequelize.sync({ force: true });
            const user = await User.create({ username: "foo" });
            const task = await Task.create({ title: "task" });
            await task.setUsers([user]);
            {
                const users = await task.getUsers();
                expect(users).to.have.length(1);
            }
            await task.setUsers(null);
            {
                const users = await task.getUsers();
                expect(users).to.have.length(0);
            }
            this.sequelize.options.omitNull = false;
        });

        describe("createAssociations", () => {
            it("creates a new associated object", async function () {
                const Article = this.sequelize.define("Article", { title: DataTypes.STRING });
                const Label = this.sequelize.define("Label", { text: DataTypes.STRING });

                Article.hasMany(Label);

                await this.sequelize.sync({ force: true });
                const article = await Article.create({ title: "foo" });
                await article.createLabel({ text: "bar" });
                const labels = await Label.findAll({ where: { ArticleId: article.id } });
                expect(labels).to.have.length(1);
            });

            it("creates the object with the association directly", async function () {
                const s = spy();

                const Article = this.sequelize.define("Article", {
                    title: DataTypes.STRING

                });
                const Label = this.sequelize.define("Label", {
                    text: DataTypes.STRING
                });

                Article.hasMany(Label);

                await this.sequelize.sync({ force: true });
                const article = await Article.create({ title: "foo" });
                const label = await article.createLabel({ text: "bar" }, { logging: s });
                expect(s.calledOnce).to.be.true;
                expect(label.ArticleId).to.equal(article.id);
            });

            if (current.dialect.supports.transactions) {
                it("supports transactions", async function () {
                    const sequelize = await Support.prepareTransactionTest(this.sequelize);
                    const Article = sequelize.define("Article", { title: DataTypes.STRING });
                    const Label = sequelize.define("Label", { text: DataTypes.STRING });

                    Article.hasMany(Label);

                    await sequelize.sync({ force: true });
                    const article = await Article.create({ title: "foo" });
                    const t = await sequelize.transaction();
                    await article.createLabel({ text: "bar" }, { transaction: t });
                    {
                        const labels = await Label.findAll();
                        expect(labels.length).to.equal(0);
                    }
                    {
                        const labels = await Label.findAll({ where: { ArticleId: article.id } });
                        expect(labels.length).to.equal(0);
                    }
                    {
                        const labels = await Label.findAll({ where: { ArticleId: article.id }, transaction: t });
                        expect(labels.length).to.equal(1);
                    }

                    await t.rollback();
                });
            }

            it("supports passing the field option", async function () {
                const Article = this.sequelize.define("Article", {
                    title: DataTypes.STRING
                });
                const Label = this.sequelize.define("Label", {
                    text: DataTypes.STRING
                });

                Article.hasMany(Label);

                await this.sequelize.sync({ force: true });
                const article = await Article.create();
                await article.createLabel({
                    text: "yolo"
                }, {
                    fields: ["text"]
                });
                const labels = await article.getLabels();
                expect(labels.length).to.be.ok;
            });
        });

        describe("getting assocations with options", () => {
            beforeEach(async function () {
                const self = this;

                this.User = this.sequelize.define("User", { username: DataTypes.STRING });
                this.Task = this.sequelize.define("Task", { title: DataTypes.STRING, active: DataTypes.BOOLEAN });

                this.User.hasMany(self.Task);

                await this.sequelize.sync({ force: true });
                const [john, task1, task2] = await Promise.all([
                    self.User.create({ username: "John" }),
                    self.Task.create({ title: "Get rich", active: true }),
                    self.Task.create({ title: "Die trying", active: false })
                ]);
                await john.setTasks([task1, task2]);
            });

            it("should treat the where object of associations as a first class citizen", async function () {
                const self = this;
                this.Article = this.sequelize.define("Article", {
                    title: DataTypes.STRING
                });
                this.Label = this.sequelize.define("Label", {
                    text: DataTypes.STRING,
                    until: DataTypes.DATE
                });

                this.Article.hasMany(this.Label);

                await this.sequelize.sync({ force: true });
                const [article, label1, label2] = await Promise.all([
                    self.Article.create({ title: "Article" }),
                    self.Label.create({ text: "Awesomeness", until: "2014-01-01 01:00:00" }),
                    self.Label.create({ text: "Epicness", until: "2014-01-03 01:00:00" })
                ]);
                await article.setLabels([label1, label2]);
                const labels = await article.getLabels({ where: { until: { $gt: adone.datetime("2014-01-02").toDate() } } });
                expect(labels).to.be.an("array");
                expect(labels).to.have.length(1);
                expect(labels[0].text).to.equal("Epicness");
            });

            it("gets all associated objects when no options are passed", function () {
                return this.User.find({ where: { username: "John" } }).then((john) => {
                    return john.getTasks();
                }).then((tasks) => {
                    expect(tasks).to.have.length(2);
                });
            });

            it("only get objects that fulfill the options", function () {
                return this.User.find({ where: { username: "John" } }).then((john) => {
                    return john.getTasks({ where: { active: true }, limit: 10, order: [["id", "DESC"]] });
                }).then((tasks) => {
                    expect(tasks).to.have.length(1);
                });
            });
        });

        describe("countAssociations", () => {
            beforeEach(async function () {
                const self = this;

                this.User = this.sequelize.define("User", { username: DataTypes.STRING });
                this.Task = this.sequelize.define("Task", { title: DataTypes.STRING, active: DataTypes.BOOLEAN });

                this.User.hasMany(self.Task, {
                    foreignKey: "userId"
                });

                await this.sequelize.sync({ force: true });
                const [john, task1, task2] = await await Promise.all([
                    self.User.create({ username: "John" }),
                    self.Task.create({ title: "Get rich", active: true }),
                    self.Task.create({ title: "Die trying", active: false })
                ]);
                self.user = john;
                await john.setTasks([task1, task2]);
            });

            it("should count all associations", async function () {
                expect(await this.user.countTasks({})).to.be.equal(2);
            });

            it("should count filtered associations", async function () {
                expect(await this.user.countTasks({
                    where: {
                        active: true
                    }
                })).to.be.equal(1);
            });

            it("should count scoped associations", async function () {
                this.User.hasMany(this.Task, {
                    foreignKey: "userId",
                    as: "activeTasks",
                    scope: {
                        active: true
                    }
                });

                expect(await this.user.countActiveTasks({})).to.be.equal(1);
            });
        });

        describe("selfAssociations", () => {
            it("should work with alias", function () {
                const Person = this.sequelize.define("Group", {});

                Person.hasMany(Person, { as: "Children" });

                return this.sequelize.sync();
            });
        });
    });

    describe("Foreign key constraints", () => {
        describe("1:m", () => {
            it("sets null by default", async function () {
                const Task = this.sequelize.define("Task", { title: DataTypes.STRING });
                const User = this.sequelize.define("User", { username: DataTypes.STRING });

                User.hasMany(Task);

                await this.sequelize.sync({ force: true });
                const [user, task] = await Promise.all([
                    User.create({ username: "foo" }),
                    Task.create({ title: "task" })
                ]);
                await user.setTasks([task]);
                await user.destroy();
                await task.reload();
                expect(task.UserId).to.equal(null);
            });

            it("sets to CASCADE if allowNull: false", function () {
                const Task = this.sequelize.define("Task", { title: DataTypes.STRING });
                const User = this.sequelize.define("User", { username: DataTypes.STRING });

                User.hasMany(Task, { foreignKey: { allowNull: false } }); // defaults to CASCADE

                return this.sequelize.sync({ force: true }).then(() => {
                    return User.create({ username: "foo" }).then((user) => {
                        return Task.create({ title: "task", UserId: user.id }).then(() => {
                            return user.destroy().then(() => {
                                return Task.findAll();
                            });
                        });
                    }).then((tasks) => {
                        expect(tasks).to.be.empty;
                    });
                });
            });

            it("should be possible to remove all constraints", async function () {
                const Task = this.sequelize.define("Task", { title: DataTypes.STRING });
                const User = this.sequelize.define("User", { username: DataTypes.STRING });

                User.hasMany(Task, { constraints: false });

                await this.sequelize.sync({ force: true });
                const [user, task] = await Promise.all([
                    User.create({ username: "foo" }),
                    Task.create({ title: "task" })
                ]);
                await user.setTasks([task]);
                await user.destroy();
                await task.reload();
                expect(task.UserId).to.equal(user.id);
            });

            it("can cascade deletes", async function () {
                const Task = this.sequelize.define("Task", { title: DataTypes.STRING });
                const User = this.sequelize.define("User", { username: DataTypes.STRING });

                User.hasMany(Task, { onDelete: "cascade" });

                await this.sequelize.sync({ force: true });
                const [user, task] = await Promise.all([
                    User.create({ username: "foo" }),
                    Task.create({ title: "task" })
                ]);
                await user.setTasks([task]);
                await user.destroy();
                const tasks = await Task.findAll();
                expect(tasks).to.have.length(0);
            });

            // NOTE: mssql does not support changing an autoincrement primary key
            if (dialect !== "mssql") {
                it("can cascade updates", async function () {
                    const Task = this.sequelize.define("Task", { title: DataTypes.STRING });
                    const User = this.sequelize.define("User", { username: DataTypes.STRING });

                    User.hasMany(Task, { onUpdate: "cascade" });

                    await this.sequelize.sync({ force: true });
                    const [user, task] = await Promise.all([
                        User.create({ username: "foo" }),
                        Task.create({ title: "task" })
                    ]);
                    await user.setTasks([task]);
                    // Changing the id of a DAO requires a little dance since
                    // the `UPDATE` query generated by `save()` uses `id` in the
                    // `WHERE` clause

                    const tableName = user.sequelize.getQueryInterface().QueryGenerator.addSchema(user.constructor);
                    await user.sequelize.getQueryInterface().update(user, tableName, { id: 999 }, { id: user.id });
                    const tasks = await Task.findAll();
                    expect(tasks).to.have.length(1);
                    expect(tasks[0].UserId).to.equal(999);
                });
            }

            if (current.dialect.supports.constraints.restrict) {
                it("can restrict deletes", async function () {
                    const self = this;
                    const Task = this.sequelize.define("Task", { title: DataTypes.STRING });
                    const User = this.sequelize.define("User", { username: DataTypes.STRING });

                    User.hasMany(Task, { onDelete: "restrict" });

                    await this.sequelize.sync({ force: true });
                    const [user, task] = await Promise.all([
                        User.create({ username: "foo" }),
                        Task.create({ title: "task" })
                    ]);
                    await user.setTasks([task]);
                    await assert.throws(async () => {
                        await user.destroy();
                    }, self.sequelize.ForeignKeyConstraintError);
                    const tasks = await Task.findAll();
                    expect(tasks).to.have.length(1);
                });

                it("can restrict updates", async function () {
                    const self = this;
                    const Task = this.sequelize.define("Task", { title: DataTypes.STRING });
                    const User = this.sequelize.define("User", { username: DataTypes.STRING });

                    User.hasMany(Task, { onUpdate: "restrict" });

                    await this.sequelize.sync({ force: true });
                    const [user, task] = await Promise.all([
                        User.create({ username: "foo" }),
                        Task.create({ title: "task" })
                    ]);
                    await user.setTasks([task]);

                    // Changing the id of a DAO requires a little dance since
                    // the `UPDATE` query generated by `save()` uses `id` in the
                    // `WHERE` clause

                    const tableName = user.sequelize.getQueryInterface().QueryGenerator.addSchema(user.constructor);
                    await assert.throws(async () => {
                        await user.sequelize.getQueryInterface().update(user, tableName, { id: 999 }, { id: user.id });
                    }, self.sequelize.ForeignKeyConstraintError);
                    const tasks = await Task.findAll();
                    expect(tasks).to.have.length(1);
                });
            }
        });
    });

    describe("Association options", () => {
        it("can specify data type for autogenerated relational keys", async function () {
            const User = this.sequelize.define("UserXYZ", { username: DataTypes.STRING });
            const dataTypes = [Sequelize.INTEGER, Sequelize.BIGINT, Sequelize.STRING];
            const self = this;
            const Tasks = {};

            for (const dataType of dataTypes) {
                const tableName = `TaskXYZ_${dataType.key}`;
                Tasks[dataType] = self.sequelize.define(tableName, { title: DataTypes.STRING });

                User.hasMany(Tasks[dataType], { foreignKey: "userId", keyType: dataType, constraints: false });

                await Tasks[dataType].sync({ force: true }); // eslint-disable-line
                expect(Tasks[dataType].rawAttributes.userId.type).to.be.an.instanceof(dataType);
            }
        });

        it("infers the keyType if none provided", function () {
            const User = this.sequelize.define("User", {
                id: { type: DataTypes.STRING, primaryKey: true },
                username: DataTypes.STRING
            });
            const Task = this.sequelize.define("Task", {
                title: DataTypes.STRING
            });

            User.hasMany(Task);

            return this.sequelize.sync({ force: true }).then(() => {
                expect(Task.rawAttributes.UserId.type instanceof DataTypes.STRING).to.be.ok;
            });
        });

        describe("allows the user to provide an attribute definition object as foreignKey", () => {
            it("works with a column that hasnt been defined before", function () {
                const Task = this.sequelize.define("task", {});
                const User = this.sequelize.define("user", {});

                User.hasMany(Task, {
                    foreignKey: {
                        name: "uid",
                        allowNull: false
                    }
                });

                expect(Task.rawAttributes.uid).to.be.ok;
                expect(Task.rawAttributes.uid.allowNull).to.be.false;
                expect(Task.rawAttributes.uid.references.model).to.equal(User.getTableName());
                expect(Task.rawAttributes.uid.references.key).to.equal("id");
            });

            it("works when taking a column directly from the object", function () {
                const Project = this.sequelize.define("project", {
                    user_id: {
                        type: Sequelize.INTEGER,
                        defaultValue: 42
                    }
                });
                const User = this.sequelize.define("user", {
                    uid: {
                        type: Sequelize.INTEGER,
                        primaryKey: true
                    }
                });

                User.hasMany(Project, { foreignKey: Project.rawAttributes.user_id });

                expect(Project.rawAttributes.user_id).to.be.ok;
                expect(Project.rawAttributes.user_id.references.model).to.equal(User.getTableName());
                expect(Project.rawAttributes.user_id.references.key).to.equal("uid");
                expect(Project.rawAttributes.user_id.defaultValue).to.equal(42);
            });

            it("works when merging with an existing definition", function () {
                const Task = this.sequelize.define("task", {
                    userId: {
                        defaultValue: 42,
                        type: Sequelize.INTEGER
                    }
                });
                const User = this.sequelize.define("user", {});

                User.hasMany(Task, { foreignKey: { allowNull: true } });

                expect(Task.rawAttributes.userId).to.be.ok;
                expect(Task.rawAttributes.userId.defaultValue).to.equal(42);
                expect(Task.rawAttributes.userId.allowNull).to.be.ok;
            });
        });

        it("should throw an error if foreignKey and as result in a name clash", function () {
            const User = this.sequelize.define("user", {
                user: Sequelize.INTEGER
            });

            expect(User.hasMany.bind(User, User, { as: "user" })).to
                .throw("Naming collision between attribute 'user' and association 'user' on model user. To remedy this, change either foreignKey or as in your association definition");
        });
    });

    describe("sourceKey", () => {
        beforeEach(function () {
            const User = this.sequelize.define("UserXYZ",
                { username: Sequelize.STRING, email: Sequelize.STRING },
                { indexes: [{ fields: ["email"], unique: true }] }
            );
            const Task = this.sequelize.define("TaskXYZ",
                { title: Sequelize.STRING, userEmail: { type: Sequelize.STRING, field: "user_email_xyz" } });

            User.hasMany(Task, { foreignKey: "userEmail", sourceKey: "email", as: "tasks" });

            this.User = User;
            this.Task = Task;

            return this.sequelize.sync({ force: true });
        });

        it("should use sourceKey", function () {
            const User = this.User;
            const Task = this.Task;

            return User.create({ username: "John", email: "john@example.com" }).then((user) => {
                return Task.create({ title: "Fix PR", userEmail: "john@example.com" }).then(() => {
                    return user.getTasks().then((tasks) => {
                        expect(tasks.length).to.equal(1);
                        expect(tasks[0].title).to.equal("Fix PR");
                    });
                });
            });
        });

        it("should count related records", function () {
            const User = this.User;
            const Task = this.Task;

            return User.create({ username: "John", email: "john@example.com" }).then((user) => {
                return Task.create({ title: "Fix PR", userEmail: "john@example.com" }).then(() => {
                    return user.countTasks().then((tasksCount) => {
                        expect(tasksCount).to.equal(1);
                    });
                });
            });
        });

        it("should set right field when add relative", function () {
            const User = this.User;
            const Task = this.Task;

            return User.create({ username: "John", email: "john@example.com" }).then((user) => {
                return Task.create({ title: "Fix PR" }).then((task) => {
                    return user.addTask(task).then(() => {
                        return user.hasTask(task.id).then((hasTask) => {
                            expect(hasTask).to.be.true;
                        });
                    });
                });
            });
        });

        it("should create with nested associated models", function () {
            const User = this.User;
            const values = {
                username: "John",
                email: "john@example.com",
                tasks: [{ title: "Fix new PR" }]
            };

            return User.create(values, { include: ["tasks"] })
                .then((user) => {
                    // Make sure tasks are defined for created user
                    expect(user).to.have.property("tasks");
                    expect(user.tasks).to.be.an("array");
                    expect(user.tasks).to.lengthOf(1);
                    expect(user.tasks[0].title).to.be.equal(values.tasks[0].title, "task title is correct");

                    return User.findOne({ where: { email: values.email } });
                })
                .then((user) =>
                    user.getTasks()
                        .then((tasks) => {
                            // Make sure tasks relationship is successful
                            expect(tasks).to.be.an("array");
                            expect(tasks).to.lengthOf(1);
                            expect(tasks[0].title).to.be.equal(values.tasks[0].title, "task title is correct");
                        }));
        });
    });

    describe("sourceKey with where clause in include", () => {
        beforeEach(function () {
            this.User = this.sequelize.define("User",
                { username: Sequelize.STRING, email: { type: Sequelize.STRING, field: "mail" } },
                { indexes: [{ fields: ["mail"], unique: true }] }
            );
            this.Task = this.sequelize.define("Task",
                { title: Sequelize.STRING, userEmail: Sequelize.STRING, taskStatus: Sequelize.STRING });

            this.User.hasMany(this.Task, { foreignKey: "userEmail", sourceKey: "mail" });

            return this.sequelize.sync({ force: true });
        });

        it("should use the specified sourceKey instead of the primary key", function () {
            return this.User.create({ username: "John", email: "john@example.com" }).then(() =>
                this.Task.bulkCreate([
                    { title: "Active Task", userEmail: "john@example.com", taskStatus: "Active" },
                    { title: "Inactive Task", userEmail: "john@example.com", taskStatus: "Inactive" }
                ])
            ).then(() =>
                this.User.find({
                    include: [
                        {
                            model: this.Task,
                            where: { taskStatus: "Active" }
                        }
                    ],
                    where: { username: "John" }
                })
            ).then((user) => {
                expect(user).to.be.ok;
                expect(user.Tasks.length).to.equal(1);
                expect(user.Tasks[0].title).to.equal("Active Task");
            });
        });
    });
});
