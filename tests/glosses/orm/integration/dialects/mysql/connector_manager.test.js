import Support from "../../support";

const dialect = Support.getTestDialect();
const { promise, orm } = adone;
const { type } = orm;

describe("[MYSQL Specific] Connection Manager", { skip: dialect !== "mysql" }, () => {
    it("works correctly after being idle", function () {
        const User = this.sequelize.define("User", { username: type.STRING });
        const s = spy();

        return User
            .sync({ force: true })
            .then(() => User.create({ username: "user1" }))
            .then(() => User.count())
            .then((count) => {
                expect(count).to.equal(1);
                s();
                return promise.delay(1000);
            })
            .then(() => User.count())
            .then((count) => {
                expect(count).to.equal(1);
                s();
                if (!s.calledTwice) {
                    throw new Error("Spy was not called twice");
                }
            });
    });

    it("accepts new queries after shutting down a connection", () => {
        // Create a sequelize instance with fast disconnecting connection
        const sequelize = Support.createSequelizeInstance({ pool: { idle: 50, max: 1, evict: 10 } });
        const User = sequelize.define("User", { username: type.STRING });

        return User
            .sync({ force: true })
            .then(() => User.create({ username: "user1" }))
            .then(() => promise.delay(100))
            .then(() => {
                expect(sequelize.connectionManager.pool.size).to.equal(0);
                //This query will be queued just after the `client.end` is executed and before its callback is called
                return sequelize.query("SELECT COUNT(*) AS count FROM Users", { type: sequelize.queryType.SELECT });
            })
            .then((count) => {
                expect(sequelize.connectionManager.pool.size).to.equal(1);
                expect(count[0].count).to.equal(1);
            });
    });

    it("should maintain connection", () => {
        const sequelize = Support.createSequelizeInstance({ pool: { min: 1, max: 1, handleDisconnects: true, idle: 5000 } });
        const cm = sequelize.connectionManager;
        let conn;

        return sequelize.sync()
            .then(() => cm.getConnection())
            .then((connection) => {
                // Save current connection
                conn = connection;

                return cm.releaseConnection(conn);
            })
            .then(() => {
                // Get next available connection
                return cm.getConnection();
            })
            .then((connection) => {
                // Old threadId should be same as current connection
                expect(conn.threadId).to.be.equal(connection.threadId);
                expect(cm.validate(conn)).to.be.ok();

                return cm.releaseConnection(connection);
            });
    });

    it("should work with handleDisconnects before release", () => {
        const sequelize = Support.createSequelizeInstance({ pool: { max: 1, min: 1, handleDisconnects: true, idle: 5000 } });
        const cm = sequelize.connectionManager;
        let conn;

        return sequelize
            .sync()
            .then(() => cm.getConnection())
            .then((connection) => {
                // Save current connection
                conn = connection;
                // simulate a unexpected end from MySQL2
                conn.stream.emit("end");

                return cm.releaseConnection(connection);
            })
            .then(() => {
                // Get next available connection
                return cm.getConnection();
            })
            .then((connection) => {
                // Old threadId should be different from current new one
                expect(conn.threadId).to.not.be.equal(connection.threadId);
                expect(sequelize.connectionManager.pool.size).to.equal(1);
                expect(cm.validate(conn)).to.be.not.ok;

                return cm.releaseConnection(connection);
            });
    });

    it("-FOUND_ROWS can be suppressed to get back legacy behavior", async () => {
        const sequelize = Support.createSequelizeInstance({ dialectOptions: { flags: "" } });
        const User = sequelize.define("User", { username: type.STRING });

        await User.sync({ force: true });
        await User.create({ id: 1, username: "jozef" });
        const [affectedCount] = await User.update({ username: "jozef" }, {
            where: {
                id: 1
            }
        });
        // https://github.com/sequelize/sequelize/issues/7184
        expect(affectedCount).to.be.equal(1);
    });

    it("should work with handleDisconnects", () => {
        const sequelize = Support.createSequelizeInstance({ pool: { min: 1, max: 1, handleDisconnects: true, idle: 5000 } });
        const cm = sequelize.connectionManager;
        let conn;

        return sequelize
            .sync()
            .then(() => cm.getConnection())
            .then((connection) => {
                // Save current connection
                conn = connection;
                return cm.releaseConnection(conn);
            })
            .then(() => {
                // simulate a unexpected end from MySQL2 AFTER releasing the connection
                conn.stream.emit("end");

                // Get next available connection
                return cm.getConnection();
            })
            .then((connection) => {
                // Old threadId should be different from current new one
                expect(conn.threadId).to.not.be.equal(connection.threadId);
                expect(cm.validate(conn)).to.not.be.ok();
                return cm.releaseConnection(connection);
            });
    });
});
