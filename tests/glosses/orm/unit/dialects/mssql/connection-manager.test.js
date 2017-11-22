import Support from "../../../support";

const { Sequelize } = Support;

const tedious = require("tedious");
const connectionStub = stub(tedious, "Connection");

connectionStub.returns({ on() { } });

describe("[MSSQL] Connection Manager", { skip: Support.getTestDialect() !== "mssql" }, () => {
    let instance;
    let config;
    beforeEach(() => {
        config = {
            dialect: "mssql",
            database: "none",
            username: "none",
            password: "none",
            host: "localhost",
            port: 2433,
            pool: {},
            dialectOptions: {
                domain: "TEST.COM"
            }
        };
        instance = new Sequelize(
            config.database,
            config.username,
            config.password,
            config
        );
    });

    after(() => {
        connectionStub.restore();
    });

    it.skip("connectionManager._connect() Does not delete `domain` from config.dialectOptions", async () => {
        expect(config.dialectOptions.domain).to.equal("TEST.COM");
        await instance.dialect.connectionManager._connect(config);
        expect(config.dialectOptions.domain).to.equal("TEST.COM");
    });
});
