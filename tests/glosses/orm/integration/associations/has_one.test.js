describe("hasOne", function () {
    const { orm } = adone;
    const { type } = orm;
    const current = this.sequelize;

    describe("Model.associations", () => {
        it("should store all assocations when associting to the same table multiple times", function () {
            const User = this.sequelize.define("User", {});
            const Group = this.sequelize.define("Group", {});

            Group.hasOne(User);
            Group.hasOne(User, { foreignKey: "primaryGroupId", as: "primaryUsers" });
            Group.hasOne(User, { foreignKey: "secondaryGroupId", as: "secondaryUsers" });

            expect(Object.keys(Group.associations)).to.deep.equal(["User", "primaryUsers", "secondaryUsers"]);
        });
    });

    describe("get", () => {
        describe("multiple", () => {
            it("should fetch associations for multiple instances", function () {
                const User = this.sequelize.define("User", {});
                const Player = this.sequelize.define("Player", {});

                Player.User = Player.hasOne(User, { as: "user" });

                return this.sequelize.sync({ force: true }).then(() => {
                    return Promise.all([
                        Player.create({
                            id: 1,
                            user: {}
                        }, {
                            include: [Player.User]
                        }),
                        Player.create({
                            id: 2,
                            user: {}
                        }, {
                            include: [Player.User]
                        }),
                        Player.create({
                            id: 3
                        })
                    ]);
                }).then((players) => {
                    return Player.User.get(players).then((result) => {
                        expect(result[players[0].id].id).to.equal(players[0].user.id);
                        expect(result[players[1].id].id).to.equal(players[1].user.id);
                        expect(result[players[2].id]).to.equal(null);
                    });
                });
            });
        });
    });


    describe("getAssocation", () => {
        if (current.dialect.supports.transactions) {
            it("supports transactions", function () {
                return this.prepareTransactionTest(this.sequelize).then((sequelize) => {
                    const User = sequelize.define("User", { username: type.STRING });
                    const Group = sequelize.define("Group", { name: type.STRING });

                    Group.hasOne(User);

                    return sequelize.sync({ force: true }).then(() => {
                        return User.create({ username: "foo" }).then((fakeUser) => {
                            return User.create({ username: "foo" }).then((user) => {
                                return Group.create({ name: "bar" }).then((group) => {
                                    return sequelize.transaction().then((t) => {
                                        return group.setUser(user, { transaction: t }).then(() => {
                                            return Group.all().then((groups) => {
                                                return groups[0].getUser().then((associatedUser) => {
                                                    expect(associatedUser).to.be.null();
                                                    return Group.all({ transaction: t }).then((groups) => {
                                                        return groups[0].getUser({ transaction: t }).then((associatedUser) => {
                                                            expect(associatedUser).not.to.be.null();
                                                            expect(associatedUser.id).to.equal(user.id);
                                                            expect(associatedUser.id).not.to.equal(fakeUser.id);
                                                            return t.rollback();
                                                        });
                                                    });
                                                });
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        }

        it("should be able to handle a where object that's a first class citizen.", function () {
            const User = this.sequelize.define("UserXYZ", { username: type.STRING });
            const Task = this.sequelize.define("TaskXYZ", { title: type.STRING, status: type.STRING });

            User.hasOne(Task);

            return User.sync({ force: true }).then(() => {
                return Task.sync({ force: true }).then(() => {
                    return User.create({ username: "foo" }).then((user) => {
                        return Task.create({ title: "task", status: "inactive" }).then((task) => {
                            return user.setTaskXYZ(task).then(() => {
                                return user.getTaskXYZ({ where: { status: "active" } }).then((task) => {
                                    expect(task).to.be.null();
                                });
                            });
                        });
                    });
                });
            });
        });
    });

    describe("setAssociation", () => {
        if (current.dialect.supports.transactions) {
            it("supports transactions", function () {
                return this.prepareTransactionTest(this.sequelize).then((sequelize) => {
                    const User = sequelize.define("User", { username: type.STRING });
                    const Group = sequelize.define("Group", { name: type.STRING });

                    Group.hasOne(User);

                    return sequelize.sync({ force: true }).then(() => {
                        return User.create({ username: "foo" }).then((user) => {
                            return Group.create({ name: "bar" }).then((group) => {
                                return sequelize.transaction().then((t) => {
                                    return group.setUser(user, { transaction: t }).then(() => {
                                        return Group.all().then((groups) => {
                                            return groups[0].getUser().then((associatedUser) => {
                                                expect(associatedUser).to.be.null();
                                                return t.rollback();
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        }

        it("can set an association with predefined primary keys", function () {
            const User = this.sequelize.define("UserXYZZ", { userCoolIdTag: { type: type.INTEGER, primaryKey: true }, username: type.STRING });
            const Task = this.sequelize.define("TaskXYZZ", { taskOrSomething: { type: type.INTEGER, primaryKey: true }, title: type.STRING });

            User.hasOne(Task, { foreignKey: "userCoolIdTag" });

            return User.sync({ force: true }).then(() => {
                return Task.sync({ force: true }).then(() => {
                    return User.create({ userCoolIdTag: 1, username: "foo" }).then((user) => {
                        return Task.create({ taskOrSomething: 1, title: "bar" }).then((task) => {
                            return user.setTaskXYZZ(task).then(() => {
                                return user.getTaskXYZZ().then((task) => {
                                    expect(task).not.to.be.null();

                                    return user.setTaskXYZZ(null).then(() => {
                                        return user.getTaskXYZZ().then((_task) => {
                                            expect(_task).to.be.null();
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });

        it("clears the association if null is passed", function () {
            const User = this.sequelize.define("UserXYZ", { username: type.STRING });
            const Task = this.sequelize.define("TaskXYZ", { title: type.STRING });

            User.hasOne(Task);

            return User.sync({ force: true }).then(() => {
                return Task.sync({ force: true }).then(() => {
                    return User.create({ username: "foo" }).then((user) => {
                        return Task.create({ title: "task" }).then((task) => {
                            return user.setTaskXYZ(task).then(() => {
                                return user.getTaskXYZ().then((task) => {
                                    expect(task).not.to.equal(null);

                                    return user.setTaskXYZ(null).then(() => {
                                        return user.getTaskXYZ().then((task) => {
                                            expect(task).to.equal(null);
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });

        it("should throw a ForeignKeyConstraintError if the associated record does not exist", async function () {
            const User = this.sequelize.define("UserXYZ", { username: type.STRING });
            const Task = this.sequelize.define("TaskXYZ", { title: type.STRING });

            User.hasOne(Task);

            await User.sync({ force: true });
            await Task.sync({ force: true });

            await assert.throws(async () => {
                await Task.create({ title: "task", UserXYZId: 5 });
            }, orm.exception.ForeignKeyConstraintError);

            const task = await Task.create({ title: "task" });

            await assert.throws(async () => {
                await Task.update({ title: "taskUpdate", UserXYZId: 5 }, { where: { id: task.id } });
            }, orm.exception.ForeignKeyConstraintError);
        });

        it("supports passing the primary key instead of an object", function () {
            const User = this.sequelize.define("UserXYZ", { username: type.STRING });
            const Task = this.sequelize.define("TaskXYZ", { title: type.STRING });

            User.hasOne(Task);

            return this.sequelize.sync({ force: true }).then(() => {
                return User.create({}).then((user) => {
                    return Task.create({ id: 19, title: "task it!" }).then((task) => {
                        return user.setTaskXYZ(task.id).then(() => {
                            return user.getTaskXYZ().then((task) => {
                                expect(task.title).to.equal("task it!");
                            });
                        });
                    });
                });
            });
        });

        it("supports updating with a primary key instead of an object", async function () {
            const User = this.sequelize.define("UserXYZ", { username: type.STRING });
            const Task = this.sequelize.define("TaskXYZ", { title: type.STRING });

            User.hasOne(Task);

            await this.sequelize.sync({ force: true });
            const [user, task] = await Promise.all([
                User.create({ id: 1, username: "foo" }),
                Task.create({ id: 20, title: "bar" })
            ]);
            await user.setTaskXYZ(task.id);
            {
                const task = await user.getTaskXYZ();
                expect(task).not.to.be.null();
                expect(task.id).to.be.equal(20);
            }
            const task2 = await Task.create({ id: 2, title: "bar2" });
            await user.setTaskXYZ(task2.id);
            {
                const task = await user.getTaskXYZ();
                expect(task).not.to.be.null();
                expect(task.id).to.be.equal(2);
            }
        });

        it("supports setting same association twice", async function () {
            const Home = this.sequelize.define("home", {});
            const User = this.sequelize.define("user");

            User.hasOne(Home);

            await this.sequelize.sync({ force: true });
            const [home, user] = await Promise.all([
                Home.create(),
                User.create()
            ]);
            await user.setHome(home);
            await user.setHome(home);
            expect(await user.getHome()).to.have.property("id", home.get("id"));
        });
    });

    describe("createAssociation", () => {
        it("creates an associated model instance", function () {
            const User = this.sequelize.define("User", { username: type.STRING });
            const Task = this.sequelize.define("Task", { title: type.STRING });

            User.hasOne(Task);

            return this.sequelize.sync({ force: true }).then(() => {
                return User.create({ username: "bob" }).then((user) => {
                    return user.createTask({ title: "task" }).then(() => {
                        return user.getTask().then((task) => {
                            expect(task).not.to.be.null();
                            expect(task.title).to.equal("task");
                        });
                    });
                });
            });
        });

        if (current.dialect.supports.transactions) {
            it("supports transactions", function () {
                return this.prepareTransactionTest(this.sequelize).then((sequelize) => {
                    const User = sequelize.define("User", { username: type.STRING });
                    const Group = sequelize.define("Group", { name: type.STRING });

                    User.hasOne(Group);

                    return sequelize.sync({ force: true }).then(() => {
                        return User.create({ username: "bob" }).then((user) => {
                            return sequelize.transaction().then((t) => {
                                return user.createGroup({ name: "testgroup" }, { transaction: t }).then(() => {
                                    return User.all().then((users) => {
                                        return users[0].getGroup().then((group) => {
                                            expect(group).to.be.null();
                                            return User.all({ transaction: t }).then((users) => {
                                                return users[0].getGroup({ transaction: t }).then((group) => {
                                                    expect(group).to.be.not.null;
                                                    return t.rollback();
                                                });
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        }

    });

    describe("foreign key", () => {
        it("should lowercase foreign keys when using underscored", function () {
            const User = this.sequelize.define("User", { username: type.STRING }, { underscored: true });
            const Account = this.sequelize.define("Account", { name: type.STRING }, { underscored: true });

            Account.hasOne(User);

            expect(User.rawAttributes.account_id).to.exist();
        });

        it("should use model name when using camelcase", function () {
            const User = this.sequelize.define("User", { username: type.STRING }, { underscored: false });
            const Account = this.sequelize.define("Account", { name: type.STRING }, { underscored: false });

            Account.hasOne(User);

            expect(User.rawAttributes.AccountId).to.exist();
        });

        it("should support specifying the field of a foreign key", async function () {
            const User = this.sequelize.define("UserXYZ", { username: type.STRING, gender: type.STRING });
            const Task = this.sequelize.define("TaskXYZ", { title: type.STRING, status: type.STRING });

            Task.hasOne(User, {
                foreignKey: {
                    name: "taskId",
                    field: "task_id"
                }
            });

            expect(User.rawAttributes.taskId).to.exist();
            expect(User.rawAttributes.taskId.field).to.equal("task_id");
            await Task.sync({ force: true });
            // Can't use Promise.all cause of foreign key references
            await User.sync({ force: true });
            const [user, task] = await Promise.all([
                User.create({ username: "foo", gender: "male" }),
                Task.create({ title: "task", status: "inactive" })
            ]);
            await task.setUserXYZ(user);
            {
                const user = await task.getUserXYZ();
                // the sql query should correctly look at task_id instead of taskId
                expect(user).to.not.be.null();
            }
            {
                const task = await Task.findOne({
                    where: { title: "task" },
                    include: [User]
                });
                expect(task.UserXYZ).to.exist();
            }
        });
    });

    describe("foreign key constraints", () => {
        it("are enabled by default", function () {
            const Task = this.sequelize.define("Task", { title: type.STRING });
            const User = this.sequelize.define("User", { username: type.STRING });

            User.hasOne(Task); // defaults to set NULL

            return User.sync({ force: true }).then(() => {
                return Task.sync({ force: true }).then(() => {
                    return User.create({ username: "foo" }).then((user) => {
                        return Task.create({ title: "task" }).then((task) => {
                            return user.setTask(task).then(() => {
                                return user.destroy().then(() => {
                                    return task.reload().then(() => {
                                        expect(task.UserId).to.equal(null);
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });

        it("sets to CASCADE if allowNull: false", function () {
            const Task = this.sequelize.define("Task", { title: type.STRING });
            const User = this.sequelize.define("User", { username: type.STRING });

            User.hasOne(Task, { foreignKey: { allowNull: false } }); // defaults to CASCADE

            return this.sequelize.sync({ force: true }).then(() => {
                return User.create({ username: "foo" }).then((user) => {
                    return Task.create({ title: "task", UserId: user.id }).then(() => {
                        return user.destroy().then(() => {
                            return Task.findAll();
                        });
                    });
                }).then((tasks) => {
                    expect(tasks).to.be.empty();
                });
            });
        });

        it("should be possible to disable them", function () {
            const Task = this.sequelize.define("Task", { title: type.STRING });
            const User = this.sequelize.define("User", { username: type.STRING });

            User.hasOne(Task, { constraints: false });

            return User.sync({ force: true }).then(() => {
                return Task.sync({ force: true }).then(() => {
                    return User.create({ username: "foo" }).then((user) => {
                        return Task.create({ title: "task" }).then((task) => {
                            return user.setTask(task).then(() => {
                                return user.destroy().then(() => {
                                    return task.reload().then(() => {
                                        expect(task.UserId).to.equal(user.id);
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });

        it("can cascade deletes", function () {
            const Task = this.sequelize.define("Task", { title: type.STRING });
            const User = this.sequelize.define("User", { username: type.STRING });

            User.hasOne(Task, { onDelete: "cascade" });

            return User.sync({ force: true }).then(() => {
                return Task.sync({ force: true }).then(() => {
                    return User.create({ username: "foo" }).then((user) => {
                        return Task.create({ title: "task" }).then((task) => {
                            return user.setTask(task).then(() => {
                                return user.destroy().then(() => {
                                    return Task.findAll().then((tasks) => {
                                        expect(tasks).to.have.length(0);
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });

        it('works when cascading a delete with hooks but there is no associate (i.e. "has zero")', function () {
            const Task = this.sequelize.define("Task", { title: type.STRING });
            const User = this.sequelize.define("User", { username: type.STRING });

            User.hasOne(Task, { onDelete: "cascade", hooks: true });

            return User.sync({ force: true }).then(() => {
                return Task.sync({ force: true }).then(() => {
                    return User.create({ username: "foo" }).then((user) => {
                        return user.destroy();
                    });
                });
            });
        });

        // NOTE: mssql does not support changing an autoincrement primary key
        if (this.getTestDialect() !== "mssql") {
            it("can cascade updates", function () {
                const Task = this.sequelize.define("Task", { title: type.STRING });
                const User = this.sequelize.define("User", { username: type.STRING });

                User.hasOne(Task, { onUpdate: "cascade" });

                return User.sync({ force: true }).then(() => {
                    return Task.sync({ force: true }).then(() => {
                        return User.create({ username: "foo" }).then((user) => {
                            return Task.create({ title: "task" }).then((task) => {
                                return user.setTask(task).then(() => {

                                    // Changing the id of a DAO requires a little dance since
                                    // the `UPDATE` query generated by `save()` uses `id` in the
                                    // `WHERE` clause

                                    const tableName = user.sequelize.getQueryInterface().QueryGenerator.addSchema(user.constructor);
                                    return user.sequelize.getQueryInterface().update(user, tableName, { id: 999 }, { id: user.id }).then(() => {
                                        return Task.findAll().then((tasks) => {
                                            expect(tasks).to.have.length(1);
                                            expect(tasks[0].UserId).to.equal(999);
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        }

        if (current.dialect.supports.constraints.restrict) {

            it("can restrict deletes", async function () {
                const Task = this.sequelize.define("Task", { title: type.STRING });
                const User = this.sequelize.define("User", { username: type.STRING });

                User.hasOne(Task, { onDelete: "restrict" });

                await User.sync({ force: true });
                await Task.sync({ force: true });
                const user = await User.create({ username: "foo" });
                const task = await Task.create({ title: "task" });
                await user.setTask(task);

                await assert.throws(async () => {
                    await user.destroy();
                }, orm.exception.ForeignKeyConstraintError);
                expect(await Task.findAll()).to.have.length(1);
            });

            it("can restrict updates", async function () {
                const Task = this.sequelize.define("Task", { title: type.STRING });
                const User = this.sequelize.define("User", { username: type.STRING });

                User.hasOne(Task, { onUpdate: "restrict" });

                await User.sync({ force: true });
                await Task.sync({ force: true });
                const user = await User.create({ username: "foo" });
                const task = await Task.create({ title: "task" });
                await user.setTask(task);

                // Changing the id of a DAO requires a little dance since
                // the `UPDATE` query generated by `save()` uses `id` in the
                // `WHERE` clause
                const tableName = user.sequelize.getQueryInterface().QueryGenerator.addSchema(user.constructor);
                await assert.throws(async () => {
                    await user.sequelize.getQueryInterface().update(user, tableName, { id: 999 }, { id: user.id });
                }, orm.exception.ForeignKeyConstraintError);

                expect(await Task.findAll()).to.have.length(1);
            });
        }
    });

    describe("Association column", () => {
        it("has correct type for non-id primary keys with non-integer type", function () {
            const User = this.sequelize.define("UserPKBT", {
                username: {
                    type: type.STRING
                }
            });

            const Group = this.sequelize.define("GroupPKBT", {
                name: {
                    type: type.STRING,
                    primaryKey: true
                }
            });

            Group.hasOne(User);

            return this.sequelize.sync({ force: true }).then(() => {
                expect(User.rawAttributes.GroupPKBTName.type).to.an.instanceof(type.STRING);
            });
        });
    });

    describe("Association options", () => {
        it("can specify data type for autogenerated relational keys", async function () {
            const User = this.sequelize.define("UserXYZ", { username: type.STRING });
            const dataTypes = [type.INTEGER, type.BIGINT, type.STRING];
            const self = this;
            const Tasks = {};

            await Promise.all(dataTypes.map(async (dataType) => {
                const tableName = `TaskXYZ_${dataType.key}`;
                Tasks[dataType] = self.sequelize.define(tableName, { title: type.STRING });

                User.hasOne(Tasks[dataType], { foreignKey: "userId", keyType: dataType, constraints: false });

                await Tasks[dataType].sync({ force: true });
                expect(Tasks[dataType].rawAttributes.userId.type).to.be.an.instanceof(dataType);
            }));
        });

        describe("allows the user to provide an attribute definition object as foreignKey", () => {
            it("works with a column that hasnt been defined before", function () {
                const User = this.sequelize.define("user", {});
                let Profile = this.sequelize.define("project", {});

                User.hasOne(Profile, {
                    foreignKey: {
                        allowNull: false,
                        name: "uid"
                    }
                });

                expect(Profile.rawAttributes.uid).to.be.ok();
                expect(Profile.rawAttributes.uid.references.model).to.equal(User.getTableName());
                expect(Profile.rawAttributes.uid.references.key).to.equal("id");
                expect(Profile.rawAttributes.uid.allowNull).to.be.false();

                // Let's clear it
                Profile = this.sequelize.define("project", {});
                User.hasOne(Profile, {
                    foreignKey: {
                        allowNull: false,
                        name: "uid"
                    }
                });

                expect(Profile.rawAttributes.uid).to.be.ok();
                expect(Profile.rawAttributes.uid.references.model).to.equal(User.getTableName());
                expect(Profile.rawAttributes.uid.references.key).to.equal("id");
                expect(Profile.rawAttributes.uid.allowNull).to.be.false();
            });

            it("works when taking a column directly from the object", function () {
                const User = this.sequelize.define("user", {
                    uid: {
                        type: type.INTEGER,
                        primaryKey: true
                    }
                });
                const Profile = this.sequelize.define("project", {
                    user_id: {
                        type: type.INTEGER,
                        allowNull: false
                    }
                });

                User.hasOne(Profile, { foreignKey: Profile.rawAttributes.user_id });

                expect(Profile.rawAttributes.user_id).to.be.ok();
                expect(Profile.rawAttributes.user_id.references.model).to.equal(User.getTableName());
                expect(Profile.rawAttributes.user_id.references.key).to.equal("uid");
                expect(Profile.rawAttributes.user_id.allowNull).to.be.false();
            });

            it("works when merging with an existing definition", function () {
                const User = this.sequelize.define("user", {
                    uid: {
                        type: type.INTEGER,
                        primaryKey: true
                    }
                });
                const Project = this.sequelize.define("project", {
                    userUid: {
                        type: type.INTEGER,
                        defaultValue: 42
                    }
                });

                User.hasOne(Project, { foreignKey: { allowNull: false } });

                expect(Project.rawAttributes.userUid).to.be.ok();
                expect(Project.rawAttributes.userUid.allowNull).to.be.false();
                expect(Project.rawAttributes.userUid.references.model).to.equal(User.getTableName());
                expect(Project.rawAttributes.userUid.references.key).to.equal("uid");
                expect(Project.rawAttributes.userUid.defaultValue).to.equal(42);
            });
        });

        it("should throw an error if an association clashes with the name of an already define attribute", function () {
            const User = this.sequelize.define("user", {
                attribute: type.STRING
            });
            const Attribute = this.sequelize.define("attribute", {});

            expect(User.hasOne.bind(User, Attribute)).to
                .throw("Naming collision between attribute 'attribute' and association 'attribute' on model user. To remedy this, change either foreignKey or as in your association definition");
        });
    });

    describe("Counter part", () => {
        describe("BelongsTo", () => {
            it("should only generate one foreign key", function () {
                const Orders = this.sequelize.define("Orders", {}, { timestamps: false });
                const InternetOrders = this.sequelize.define("InternetOrders", {}, { timestamps: false });

                InternetOrders.belongsTo(Orders, {
                    foreignKeyConstraint: true
                });
                Orders.hasOne(InternetOrders, {
                    foreignKeyConstraint: true
                });

                expect(Object.keys(InternetOrders.rawAttributes).length).to.equal(2);
                expect(InternetOrders.rawAttributes.OrderId).to.be.ok();
                expect(InternetOrders.rawAttributes.OrdersId).not.to.be.ok();
            });
        });
    });
});
