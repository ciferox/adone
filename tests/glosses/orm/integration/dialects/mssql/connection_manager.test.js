import Support from "../../support";

const dialect = Support.getTestDialect();

describe("[MSSQL Specific] Query Queue", { skip: !/^mssql/.test(dialect) }, () => {
    it("should work with handleDisconnects", () => {
        const sequelize = Support.createSequelizeInstance({ pool: { min: 1, max: 1, idle: 5000 } });
        const cm = sequelize.connectionManager;
        let conn;

        return sequelize
            .sync()
            .then(() => cm.getConnection())
            .then((connection) => {
                // Save current connection
                conn = connection;

                // simulate a unexpected end
                // connection removed from pool by MSSQL Conn Manager
                conn.unwrap().emit("error", { code: "ECONNRESET" });
            })
            .then(() => cm.getConnection())
            .then((connection) => {
                expect(conn).to.not.be.equal(connection);
                expect(cm.validate(conn)).to.not.be.ok();

                return cm.releaseConnection(connection);
            });
    });

    it("should handle double disconnect", () => {
        const sequelize = Support.createSequelizeInstance({ pool: { min: 1, max: 1, idle: 5000 } });
        const cm = sequelize.connectionManager;
        let count = 0;
        let conn = null;

        return sequelize
            .sync()
            .then(() => cm.getConnection())
            .then((connection) => {
                conn = connection;
                const unwrapConn = conn.unwrap();
                unwrapConn.on("end", () => {
                    count++;
                });

                return cm.disconnect(conn);
            })
            .then(() => cm.disconnect(conn))
            .then(() => {
                expect(count).to.be.eql(1);
            });
    });

    it("should not throw when non pooled connection is unexpectedly closed", () => {
        const sequelize = Support.createSequelizeInstance({ pool: { min: 1, max: 1, idle: 5000 } });
        const cm = sequelize.connectionManager;

        let conn;

        return sequelize
            .sync()
            .then(() => cm.getConnection())
            .then((connection) => {
                conn = connection;

                // remove from pool
                return cm.pool.destroy(connection);
            })
            .then(() => {
                // unexpected disconnect
                const unwrapConn = conn.unwrap();
                unwrapConn.emit("error", {
                    code: "ESOCKET"
                });
            });
    });

    describe("Errors", () => {
        it("ECONNREFUSED", async () => {
            const sequelize = Support.createSequelizeInstance({ port: 34237 });
            await assert.throws(async () => {
                await sequelize.connectionManager.getConnection();
            }, sequelize.ConnectionRefusedError);
        });

        it("ENOTFOUND", async () => {
            const sequelize = Support.createSequelizeInstance({ host: "http://wowow.example.com" });
            await assert.throws(async () => {
                await sequelize.connectionManager.getConnection();
            }, sequelize.HostNotFoundError);
        });

        it("EHOSTUNREACH", async () => {
            const sequelize = Support.createSequelizeInstance({ host: "255.255.255.255" });
            await assert.throws(async () => {
                await sequelize.connectionManager.getConnection();
            }, sequelize.HostNotReachableError);
        });

        it("ER_ACCESS_DENIED_ERROR | ELOGIN", async () => {
            const sequelize = new Support.Sequelize("localhost", "was", "ddsd", Support.sequelize.options);
            await assert.throws(async () => {
                await sequelize.connectionManager.getConnection();
            }, sequelize.AccessDeniedError);
        });
    });
});
