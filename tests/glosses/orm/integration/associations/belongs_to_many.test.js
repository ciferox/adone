import Support from "../support";

const { vendor: { lodash: _ } } = adone;
const { type, Transaction } = adone.orm;
const current = Support.sequelize;
const dialect = Support.getTestDialect();

describe(Support.getTestDialectTeaser("BelongsToMany"), () => {
    describe("getAssociations", () => {
        beforeEach(async function () {
            const self = this;

            this.User = this.sequelize.define("User", { username: type.STRING });
            this.Task = this.sequelize.define("Task", { title: type.STRING, active: type.BOOLEAN });

            this.User.belongsToMany(this.Task, { through: "UserTasks" });
            this.Task.belongsToMany(this.User, { through: "UserTasks" });

            await this.sequelize.sync({ force: true });
            const [john, task1, task2] = await Promise.all([
                self.User.create({ username: "John" }),
                self.Task.create({ title: "Get rich", active: true }),
                self.Task.create({ title: "Die trying", active: false })
            ]);
            self.tasks = [task1, task2];
            self.user = john;
            await john.setTasks([task1, task2]);
        });

        if (current.dialect.supports.transactions) {
            it("supports transactions", async function () {
                const sequelize = await Support.prepareTransactionTest(this.sequelize);
                const Article = sequelize.define("Article", { title: type.STRING });
                const Label = sequelize.define("Label", { text: type.STRING });

                Article.belongsToMany(Label, { through: "ArticleLabels" });
                Label.belongsToMany(Article, { through: "ArticleLabels" });

                await sequelize.sync({ force: true });

                const [article, label, t] = await Promise.all([
                    Article.create({ title: "foo" }),
                    Label.create({ text: "bar" }),
                    sequelize.transaction()
                ]);
                await article.setLabels([label], { transaction: t });
                {
                    const articles = await Article.all({ transaction: t });
                    const labels = await articles[0].getLabels();
                    expect(labels).to.have.length(0);
                }
                {
                    const articles = await Article.all({ transaction: t });
                    const labels = await articles[0].getLabels({ transaction: t });
                    expect(labels).to.have.length(1);

                }
                await t.rollback();
            });
        }

        it("gets all associated objects with all fields", function () {
            return this.User.find({ where: { username: "John" } }).then((john) => {
                return john.getTasks();
            }).then((tasks) => {
                tasks[0].attributes.forEach((attr) => {
                    expect(tasks[0]).to.have.property(attr);
                });
            });
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
                return john.getTasks({
                    where: {
                        active: true
                    }
                });
            }).then((tasks) => {
                expect(tasks).to.have.length(1);
            });
        });

        it("supports a where not in", function () {
            return this.User.find({
                where: {
                    username: "John"
                }
            }).then((john) => {
                return john.getTasks({
                    where: {
                        title: {
                            not: ["Get rich"]
                        }
                    }
                });
            }).then((tasks) => {
                expect(tasks).to.have.length(1);
            });
        });

        it("supports a where not in on the primary key", function () {
            const self = this;

            return this.User.find({
                where: {
                    username: "John"
                }
            }).then((john) => {
                return john.getTasks({
                    where: {
                        id: {
                            not: [self.tasks[0].get("id")]
                        }
                    }
                });
            }).then((tasks) => {
                expect(tasks).to.have.length(1);
            });
        });

        it("only gets objects that fulfill options with a formatted value", function () {
            return this.User.find({ where: { username: "John" } }).then((john) => {
                return john.getTasks({ where: { active: true } });
            }).then((tasks) => {
                expect(tasks).to.have.length(1);
            });
        });

        it("get associated objects with an eager load", function () {
            return this.User.find({ where: { username: "John" }, include: [this.Task] }).then((john) => {
                expect(john.Tasks).to.have.length(2);
            });
        });

        it("get associated objects with an eager load with conditions but not required", function () {
            const Label = this.sequelize.define("Label", { title: type.STRING, isActive: type.BOOLEAN });
            const Task = this.Task;
            const User = this.User;

            Task.hasMany(Label);
            Label.belongsTo(Task);

            return Label.sync({ force: true }).then(() => {
                return User.find({
                    where: { username: "John" },
                    include: [
                        {
                            model: Task, required: false, include: [
                                { model: Label, required: false, where: { isActive: true } }
                            ]
                        }
                    ]
                });
            }).then((john) => {
                expect(john.Tasks).to.have.length(2);
            });
        });

        it("should support schemas", async function () {
            const self = this;
            const AcmeUser = self.sequelize.define("User", {
                username: type.STRING
            }).schema("acme", "_");
            const AcmeProject = self.sequelize.define("Project", {
                title: type.STRING,
                active: type.BOOLEAN
            }).schema("acme", "_");
            const AcmeProjectUsers = self.sequelize.define("ProjectUsers", {
                status: type.STRING,
                data: type.INTEGER
            }).schema("acme", "_");

            AcmeUser.belongsToMany(AcmeProject, { through: AcmeProjectUsers });
            AcmeProject.belongsToMany(AcmeUser, { through: AcmeProjectUsers });

            await self.sequelize.dropAllSchemas();
            await self.sequelize.createSchema("acme");
            await Promise.all([
                AcmeUser.sync({ force: true }),
                AcmeProject.sync({ force: true })
            ]);
            await AcmeProjectUsers.sync({ force: true });
            const u = await AcmeUser.create();
            const p = await AcmeProject.create();
            await u.addProject(p, { through: { status: "active", data: 42 } });
            const projects = await u.getProjects();
            expect(projects).to.have.length(1);
            const project = projects[0];
            expect(project.ProjectUsers).to.be.ok;
            expect(project.status).not.to.exist;
            expect(project.ProjectUsers.status).to.equal("active");
        });

        it("supports custom primary keys and foreign keys", async function () {
            const User = this.sequelize.define("User", {
                id_user: {
                    type: type.UUID,
                    primaryKey: true,
                    defaultValue: type.UUIDV4,
                    allowNull: false
                }
            }, {
                tableName: "tbl_user"
            });

            const Group = this.sequelize.define("Group", {
                id_group: {
                    type: type.UUID,
                    allowNull: false,
                    primaryKey: true,
                    defaultValue: type.UUIDV4
                }
            }, {
                tableName: "tbl_group"
            });

            const User_has_Group = this.sequelize.define("User_has_Group", {

            }, {
                tableName: "tbl_user_has_group"
            });

            User.belongsToMany(Group, { as: "groups", through: User_has_Group, foreignKey: "id_user" });
            Group.belongsToMany(User, { as: "users", through: User_has_Group, foreignKey: "id_group" });

            await this.sequelize.sync({ force: true });
            const [user, group] = await Promise.all([
                User.create(),
                Group.create()
            ]);
            await user.addGroup(group);
            {
                const user = await User.findOne({
                    where: {}
                });
                await user.getGroups();
            }
        });

        it("supports primary key attributes with different field names", async function () {
            const User = this.sequelize.define("User", {
                id: {
                    type: type.UUID,
                    allowNull: false,
                    primaryKey: true,
                    defaultValue: type.UUIDV4,
                    field: "user_id"
                }
            }, {
                tableName: "tbl_user"
            });

            const Group = this.sequelize.define("Group", {
                id: {
                    type: type.UUID,
                    allowNull: false,
                    primaryKey: true,
                    defaultValue: type.UUIDV4,
                    field: "group_id"
                }
            }, {
                tableName: "tbl_group"
            });

            const User_has_Group = this.sequelize.define("User_has_Group", {

            }, {
                tableName: "tbl_user_has_group"
            });

            User.belongsToMany(Group, { through: User_has_Group });
            Group.belongsToMany(User, { through: User_has_Group });

            await this.sequelize.sync({ force: true });
            const [user, group] = await Promise.all([
                User.create(),
                Group.create()
            ]);
            await user.addGroup(group);
            await Promise.all([
                User.findOne({
                    where: {},
                    include: [Group]
                }),
                User.findAll({
                    include: [Group]
                })
            ]);
        });

        it("supports primary key attributes with different field names where parent include is required", async function () {
            const User = this.sequelize.define("User", {
                id: {
                    type: type.UUID,
                    allowNull: false,
                    primaryKey: true,
                    defaultValue: type.UUIDV4,
                    field: "user_id"
                }
            }, {
                tableName: "tbl_user"
            });

            const Company = this.sequelize.define("Company", {
                id: {
                    type: type.UUID,
                    allowNull: false,
                    primaryKey: true,
                    defaultValue: type.UUIDV4,
                    field: "company_id"
                }
            }, {
                tableName: "tbl_company"
            });

            const Group = this.sequelize.define("Group", {
                id: {
                    type: type.UUID,
                    allowNull: false,
                    primaryKey: true,
                    defaultValue: type.UUIDV4,
                    field: "group_id"
                }
            }, {
                tableName: "tbl_group"
            });

            const Company_has_Group = this.sequelize.define("Company_has_Group", {

            }, {
                tableName: "tbl_company_has_group"
            });

            User.belongsTo(Company);
            Company.hasMany(User);
            Company.belongsToMany(Group, { through: Company_has_Group });
            Group.belongsToMany(Company, { through: Company_has_Group });

            await this.sequelize.sync({ force: true });
            const [user, group, company] = await Promise.all([
                User.create(),
                Group.create(),
                Company.create()
            ]);
            await Promise.all([
                user.setCompany(company),
                company.addGroup(group)
            ]);
            await Promise.all([
                User.findOne({
                    where: {},
                    include: [
                        { model: Company, include: [Group] }
                    ]
                }),
                User.findAll({
                    include: [
                        { model: Company, include: [Group] }
                    ]
                }),
                User.findOne({
                    where: {},
                    include: [
                        { model: Company, required: true, include: [Group] }
                    ]
                }),
                User.findAll({
                    include: [
                        { model: Company, required: true, include: [Group] }
                    ]
                })
            ]);
        });
    });

    describe("countAssociations", () => {
        beforeEach(async function () {
            const self = this;

            this.User = this.sequelize.define("User", {
                username: type.STRING
            });
            this.Task = this.sequelize.define("Task", {
                title: type.STRING,
                active: type.BOOLEAN
            });
            this.UserTask = this.sequelize.define("UserTask", {
                id: {
                    type: type.INTEGER,
                    primaryKey: true,
                    autoIncrement: true
                },
                started: {
                    type: type.BOOLEAN,
                    defaultValue: false
                }
            });

            this.User.belongsToMany(this.Task, { through: this.UserTask });
            this.Task.belongsToMany(this.User, { through: this.UserTask });

            await this.sequelize.sync({ force: true });
            const [john, task1, task2] = await Promise.all([
                self.User.create({ username: "John" }),
                self.Task.create({ title: "Get rich", active: true }),
                self.Task.create({ title: "Die trying", active: false })
            ]);
            self.tasks = [task1, task2];
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
            this.User.belongsToMany(this.Task, {
                as: "activeTasks",
                through: this.UserTask,
                scope: {
                    active: true
                }
            });

            expect(await this.user.countActiveTasks({})).to.be.equal(1);
        });

        it("should count scoped through associations", async function () {
            const user = this.user;

            this.User.belongsToMany(this.Task, {
                as: "startedTasks",
                through: {
                    model: this.UserTask,
                    scope: {
                        started: true
                    }
                }
            });

            await Promise.all([
                this.Task.create().then((task) => {
                    return user.addTask(task, {
                        through: { started: true }
                    });
                }),
                this.Task.create().then((task) => {
                    return user.addTask(task, {
                        through: { started: true }
                    });
                })
            ]);
            expect(await user.countStartedTasks({})).to.be.equal(2);
        });
    });

    describe("setAssociations", () => {
        it("clears associations when passing null to the set-method", async function () {
            const User = this.sequelize.define("User", { username: type.STRING });
            const Task = this.sequelize.define("Task", { title: type.STRING });

            User.belongsToMany(Task, { through: "UserTasks" });
            Task.belongsToMany(User, { through: "UserTasks" });

            await this.sequelize.sync({ force: true });
            const [user, task] = await await Promise.all([
                User.create({ username: "foo" }),
                Task.create({ title: "task" })
            ]);
            await task.setUsers([user]);
            const _users = await task.getUsers();
            expect(_users).to.have.length(1);

            await task.setUsers(null);
            expect(await task.getUsers()).to.be.empty;
        });

        it("should be able to set twice with custom primary keys", async function () {
            const User = this.sequelize.define("User", { uid: { type: type.INTEGER, primaryKey: true, autoIncrement: true }, username: type.STRING });
            const Task = this.sequelize.define("Task", { tid: { type: type.INTEGER, primaryKey: true, autoIncrement: true }, title: type.STRING });

            User.belongsToMany(Task, { through: "UserTasks" });
            Task.belongsToMany(User, { through: "UserTasks" });

            await this.sequelize.sync({ force: true });
            const [user1, user2, task] = await Promise.all([
                User.create({ username: "foo" }),
                User.create({ username: "bar" }),
                Task.create({ title: "task" })
            ]);
            await task.setUsers([user1]);
            user2.user_has_task = { usertitle: "Something" };
            await task.setUsers([user1, user2]);
            expect(await task.getUsers()).to.have.length(2);
        });

        it("joins an association with custom primary keys", async function () {
            const Group = this.sequelize.define("group", {
                group_id: { type: type.INTEGER, primaryKey: true },
                name: new type.STRING(64)
            });
            const Member = this.sequelize.define("member", {
                member_id: { type: type.INTEGER, primaryKey: true },
                email: new type.STRING(64)
            });

            Group.belongsToMany(Member, { through: "group_members", foreignKey: "group_id", otherKey: "member_id" });
            Member.belongsToMany(Group, { through: "group_members", foreignKey: "member_id", otherKey: "group_id" });

            await this.sequelize.sync({ force: true });
            const [group, member] = await Promise.all([
                Group.create({ group_id: 1, name: "Group1" }),
                Member.create({ member_id: 10, email: "team@sequelizejs.com" })
            ]);
            await group.addMember(member);
            const members = await group.getMembers();
            expect(members).to.be.instanceof(Array);
            expect(members).to.have.length(1);
            expect(members[0].member_id).to.equal(10);
            expect(members[0].email).to.equal("team@sequelizejs.com");
        });

        it("supports passing the primary key instead of an object", async function () {
            const User = this.sequelize.define("User", { username: type.STRING });
            const Task = this.sequelize.define("Task", { title: type.STRING });

            User.belongsToMany(Task, { through: "UserTasks" });
            Task.belongsToMany(User, { through: "UserTasks" });

            await this.sequelize.sync({ force: true });
            const [user, task1, task2] = await Promise.all([
                User.create({ id: 12 }),
                Task.create({ id: 50, title: "get started" }),
                Task.create({ id: 5, title: "wat" })
            ]);
            await user.addTask(task1.id);
            await user.setTasks([task2.id]);
            const tasks = await user.getTasks();
            expect(tasks).to.have.length(1);
            expect(tasks[0].title).to.equal("wat");
        });

        it("using scope to set associations", async function () {
            const self = this;
            const ItemTag = self.sequelize.define("ItemTag", {
                id: { type: type.INTEGER, primaryKey: true, autoIncrement: true },
                tag_id: { type: type.INTEGER, unique: false },
                taggable: { type: type.STRING },
                taggable_id: { type: type.INTEGER, unique: false }
            });
            const Tag = self.sequelize.define("Tag", {
                id: { type: type.INTEGER, primaryKey: true, autoIncrement: true },
                name: type.STRING
            });
            const Comment = self.sequelize.define("Comment", {
                id: { type: type.INTEGER, primaryKey: true, autoIncrement: true },
                name: type.STRING
            });
            const Post = self.sequelize.define("Post", {
                id: { type: type.INTEGER, primaryKey: true, autoIncrement: true },
                name: type.STRING
            });

            Post.belongsToMany(Tag, {
                through: { model: ItemTag, unique: false, scope: { taggable: "post" } },
                foreignKey: "taggable_id"
            });

            Comment.belongsToMany(Tag, {
                through: { model: ItemTag, unique: false, scope: { taggable: "comment" } },
                foreignKey: "taggable_id"
            });

            await self.sequelize.sync({ force: true });
            const [post, comment, tag] = await Promise.all([
                Post.create({ name: "post1" }),
                Comment.create({ name: "comment1" }),
                Tag.create({ name: "tag1" })
            ]);
            await post.setTags([tag]);
            await comment.setTags([tag]);
            const [postTags, commentTags] = await Promise.all([
                post.getTags(),
                comment.getTags()
            ]);
            expect(postTags).to.have.length(1);
            expect(commentTags).to.have.length(1);
        });

        it("updating association via set associations with scope", async function () {
            const self = this;
            const ItemTag = this.sequelize.define("ItemTag", {
                id: { type: type.INTEGER, primaryKey: true, autoIncrement: true },
                tag_id: { type: type.INTEGER, unique: false },
                taggable: { type: type.STRING },
                taggable_id: { type: type.INTEGER, unique: false }
            });
            const Tag = this.sequelize.define("Tag", {
                id: { type: type.INTEGER, primaryKey: true, autoIncrement: true },
                name: type.STRING
            });
            const Comment = this.sequelize.define("Comment", {
                id: { type: type.INTEGER, primaryKey: true, autoIncrement: true },
                name: type.STRING
            });
            const Post = this.sequelize.define("Post", {
                id: { type: type.INTEGER, primaryKey: true, autoIncrement: true },
                name: type.STRING
            });

            Post.belongsToMany(Tag, {
                through: { model: ItemTag, unique: false, scope: { taggable: "post" } },
                foreignKey: "taggable_id"
            });

            Comment.belongsToMany(Tag, {
                through: { model: ItemTag, unique: false, scope: { taggable: "comment" } },
                foreignKey: "taggable_id"
            });

            await this.sequelize.sync({ force: true });
            const [post, comment, tag, secondTag] = await Promise.all([
                Post.create({ name: "post1" }),
                Comment.create({ name: "comment1" }),
                Tag.create({ name: "tag1" }),
                Tag.create({ name: "tag2" })
            ]);
            await post.setTags([tag, secondTag]);
            await comment.setTags([tag, secondTag]);
            await post.setTags([tag]);
            const [postTags, commentTags] = await Promise.all([
                post.getTags(),
                comment.getTags()
            ]);
            expect(postTags).to.have.length(1);
            expect(commentTags).to.have.length(2);
        });
    });

    describe("createAssociations", () => {
        it("creates a new associated object", async function () {
            const User = this.sequelize.define("User", { username: type.STRING });
            const Task = this.sequelize.define("Task", { title: type.STRING });

            User.belongsToMany(Task, { through: "UserTasks" });
            Task.belongsToMany(User, { through: "UserTasks" });

            await this.sequelize.sync({ force: true });
            const task = await Task.create({ title: "task" });
            const createdUser = await task.createUser({ username: "foo" });
            expect(createdUser).to.be.instanceof(User);
            expect(createdUser.username).to.equal("foo");
            const _users = await task.getUsers();
            expect(_users).to.have.length(1);
        });

        if (current.dialect.supports.transactions) {
            it("supports transactions", async function () {
                const sequelize = await Support.prepareTransactionTest(this.sequelize);
                const User = sequelize.define("User", { username: type.STRING });
                const Task = sequelize.define("Task", { title: type.STRING });

                User.belongsToMany(Task, { through: "UserTasks" });
                Task.belongsToMany(User, { through: "UserTasks" });

                await sequelize.sync({ force: true });
                const [task, t] = await Promise.all([
                    Task.create({ title: "task" }),
                    sequelize.transaction()
                ]);
                await task.createUser({ username: "foo" }, { transaction: t });
                const users = await task.getUsers();
                expect(users).to.have.length(0);
                const _users = await task.getUsers({ transaction: t });
                expect(_users).to.have.length(1);
                await t.rollback();
            });
        }

        it("supports setting through table attributes", async function () {
            const User = this.sequelize.define("user", {});
            const Group = this.sequelize.define("group", {});
            const UserGroups = this.sequelize.define("user_groups", {
                isAdmin: type.BOOLEAN
            });

            User.belongsToMany(Group, { through: UserGroups });
            Group.belongsToMany(User, { through: UserGroups });

            await this.sequelize.sync({ force: true });
            const group = await Group.create({});
            await Promise.all([
                group.createUser({ id: 1 }, { through: { isAdmin: true } }),
                group.createUser({ id: 2 }, { through: { isAdmin: false } }),
            ]);
            const userGroups = await UserGroups.findAll();
            userGroups.sort((a, b) => {
                return a.userId < b.userId ? - 1 : 1;
            });
            expect(userGroups[0].userId).to.equal(1);
            expect(userGroups[0].isAdmin).to.be.ok;
            expect(userGroups[1].userId).to.equal(2);
            expect(userGroups[1].isAdmin).not.to.be.ok;
        });

        it("supports using the field parameter", async function () {
            const User = this.sequelize.define("User", { username: type.STRING });
            const Task = this.sequelize.define("Task", { title: type.STRING });

            User.belongsToMany(Task, { through: "UserTasks" });
            Task.belongsToMany(User, { through: "UserTasks" });

            await this.sequelize.sync({ force: true });
            const task = await Task.create({ title: "task" });
            const createdUser = await task.createUser({ username: "foo" }, { fields: ["username"] });
            expect(createdUser).to.be.instanceof(User);
            expect(createdUser.username).to.equal("foo");
            expect(await task.getUsers()).to.have.length(1);
        });
    });

    describe("addAssociations", () => {
        it("supports both single instance and array", async function () {
            const User = this.sequelize.define("User", { username: type.STRING });
            const Task = this.sequelize.define("Task", { title: type.STRING });

            User.belongsToMany(Task, { through: "UserTasks" });
            Task.belongsToMany(User, { through: "UserTasks" });

            await this.sequelize.sync({ force: true });
            const [user, task1, task2] = await Promise.all([
                User.create({ id: 12 }),
                Task.create({ id: 50, title: "get started" }),
                Task.create({ id: 52, title: "get done" })
            ]);
            await Promise.all([
                user.addTask(task1),
                user.addTask([task2])
            ]);
            const tasks = await user.getTasks();
            expect(tasks).to.have.length(2);
            expect(_.find(tasks, (item) => {
                return item.title === "get started";
            })).to.be.ok;
            expect(_.find(tasks, (item) => {
                return item.title === "get done";
            })).to.be.ok;
        });

        if (current.dialect.supports.transactions) {
            it("supports transactions", async function () {
                const sequelize = await Support.prepareTransactionTest(this.sequelize);
                const User = sequelize.define("User", { username: type.STRING });
                const Task = sequelize.define("Task", { title: type.STRING });

                User.belongsToMany(Task, { through: "UserTasks" });
                Task.belongsToMany(User, { through: "UserTasks" });

                await sequelize.sync({ force: true });
                const [user, task, t] = await Promise.all([
                    User.create({ username: "foo" }),
                    Task.create({ title: "task" }),
                    sequelize.transaction()
                ]);
                await task.addUser(user, { transaction: t });
                expect(await task.hasUser(user)).to.be.false;
                expect(await task.hasUser(user, { transaction: t })).to.be.true;
                await t.rollback();
            });

            it("supports transactions when updating a through model", async function () {
                const sequelize = await Support.prepareTransactionTest(this.sequelize);
                const User = sequelize.define("User", { username: type.STRING });
                const Task = sequelize.define("Task", { title: type.STRING });

                const UserTask = sequelize.define("UserTask", {
                    status: type.STRING
                });

                User.belongsToMany(Task, { through: UserTask });
                Task.belongsToMany(User, { through: UserTask });
                await sequelize.sync({ force: true });
                const [user, task, t] = await Promise.all([
                    User.create({ username: "foo" }),
                    Task.create({ title: "task" }),
                    sequelize.transaction({ isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED })
                ]);
                await task.addUser(user, { through: { status: "pending" } }); // Create without transaction, so the old value is accesible from outside the transaction
                await task.addUser(user, { transaction: t, through: { status: "completed" } }); // Add an already exisiting user in a transaction, updating a value in the join table
                const [tasks, transactionTasks] = await Promise.all([
                    user.getTasks(),
                    user.getTasks({ transaction: t })
                ]);
                expect(tasks[0].UserTask.status).to.equal("pending");
                expect(transactionTasks[0].UserTask.status).to.equal("completed");
                await t.rollback();
            });
        }

        it("supports passing the primary key instead of an object", async function () {
            const User = this.sequelize.define("User", { username: type.STRING });
            const Task = this.sequelize.define("Task", { title: type.STRING });

            User.belongsToMany(Task, { through: "UserTasks" });
            Task.belongsToMany(User, { through: "UserTasks" });

            await this.sequelize.sync({ force: true });
            const [user, task] = await Promise.all([
                User.create({ id: 12 }),
                Task.create({ id: 50, title: "get started" })
            ]);
            await user.addTask(task.id);
            const tasks = await user.getTasks();
            expect(tasks[0].title).to.equal("get started");
        });


        it("should not pass indexes to the join table", function () {
            const User = this.sequelize.define(
                "User",
                { username: type.STRING },
                {
                    indexes: [
                        {
                            name: "username_unique",
                            unique: true,
                            method: "BTREE",
                            fields: ["username"]
                        }
                    ]
                });
            const Task = this.sequelize.define(
                "Task",
                { title: type.STRING },
                {
                    indexes: [
                        {
                            name: "title_index",
                            method: "BTREE",
                            fields: ["title"]
                        }
                    ]
                });
            //create associations
            User.belongsToMany(Task, { through: "UserTasks" });
            Task.belongsToMany(User, { through: "UserTasks" });
            return this.sequelize.sync({ force: true });
        });
    });

    describe("addMultipleAssociations", () => {
        it("supports both single instance and array", async function () {
            const User = this.sequelize.define("User", { username: type.STRING });
            const Task = this.sequelize.define("Task", { title: type.STRING });

            User.belongsToMany(Task, { through: "UserTasks" });
            Task.belongsToMany(User, { through: "UserTasks" });

            await this.sequelize.sync({ force: true });
            const [user, task1, task2] = await Promise.all([
                User.create({ id: 12 }),
                Task.create({ id: 50, title: "get started" }),
                Task.create({ id: 52, title: "get done" })
            ]);
            await Promise.all([
                user.addTasks(task1),
                user.addTasks([task2])
            ]);
            const tasks = await user.getTasks();
            expect(tasks).to.have.length(2);
            expect(_.find(tasks, (item) => {
                return item.title === "get started";
            })).to.be.ok;
            expect(_.find(tasks, (item) => {
                return item.title === "get done";
            })).to.be.ok;
        });

        it("adds associations without removing the current ones", async function () {
            const User = this.sequelize.define("User", { username: type.STRING });
            const Task = this.sequelize.define("Task", { title: type.STRING });

            User.belongsToMany(Task, { through: "UserTasks" });
            Task.belongsToMany(User, { through: "UserTasks" });

            await this.sequelize.sync({ force: true });
            await User.bulkCreate([
                { username: "foo " },
                { username: "bar " },
                { username: "baz " }
            ]);
            const [task, users] = await Promise.all([
                Task.create({ title: "task" }),
                User.findAll()
            ]);
            await task.setUsers([users[0]]);
            await task.addUsers([users[1], users[2]]);
            const users2 = await task.getUsers();
            expect(users2).to.have.length(3);

            await task.addUsers([users[0]]);
            await task.addUsers([users[0].id]);

            const users3 = await task.getUsers();
            expect(users3).to.have.length(3);
        });
    });

    describe("through model validations", () => {
        beforeEach(async function () {
            const Project = this.sequelize.define("Project", {
                name: type.STRING
            });

            const Employee = this.sequelize.define("Employee", {
                name: type.STRING
            });

            const Participation = this.sequelize.define("Participation", {
                role: {
                    type: type.STRING,
                    allowNull: false,
                    validate: {
                        len: {
                            args: [2, 50],
                            msg: "too bad"
                        }
                    }
                }
            });

            Project.belongsToMany(Employee, { as: "Participants", through: Participation });
            Employee.belongsToMany(Project, { as: "Participations", through: Participation });

            await this.sequelize.sync({ force: true });
            [this.project, this.employee] = await Promise.all([
                Project.create({ name: "project 1" }),
                Employee.create({ name: "employee 1" })
            ]);
        });

        it("runs on add", async function () {
            await assert.throws(async () => {
                await this.project.addParticipant(this.employee, { through: { role: "" } });
            });
        });

        it("runs on set", async function () {
            await assert.throws(async () => {
                await this.project.setParticipants([this.employee], { through: { role: "" } });
            });
        });

        it("runs on create", async function () {
            await assert.throws(async () => {
                await this.project.createParticipant({ name: "employee 2" }, { through: { role: "" } });
            });
        });
    });

    describe("optimizations using bulk create, destroy and update", () => {
        beforeEach(function () {
            this.User = this.sequelize.define("User", { username: type.STRING }, { timestamps: false });
            this.Task = this.sequelize.define("Task", { title: type.STRING }, { timestamps: false });

            this.User.belongsToMany(this.Task, { through: "UserTasks" });
            this.Task.belongsToMany(this.User, { through: "UserTasks" });

            return this.sequelize.sync({ force: true });
        });

        it("uses one insert into statement", async function () {
            const s = spy();

            const [user, task1, task2] = await Promise.all([
                this.User.create({ username: "foo" }),
                this.Task.create({ id: 12, title: "task1" }),
                this.Task.create({ id: 15, title: "task2" })
            ]);
            await user.setTasks([task1, task2], {
                logging: s
            });
            expect(s.calledTwice).to.be.ok;
        });

        it("uses one delete from statement", async function () {
            const s = spy();

            const [user, task1, task2] = await Promise.all([
                this.User.create({ username: "foo" }),
                this.Task.create({ title: "task1" }),
                this.Task.create({ title: "task2" })
            ]);
            await user.setTasks([task1, task2]);
            await user.setTasks(null, {
                logging: s
            });
            expect(s.calledTwice).to.be.ok;
        });
    }); // end optimization using bulk create, destroy and update

    describe("join table creation", () => {
        beforeEach(function () {
            this.User = this.sequelize.define("User",
                { username: type.STRING },
                { tableName: "users" }
            );
            this.Task = this.sequelize.define("Task",
                { title: type.STRING },
                { tableName: "tasks" }
            );

            this.User.belongsToMany(this.Task, { through: "user_has_tasks" });
            this.Task.belongsToMany(this.User, { through: "user_has_tasks" });

            return this.sequelize.sync({ force: true });
        });

        it("should work with non integer primary keys", function () {
            const Beacons = this.sequelize.define("Beacon", {
                id: {
                    primaryKey: true,
                    type: type.UUID,
                    defaultValue: type.UUIDV4
                },
                name: {
                    type: type.STRING
                }
            });

            // Usar not to clash with the beforEach definition
            const Users = this.sequelize.define("Usar", {
                name: {
                    type: type.STRING
                }
            });

            Beacons.belongsToMany(Users, { through: "UserBeacons" });
            Users.belongsToMany(Beacons, { through: "UserBeacons" });

            return this.sequelize.sync({ force: true });
        });

        it("makes join table non-paranoid by default", () => {
            const paranoidSequelize = Support.createSequelizeInstance({
                define: {
                    paranoid: true
                }
            });
            const ParanoidUser = paranoidSequelize.define("ParanoidUser", {});
            const ParanoidTask = paranoidSequelize.define("ParanoidTask", {});

            ParanoidUser.belongsToMany(ParanoidTask, { through: "UserTasks" });
            ParanoidTask.belongsToMany(ParanoidUser, { through: "UserTasks" });

            expect(ParanoidUser.options.paranoid).to.be.ok;
            expect(ParanoidTask.options.paranoid).to.be.ok;

            _.forEach(ParanoidUser.associations, (association) => {
                expect(association.through.model.options.paranoid).not.to.be.ok;
            });
        });
    });

    describe("foreign keys", () => {
        it("should correctly generate underscored keys", function () {
            const User = this.sequelize.define("User", {

            }, {
                tableName: "users",
                underscored: true,
                timestamps: false
            });

            const Place = this.sequelize.define("Place", {
                //fields
            }, {
                tableName: "places",
                underscored: true,
                timestamps: false
            });

            User.belongsToMany(Place, { through: "user_places" });
            Place.belongsToMany(User, { through: "user_places" });

            const attributes = this.sequelize.model("user_places").rawAttributes;

            expect(attributes.place_id).to.be.ok;
            expect(attributes.user_id).to.be.ok;
        });

        it("should infer otherKey from paired BTM relationship with a through string defined", function () {
            const User = this.sequelize.define("User", {});
            const Place = this.sequelize.define("Place", {});

            const Places = User.belongsToMany(Place, { through: "user_places", foreignKey: "user_id" });
            const Users = Place.belongsToMany(User, { through: "user_places", foreignKey: "place_id" });

            expect(Places.foreignKey).to.equal("user_id");
            expect(Users.foreignKey).to.equal("place_id");

            expect(Places.otherKey).to.equal("place_id");
            expect(Users.otherKey).to.equal("user_id");
        });

        it("should infer otherKey from paired BTM relationship with a through model defined", function () {
            const User = this.sequelize.define("User", {});
            const Place = this.sequelize.define("User", {});
            const UserPlace = this.sequelize.define("UserPlace", { id: { primaryKey: true, type: type.INTEGER, autoIncrement: true } }, { timestamps: false });

            const Places = User.belongsToMany(Place, { through: UserPlace, foreignKey: "user_id" });
            const Users = Place.belongsToMany(User, { through: UserPlace, foreignKey: "place_id" });

            expect(Places.foreignKey).to.equal("user_id");
            expect(Users.foreignKey).to.equal("place_id");

            expect(Places.otherKey).to.equal("place_id");
            expect(Users.otherKey).to.equal("user_id");

            expect(Object.keys(UserPlace.rawAttributes).length).to.equal(3); // Defined primary key and two foreign keys
        });
    });

    describe("foreign key with fields specified", () => {
        beforeEach(function () {
            this.User = this.sequelize.define("User", { name: type.STRING });
            this.Project = this.sequelize.define("Project", { name: type.STRING });
            this.Puppy = this.sequelize.define("Puppy", { breed: type.STRING });

            // doubly linked has many
            this.User.belongsToMany(this.Project, {
                through: "user_projects",
                as: "Projects",
                foreignKey: {
                    field: "user_id",
                    name: "userId"
                },
                otherKey: {
                    field: "project_id",
                    name: "projectId"
                }
            });
            this.Project.belongsToMany(this.User, {
                through: "user_projects",
                as: "Users",
                foreignKey: {
                    field: "project_id",
                    name: "projectId"
                },
                otherKey: {
                    field: "user_id",
                    name: "userId"
                }
            });
        });

        it("should correctly get associations even after a child instance is deleted", async function () {
            const self = this;
            const s = spy();

            await this.sequelize.sync({ force: true });
            const [user, project1, project2] = await Promise.all([
                self.User.create({ name: "Matt" }),
                self.Project.create({ name: "Good Will Hunting" }),
                self.Project.create({ name: "The Departed" })
            ]);
            await user.addProjects([project1, project2], {
                logging: s
            });
            expect(s).to.have.been.calledTwice;
            s.reset();
            const projects = await user.getProjects({
                logging: s
            });
            expect(s.calledOnce).to.be.ok;
            const project = projects[0];
            expect(project).to.be.ok;
            await project.destroy();
            const _user = await self.User.findOne({
                where: { id: user.id },
                include: [{ model: self.Project, as: "Projects" }]
            });
            const _projects = _user.Projects;
            const _project = _projects[0];
            expect(_project).to.be.ok;
        });

        it("should correctly get associations when doubly linked", async function () {
            const self = this;
            const s = spy();
            await this.sequelize.sync({ force: true });
            const [user, project] = await Promise.all([
                self.User.create({ name: "Matt" }),
                self.Project.create({ name: "Good Will Hunting" })
            ]);
            await user.addProject(project, { logging: s });
            expect(s.calledTwice).to.be.ok; // Once for SELECT, once for INSERT
            s.reset();
            const projects = await user.getProjects({
                logging: s
            });
            const _project = projects[0];
            expect(s.calledOnce).to.be.ok;
            s.reset();

            expect(_project).to.be.ok;
            await user.removeProject(_project, {
                logging: s
            });
            expect(s).to.have.been.calledOnce;
        });

        it("should be able to handle nested includes properly", async function () {
            const self = this;
            this.Group = this.sequelize.define("Group", { groupName: type.STRING });

            this.Group.belongsToMany(this.User, {
                through: "group_users",
                as: "Users",
                foreignKey: {
                    field: "group_id",
                    name: "groupId"
                },
                otherKey: {
                    field: "user_id",
                    name: "userId"
                }
            });
            this.User.belongsToMany(this.Group, {
                through: "group_users",
                as: "Groups",
                foreignKey: {
                    field: "user_id",
                    name: "userId"
                },
                otherKey: {
                    field: "group_id",
                    name: "groupId"
                }
            });

            await this.sequelize.sync({ force: true });
            const [group, user, project] = await Promise.all([
                self.Group.create({ groupName: "The Illuminati" }),
                self.User.create({ name: "Matt" }),
                self.Project.create({ name: "Good Will Hunting" })
            ]);
            await user.addProject(project);
            await group.addUser(user);
            // get the group and include both the users in the group and their project's
            const groups = await self.Group.findAll({
                where: { id: group.id },
                include: [
                    {
                        model: self.User,
                        as: "Users",
                        include: [
                            { model: self.Project, as: "Projects" }
                        ]
                    }
                ]
            });
            {
                const group = groups[0];
                expect(group).to.be.ok;

                const user = group.Users[0];
                expect(user).to.be.ok;

                const project = user.Projects[0];
                expect(project).to.be.ok;
                expect(project.name).to.equal("Good Will Hunting");
            }
        });
    });


    describe("primary key handling for join table", () => {
        beforeEach(function () {
            this.User = this.sequelize.define("User",
                { username: type.STRING },
                { tableName: "users" }
            );
            this.Task = this.sequelize.define("Task",
                { title: type.STRING },
                { tableName: "tasks" }
            );
        });

        it("removes the primary key if it was added by sequelize", function () {
            this.UserTasks = this.sequelize.define("usertasks", {});

            this.User.belongsToMany(this.Task, { through: this.UserTasks });
            this.Task.belongsToMany(this.User, { through: this.UserTasks });

            expect(Object.keys(this.UserTasks.primaryKeys).sort()).to.deep.equal(["TaskId", "UserId"]);
        });

        it("keeps the primary key if it was added by the user", function () {
            let fk;

            this.UserTasks = this.sequelize.define("usertasks", {
                id: {
                    type: type.INTEGER,
                    autoincrement: true,
                    primaryKey: true
                }
            });
            this.UserTasks2 = this.sequelize.define("usertasks2", {
                userTasksId: {
                    type: type.INTEGER,
                    autoincrement: true,
                    primaryKey: true
                }
            });

            this.User.belongsToMany(this.Task, { through: this.UserTasks });
            this.Task.belongsToMany(this.User, { through: this.UserTasks });

            this.User.belongsToMany(this.Task, { through: this.UserTasks2 });
            this.Task.belongsToMany(this.User, { through: this.UserTasks2 });

            expect(Object.keys(this.UserTasks.primaryKeys)).to.deep.equal(["id"]);
            expect(Object.keys(this.UserTasks2.primaryKeys)).to.deep.equal(["userTasksId"]);

            _.each([this.UserTasks, this.UserTasks2], (model) => {
                fk = Object.keys(model.options.uniqueKeys)[0];
                expect(model.options.uniqueKeys[fk].fields.sort()).to.deep.equal(["TaskId", "UserId"]);
            });
        });

        describe("without sync", () => {
            beforeEach(function () {
                const self = this;

                return self.sequelize.queryInterface.createTable("users", { id: { type: type.INTEGER, primaryKey: true, autoIncrement: true }, username: type.STRING, createdAt: type.DATE, updatedAt: type.DATE }).then(() => {
                    return self.sequelize.queryInterface.createTable("tasks", { id: { type: type.INTEGER, primaryKey: true, autoIncrement: true }, title: type.STRING, createdAt: type.DATE, updatedAt: type.DATE });
                }).then(() => {
                    return self.sequelize.queryInterface.createTable("users_tasks", { TaskId: type.INTEGER, UserId: type.INTEGER, createdAt: type.DATE, updatedAt: type.DATE });
                });
            });

            it("removes all associations", async function () {
                this.UsersTasks = this.sequelize.define("UsersTasks", {}, { tableName: "users_tasks" });

                this.User.belongsToMany(this.Task, { through: this.UsersTasks });
                this.Task.belongsToMany(this.User, { through: this.UsersTasks });

                expect(Object.keys(this.UsersTasks.primaryKeys).sort()).to.deep.equal(["TaskId", "UserId"]);

                const [user, task] = await Promise.all([
                    this.User.create({ username: "foo" }),
                    this.Task.create({ title: "foo" })
                ]);
                await user.addTask(task);
                expect(await user.setTasks(null)).to.be.ok;
            });
        });
    });

    describe("through", () => {
        beforeEach(function () {
            this.User = this.sequelize.define("User", {});
            this.Project = this.sequelize.define("Project", {});
            this.UserProjects = this.sequelize.define("UserProjects", {
                status: type.STRING,
                data: type.INTEGER
            });

            this.User.belongsToMany(this.Project, { through: this.UserProjects });
            this.Project.belongsToMany(this.User, { through: this.UserProjects });

            return this.sequelize.sync();
        });

        describe("fetching from join table", () => {
            it("should contain the data from the join table on .UserProjects a DAO", async function () {
                const [user, project] = await Promise.all([
                    this.User.create(),
                    this.Project.create()
                ]);
                await user.addProject(project, { through: { status: "active", data: 42 } });
                const projects = await user.getProjects();
                {
                    const project = projects[0];
                    expect(project.UserProjects).to.be.ok;
                    expect(project.status).not.to.exist;
                    expect(project.UserProjects.status).to.equal("active");
                    expect(project.UserProjects.data).to.equal(42);
                }
            });

            it("should be able to limit the join table attributes returned", async function () {
                const [user, project] = await Promise.all([
                    this.User.create(),
                    this.Project.create()
                ]);
                await user.addProject(project, { through: { status: "active", data: 42 } });
                const projects = await user.getProjects({ joinTableAttributes: ["status"] });
                {
                    const project = projects[0];

                    expect(project.UserProjects).to.be.ok;
                    expect(project.status).not.to.exist;
                    expect(project.UserProjects.status).to.equal("active");
                    expect(project.UserProjects.data).not.to.exist;
                }
            });
        });

        describe("inserting in join table", () => {
            describe("add", () => {
                it("should insert data provided on the object into the join table", async function () {
                    const [u, p] = await Promise.all([
                        this.User.create(),
                        this.Project.create()
                    ]);
                    p.UserProjects = { status: "active" };
                    await u.addProject(p);
                    const up = await this.UserProjects.find({ where: { UserId: u.id, ProjectId: p.id } });
                    expect(up.status).to.equal("active");
                });

                it("should insert data provided as a second argument into the join table", async function () {
                    const [u, p] = await Promise.all([
                        this.User.create(),
                        this.Project.create()
                    ]);
                    await u.addProject(p, { through: { status: "active" } });
                    const up = await this.UserProjects.findOne({ where: { UserId: u.id, ProjectId: p.id } });
                    expect(up.status).to.equal("active");
                });

                it("should be able to add twice (second call result in UPDATE call) without any attributes (and timestamps off) on the through model", async function () {
                    const Worker = this.sequelize.define("Worker", {}, { timestamps: false });
                    const Task = this.sequelize.define("Task", {}, { timestamps: false });
                    const WorkerTasks = this.sequelize.define("WorkerTasks", {}, { timestamps: false });

                    Worker.belongsToMany(Task, { through: WorkerTasks });
                    Task.belongsToMany(Worker, { through: WorkerTasks });

                    await this.sequelize.sync({ force: true });
                    const worker = await Worker.create({ id: 1337 });
                    const task = await Task.create({ id: 7331 });
                    await worker.addTask(task);
                    await worker.addTask(task);
                });

                it("should be able to add twice (second call result in UPDATE call) with custom primary keys and without any attributes (and timestamps off) on the through model", async function () {
                    const Worker = this.sequelize.define("Worker", {
                        id: {
                            type: type.INTEGER,
                            allowNull: false,
                            primaryKey: true,
                            autoIncrement: true
                        }
                    }, { timestamps: false });
                    const Task = this.sequelize.define("Task", {
                        id: {
                            type: type.INTEGER,
                            allowNull: false,
                            primaryKey: true,
                            autoIncrement: true
                        }
                    }, { timestamps: false });
                    const WorkerTasks = this.sequelize.define("WorkerTasks", {
                        id: {
                            type: type.INTEGER,
                            allowNull: false,
                            primaryKey: true,
                            autoIncrement: true
                        }
                    }, { timestamps: false });

                    Worker.belongsToMany(Task, { through: WorkerTasks });
                    Task.belongsToMany(Worker, { through: WorkerTasks });

                    await this.sequelize.sync({ force: true });
                    const worker = await Worker.create({ id: 1337 });
                    const task = await Task.create({ id: 7331 });
                    await worker.addTask(task);
                    await worker.addTask(task);
                });
            });

            describe("set", () => {
                it("should be able to combine properties on the associated objects, and default values", async function () {
                    const self = this;

                    const [user, [p1, p2]] = await Promise.all([
                        this.User.create(),
                        this.Project.bulkCreate([{}, {}]).then(() => {
                            return self.Project.findAll();
                        })
                    ]);
                    p1.UserProjects = { status: "inactive" };

                    await user.setProjects([p1, p2], { through: { status: "active" } });
                    const [up1, up2] = await Promise.all([
                        self.UserProjects.findOne({ where: { UserId: user.id, ProjectId: p1.id } }),
                        self.UserProjects.findOne({ where: { UserId: user.id, ProjectId: p2.id } })
                    ]);
                    expect(up1.status).to.equal("inactive");
                    expect(up2.status).to.equal("active");
                });

                it("should be able to set twice (second call result in UPDATE calls) without any attributes (and timestamps off) on the through model", async function () {
                    const Worker = this.sequelize.define("Worker", {}, { timestamps: false });
                    const Task = this.sequelize.define("Task", {}, { timestamps: false });
                    const WorkerTasks = this.sequelize.define("WorkerTasks", {}, { timestamps: false });

                    Worker.belongsToMany(Task, { through: WorkerTasks });
                    Task.belongsToMany(Worker, { through: WorkerTasks });

                    await this.sequelize.sync({ force: true });
                    const [worker, tasks] = await Promise.all([
                        Worker.create(),
                        Task.bulkCreate([{}, {}]).then(() => {
                            return Task.findAll();
                        })
                    ]);
                    await worker.setTasks(tasks);
                    await worker.setTasks(tasks);
                });
            });

            describe("query with through.where", () => {
                it("should support query the through model", async function () {
                    const user = await this.User.create();
                    await Promise.all([
                        user.createProject({}, { through: { status: "active", data: 1 } }),
                        user.createProject({}, { through: { status: "inactive", data: 2 } }),
                        user.createProject({}, { through: { status: "inactive", data: 3 } })
                    ]);
                    const [activeProjects, inactiveProjectCount] = await Promise.all([
                        user.getProjects({ through: { where: { status: "active" } } }),
                        user.countProjects({ through: { where: { status: "inactive" } } })
                    ]);
                    expect(activeProjects).to.have.lengthOf(1);
                    expect(inactiveProjectCount).to.eql(2);
                });
            });
        });

        describe("removing from the join table", () => {
            it("should remove a single entry without any attributes (and timestamps off) on the through model", async function () {
                const Worker = this.sequelize.define("Worker", {}, { timestamps: false });
                const Task = this.sequelize.define("Task", {}, { timestamps: false });
                const WorkerTasks = this.sequelize.define("WorkerTasks", {}, { timestamps: false });

                Worker.belongsToMany(Task, { through: WorkerTasks });
                Task.belongsToMany(Worker, { through: WorkerTasks });

                // Test setup
                await this.sequelize.sync({ force: true });
                const [worker, tasks] = await Promise.all([
                    Worker.create({}),
                    Task.bulkCreate([{}, {}, {}]).then(() => {
                        return Task.findAll();
                    })
                ]);
                // Set all tasks, then remove one task by instance, then remove one task by id, then return all tasks
                await worker.setTasks(tasks);
                await worker.removeTask(tasks[0]);
                await worker.removeTask(tasks[1].id);
                {
                    const tasks = await worker.getTasks();
                    expect(tasks.length).to.equal(1);
                }
            });

            it("should remove multiple entries without any attributes (and timestamps off) on the through model", async function () {
                const Worker = this.sequelize.define("Worker", {}, { timestamps: false });
                const Task = this.sequelize.define("Task", {}, { timestamps: false });
                const WorkerTasks = this.sequelize.define("WorkerTasks", {}, { timestamps: false });

                Worker.belongsToMany(Task, { through: WorkerTasks });
                Task.belongsToMany(Worker, { through: WorkerTasks });

                // Test setup
                await this.sequelize.sync({ force: true });
                const [worker, tasks] = await Promise.all([
                    Worker.create({}),
                    Task.bulkCreate([{}, {}, {}, {}, {}]).then(() => {
                        return Task.findAll();
                    })
                ]);
                // Set all tasks, then remove two tasks by instance, then remove two tasks by id, then return all tasks
                await worker.setTasks(tasks);
                await worker.removeTasks([tasks[0], tasks[1]]);
                await worker.removeTasks([tasks[2].id, tasks[3].id]);
                {
                    const tasks = await worker.getTasks();
                    expect(tasks.length).to.equal(1);
                }
            });
        });
    });

    describe("belongsTo and hasMany at once", () => {
        beforeEach(function () {
            this.A = this.sequelize.define("a", { name: type.STRING });
            this.B = this.sequelize.define("b", { name: type.STRING });
        });

        describe("source belongs to target", () => {
            beforeEach(function () {
                this.A.belongsTo(this.B, { as: "relation1" });
                this.A.belongsToMany(this.B, { as: "relation2", through: "AB" });
                this.B.belongsToMany(this.A, { as: "relation2", through: "AB" });

                return this.sequelize.sync({ force: true });
            });

            it("correctly uses bId in A", function () {
                const self = this;

                const a1 = this.A.build({ name: "a1" }),
                    b1 = this.B.build({ name: "b1" });

                return a1
                    .save()
                    .then(() => {
                        return b1.save();
                    })
                    .then(() => {
                        return a1.setRelation1(b1);
                    })
                    .then(() => {
                        return self.A.findOne({ where: { name: "a1" } });
                    })
                    .then((a) => {
                        expect(a.relation1Id).to.be.eq(b1.id);
                    });
            });
        });

        describe("target belongs to source", () => {
            beforeEach(function () {
                this.B.belongsTo(this.A, { as: "relation1" });
                this.A.belongsToMany(this.B, { as: "relation2", through: "AB" });
                this.B.belongsToMany(this.A, { as: "relation2", through: "AB" });

                return this.sequelize.sync({ force: true });
            });

            it("correctly uses bId in A", function () {
                const self = this;

                const a1 = this.A.build({ name: "a1" }),
                    b1 = this.B.build({ name: "b1" });

                return a1
                    .save()
                    .then(() => {
                        return b1.save();
                    })
                    .then(() => {
                        return b1.setRelation1(a1);
                    })
                    .then(() => {
                        return self.B.findOne({ where: { name: "b1" } });
                    })
                    .then((b) => {
                        expect(b.relation1Id).to.be.eq(a1.id);
                    });
            });
        });
    });

    describe("alias", () => {
        it("creates the join table when through is a string", function () {
            const self = this,
                User = this.sequelize.define("User", {}),
                Group = this.sequelize.define("Group", {});

            User.belongsToMany(Group, { as: "MyGroups", through: "group_user" });
            Group.belongsToMany(User, { as: "MyUsers", through: "group_user" });

            return this.sequelize.sync({ force: true }).then(() => {
                return self.sequelize.getQueryInterface().showAllTables();
            }).then((result) => {
                if (dialect === "mssql" /* current.dialect.supports.schemas */) {
                    result = _.map(result, "tableName");
                }

                expect(result.indexOf("group_user")).not.to.equal(-1);
            });
        });

        it("creates the join table when through is a model", function () {
            const self = this,
                User = this.sequelize.define("User", {}),
                Group = this.sequelize.define("Group", {}),
                UserGroup = this.sequelize.define("GroupUser", {}, { tableName: "user_groups" });

            User.belongsToMany(Group, { as: "MyGroups", through: UserGroup });
            Group.belongsToMany(User, { as: "MyUsers", through: UserGroup });

            return this.sequelize.sync({ force: true }).then(() => {
                return self.sequelize.getQueryInterface().showAllTables();
            }).then((result) => {
                if (dialect === "mssql" /* current.dialect.supports.schemas */) {
                    result = _.map(result, "tableName");
                }

                expect(result.indexOf("user_groups")).not.to.equal(-1);
            });
        });

        it("correctly identifies its counterpart when through is a string", function () {
            const User = this.sequelize.define("User", {}),
                Group = this.sequelize.define("Group", {});

            User.belongsToMany(Group, { as: "MyGroups", through: "group_user" });
            Group.belongsToMany(User, { as: "MyUsers", through: "group_user" });

            expect(Group.associations.MyUsers.through.model === User.associations.MyGroups.through.model);
            expect(Group.associations.MyUsers.through.model.rawAttributes.UserId).to.exist;
            expect(Group.associations.MyUsers.through.model.rawAttributes.GroupId).to.exist;
        });

        it("correctly identifies its counterpart when through is a model", function () {
            const User = this.sequelize.define("User", {}),
                Group = this.sequelize.define("Group", {}),
                UserGroup = this.sequelize.define("GroupUser", {}, { tableName: "user_groups" });

            User.belongsToMany(Group, { as: "MyGroups", through: UserGroup });
            Group.belongsToMany(User, { as: "MyUsers", through: UserGroup });

            expect(Group.associations.MyUsers.through.model === User.associations.MyGroups.through.model);

            expect(Group.associations.MyUsers.through.model.rawAttributes.UserId).to.exist;
            expect(Group.associations.MyUsers.through.model.rawAttributes.GroupId).to.exist;
        });
    });

    describe("multiple hasMany", () => {
        beforeEach(function () {
            this.User = this.sequelize.define("user", { name: type.STRING });
            this.Project = this.sequelize.define("project", { projectName: type.STRING });
        });

        describe("project has owners and users and owners and users have projects", () => {
            beforeEach(function () {
                this.Project.belongsToMany(this.User, { as: "owners", through: "projectOwners" });
                this.Project.belongsToMany(this.User, { as: "users", through: "projectUsers" });

                this.User.belongsToMany(this.Project, { as: "ownedProjects", through: "projectOwners" });
                this.User.belongsToMany(this.Project, { as: "memberProjects", through: "projectUsers" });

                return this.sequelize.sync({ force: true });
            });

            it("correctly sets user and owner", function () {
                const p1 = this.Project.build({ projectName: "p1" }),
                    u1 = this.User.build({ name: "u1" }),
                    u2 = this.User.build({ name: "u2" });

                return p1
                    .save()
                    .then(() => {
                        return u1.save();
                    })
                    .then(() => {
                        return u2.save();
                    })
                    .then(() => {
                        return p1.setUsers([u1]);
                    })
                    .then(() => {
                        return p1.setOwners([u2]);
                    });
            });
        });
    });

    describe("Foreign key constraints", () => {
        beforeEach(function () {
            this.Task = this.sequelize.define("task", { title: type.STRING });
            this.User = this.sequelize.define("user", { username: type.STRING });
            this.UserTasks = this.sequelize.define("tasksusers", { userId: type.INTEGER, taskId: type.INTEGER });
        });

        it("can cascade deletes both ways by default", async function () {
            const self = this;

            this.User.belongsToMany(this.Task, { through: "tasksusers" });
            this.Task.belongsToMany(this.User, { through: "tasksusers" });

            await this.sequelize.sync({ force: true });
            const [user1, task1, user2, task2] = await Promise.all([
                self.User.create({ id: 67, username: "foo" }),
                self.Task.create({ id: 52, title: "task" }),
                self.User.create({ id: 89, username: "bar" }),
                self.Task.create({ id: 42, title: "kast" })
            ]);
            await Promise.all([
                user1.setTasks([task1]),
                task2.setUsers([user2])
            ]);
            await Promise.all([
                user1.destroy(),
                task2.destroy()
            ]);
            const [tu1, tu2] = await Promise.all([
                self.sequelize.model("tasksusers").findAll({ where: { userId: user1.id } }),
                self.sequelize.model("tasksusers").findAll({ where: { taskId: task2.id } }),
                self.User.findOne({
                    where: self.sequelize.or({ username: "Franz Joseph" }),
                    include: [{
                        model: self.Task,
                        where: {
                            title: {
                                $ne: "task"
                            }
                        }
                    }]
                })
            ]);
            expect(tu1).to.have.length(0);
            expect(tu2).to.have.length(0);
        });

        if (current.dialect.supports.constraints.restrict) {
            it("can restrict deletes both ways", async function () {
                const self = this;

                this.User.belongsToMany(this.Task, { onDelete: "RESTRICT", through: "tasksusers" });
                this.Task.belongsToMany(this.User, { onDelete: "RESTRICT", through: "tasksusers" });

                await this.sequelize.sync({ force: true });
                const [user1, task1, user2, task2] = await Promise.all([
                    self.User.create({ id: 67, username: "foo" }),
                    self.Task.create({ id: 52, title: "task" }),
                    self.User.create({ id: 89, username: "bar" }),
                    self.Task.create({ id: 42, title: "kast" })
                ]);
                await Promise.all([
                    user1.setTasks([task1]),
                    task2.setUsers([user2])
                ]);

                await assert.throws(async () => {
                    await user1.destroy();
                }, self.sequelize.ForeignKeyConstraintError);

                await assert.throws(async () => {
                    await task2.destroy();
                }, self.sequelize.ForeignKeyConstraintError);
            });

            it("can cascade and restrict deletes", async function () {
                const self = this;

                self.User.belongsToMany(self.Task, { onDelete: "RESTRICT", through: "tasksusers" });
                self.Task.belongsToMany(self.User, { onDelete: "CASCADE", through: "tasksusers" });

                await this.sequelize.sync({ force: true });
                const [user1, task1, user2, task2] = await Promise.all([
                    self.User.create({ id: 67, username: "foo" }),
                    self.Task.create({ id: 52, title: "task" }),
                    self.User.create({ id: 89, username: "bar" }),
                    self.Task.create({ id: 42, title: "kast" })
                ]);
                await Promise.all([
                    user1.setTasks([task1]),
                    task2.setUsers([user2])
                ]);

                await assert.throws(async () => {
                    await user1.destroy();
                }, self.sequelize.ForeignKeyConstraintError);

                await task2.destroy();

                const usertasks = await self.sequelize.model("tasksusers").findAll({ where: { taskId: task2.id } });
                // This should not exist because deletes cascade
                expect(usertasks).to.have.length(0);
            });

        }

        it("should be possible to remove all constraints", async function () {
            const self = this;

            this.User.belongsToMany(this.Task, { constraints: false, through: "tasksusers" });
            this.Task.belongsToMany(this.User, { constraints: false, through: "tasksusers" });

            await this.sequelize.sync({ force: true });
            const [user1, task1, user2, task2] = await Promise.all([
                self.User.create({ id: 67, username: "foo" }),
                self.Task.create({ id: 52, title: "task" }),
                self.User.create({ id: 89, username: "bar" }),
                self.Task.create({ id: 42, title: "kast" })
            ]);
            await Promise.all([
                user1.setTasks([task1]),
                task2.setUsers([user2])
            ]);
            await Promise.all([
                user1.destroy(),
                task2.destroy()
            ]);
            const [ut1, ut2] = await Promise.all([
                self.sequelize.model("tasksusers").findAll({ where: { userId: user1.id } }),
                self.sequelize.model("tasksusers").findAll({ where: { taskId: task2.id } })
            ]);
            expect(ut1).to.have.length(1);
            expect(ut2).to.have.length(1);
        });
    });

    describe("Association options", () => {
        describe("allows the user to provide an attribute definition object as foreignKey", () => {
            it("works when taking a column directly from the object", function () {
                const Project = this.sequelize.define("project", {});
                const User = this.sequelize.define("user", {
                    uid: {
                        type: type.INTEGER,
                        primaryKey: true
                    }
                });

                const UserProjects = User.belongsToMany(Project, { foreignKey: { name: "user_id", defaultValue: 42 }, through: "UserProjects" });
                expect(UserProjects.through.model.rawAttributes.user_id).to.be.ok;
                expect(UserProjects.through.model.rawAttributes.user_id.references.model).to.equal(User.getTableName());
                expect(UserProjects.through.model.rawAttributes.user_id.references.key).to.equal("uid");
                expect(UserProjects.through.model.rawAttributes.user_id.defaultValue).to.equal(42);
            });
        });

        it("should throw an error if foreignKey and as result in a name clash", function () {
            const User = this.sequelize.define("user", {
                user: type.INTEGER
            });

            expect(User.belongsToMany.bind(User, User, { as: "user", through: "UserUser" })).to
                .throw("Naming collision between attribute 'user' and association 'user' on model user. To remedy this, change either foreignKey or as in your association definition");
        });
    });

    describe("selfAssociations", () => {
        it("should work with self reference", function () {
            const User = this.sequelize.define("User", {
                name: new type.STRING(100)
            });
            const Follow = this.sequelize.define("Follow");
            const self = this;

            User.belongsToMany(User, { through: Follow, as: "User" });
            User.belongsToMany(User, { through: Follow, as: "Fan" });

            return this.sequelize.sync({ force: true })
                .then(() => {
                    return Promise.all([
                        User.create({ name: "Khsama" }),
                        User.create({ name: "Vivek" }),
                        User.create({ name: "Satya" })
                    ]);
                })
                .then((users) => {
                    return Promise.all([
                        users[0].addFan(users[1]),
                        users[1].addUser(users[2]),
                        users[2].addFan(users[0])
                    ]);
                });
        });

        it("should work with custom self reference", function () {
            const User = this.sequelize.define("User", {
                name: new type.STRING(100)
            });
            const UserFollowers = this.sequelize.define("UserFollower");
            const self = this;

            User.belongsToMany(User, {
                as: {
                    singular: "Follower",
                    plural: "Followers"
                },
                through: UserFollowers
            });

            User.belongsToMany(User, {
                as: {
                    singular: "Invitee",
                    plural: "Invitees"
                },
                foreignKey: "InviteeId",
                through: "Invites"
            });

            return this.sequelize.sync({ force: true })
                .then(() => {
                    return Promise.all([
                        User.create({ name: "Jalrangi" }),
                        User.create({ name: "Sargrahi" })
                    ]);
                })
                .then((users) => {
                    return Promise.all([
                        users[0].addFollower(users[1]),
                        users[1].addFollower(users[0]),
                        users[0].addInvitee(users[1]),
                        users[1].addInvitee(users[0])
                    ]);
                });
        });

        it("should setup correct foreign keys", function () {
            /* camcelCase */
            let Person = this.sequelize.define("Person"),
                PersonChildren = this.sequelize.define("PersonChildren"),
                Children;

            Children = Person.belongsToMany(Person, { as: "Children", through: PersonChildren });

            expect(Children.foreignKey).to.equal("PersonId");
            expect(Children.otherKey).to.equal("ChildId");
            expect(PersonChildren.rawAttributes[Children.foreignKey]).to.be.ok;
            expect(PersonChildren.rawAttributes[Children.otherKey]).to.be.ok;

            /* underscored */
            Person = this.sequelize.define("Person", {}, { underscored: true });
            PersonChildren = this.sequelize.define("PersonChildren", {}, { underscored: true });
            Children = Person.belongsToMany(Person, { as: "Children", through: PersonChildren });

            expect(Children.foreignKey).to.equal("person_id");
            expect(Children.otherKey).to.equal("child_id");
            expect(PersonChildren.rawAttributes[Children.foreignKey]).to.be.ok;
            expect(PersonChildren.rawAttributes[Children.otherKey]).to.be.ok;
        });
    });
});
