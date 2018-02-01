describe("Deferrable", function () {
    const { vendor: { lodash: _ } } = adone;
    const { orm } = adone;
    const { type } = orm;
    const config = this.config;

    if (!this.sequelize.dialect.supports.deferrableConstraints) {
        return;
    }
    beforeEach(function () {
        this.run = async function (deferrable, options) {
            options = options || {};

            const taskTableName = options.taskTableName || `tasks_${config.rand()}`;
            const transactionOptions = _.assign({}, { deferrable: orm.Deferrable.SET_DEFERRED }, options);
            const userTableName = `users_${config.rand()}`;

            const User = this.sequelize.define(
                "User", { name: type.STRING }, { tableName: userTableName }
            );

            const Task = this.sequelize.define(
                "Task", {
                    title: type.STRING,
                    user_id: {
                        allowNull: false,
                        type: type.INTEGER,
                        references: {
                            model: userTableName,
                            key: "id",
                            deferrable
                        }
                    }
                }, {
                    tableName: taskTableName
                }
            );

            await User.sync({ force: true });
            await Task.sync({ force: true });
            return this.sequelize.transaction(transactionOptions, async (t) => {
                const task = await Task.create({ title: "a task", user_id: -1 }, { transaction: t });
                const user = await User.create({}, { transaction: t });
                task.user_id = user.id;
                return task.save({ transaction: t });
            });
        };
    });

    describe("NOT", () => {
        it("does not allow the violation of the foreign key constraint", async function () {
            await assert.throws(async () => {
                await this.run(orm.Deferrable.NOT);
            }, orm.exception.ForeignKeyConstraintError);
        });
    });

    describe("INITIALLY_IMMEDIATE", () => {
        it("allows the violation of the foreign key constraint if the transaction is deferred", function () {
            return this
                .run(orm.Deferrable.INITIALLY_IMMEDIATE)
                .then((task) => {
                    expect(task.title).to.equal("a task");
                    expect(task.user_id).to.equal(1);
                });
        });

        it("does not allow the violation of the foreign key constraint if the transaction is not deffered", async function () {
            await assert.throws(async () => {
                await this.run(orm.Deferrable.INITIALLY_IMMEDIATE, {
                    deferrable: undefined
                });
            }, orm.exception.ForeignKeyConstraintError);
        });

        it("allows the violation of the foreign key constraint if the transaction deferres only the foreign key constraint", function () {
            const taskTableName = `tasks_${config.rand()}`;

            return this
                .run(orm.Deferrable.INITIALLY_IMMEDIATE, {
                    deferrable: new orm.Deferrable.SET_DEFERRED([`${taskTableName}_user_id_fkey`]),
                    taskTableName
                })
                .then((task) => {
                    expect(task.title).to.equal("a task");
                    expect(task.user_id).to.equal(1);
                });
        });
    });

    describe("INITIALLY_DEFERRED", () => {
        it("allows the violation of the foreign key constraint", function () {
            return this
                .run(orm.Deferrable.INITIALLY_DEFERRED)
                .then((task) => {
                    expect(task.title).to.equal("a task");
                    expect(task.user_id).to.equal(1);
                });
        });
    });
});
