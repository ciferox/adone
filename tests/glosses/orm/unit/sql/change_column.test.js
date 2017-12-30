describe("changeColumn", function () {
    const { orm } = adone;
    const { type } = orm;

    const expectsql = this.expectsql;
    const current = this.sequelize;

    if (current.dialect.name === "sqlite") {
        return;
    }

    const Model = current.define("users", {
        id: {
            type: type.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        level_id: {
            type: type.INTEGER
        }
    }, { timestamps: false });

    beforeEach(function () {
        this.stub = stub(current, "query").callsFake((sql) => {
            return Promise.resolve(sql);
        });
    });

    afterEach(function () {
        this.stub.restore();
    });

    it("properly generate alter queries", () => {
        return current.getQueryInterface().changeColumn(Model.getTableName(), "level_id", {
            type: type.FLOAT,
            allowNull: false
        }).then((sql) => {
            expectsql(sql, {
                mssql: "ALTER TABLE [users] ALTER COLUMN [level_id] FLOAT NOT NULL;",
                mysql: "ALTER TABLE `users` CHANGE `level_id` `level_id` FLOAT NOT NULL;",
                postgres: 'ALTER TABLE "users" ALTER COLUMN "level_id" SET NOT NULL;ALTER TABLE "users" ALTER COLUMN "level_id" DROP DEFAULT;ALTER TABLE "users" ALTER COLUMN "level_id" TYPE FLOAT;'
            });
        });
    });

    it("properly generate alter queries for foreign keys", () => {
        return current.getQueryInterface().changeColumn(Model.getTableName(), "level_id", {
            type: type.INTEGER,
            references: {
                model: "level",
                key: "id"
            },
            onUpdate: "cascade",
            onDelete: "cascade"
        }).then((sql) => {
            expectsql(sql, {
                mssql: "ALTER TABLE [users] ADD CONSTRAINT [level_id_foreign_idx] FOREIGN KEY ([level_id]) REFERENCES [level] ([id]) ON DELETE CASCADE;",
                mysql: "ALTER TABLE `users` ADD CONSTRAINT `users_level_id_foreign_idx` FOREIGN KEY (`level_id`) REFERENCES `level` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;",
                postgres: 'ALTER TABLE "users"  ADD CONSTRAINT "level_id_foreign_idx" FOREIGN KEY ("level_id") REFERENCES "level" ("id") ON DELETE CASCADE ON UPDATE CASCADE;'
            });
        });
    });

});
