import Support from "./support";

const {
    DataTypes
} = adone.orm;

const dialect = Support.getTestDialect();

describe(Support.getTestDialectTeaser("Replication"), { skip: dialect === "sqlite" }, function () {
    if (dialect === "sqlite") {
        return;
    }

    let sandbox;
    let readSpy;
    let writeSpy;

    beforeEach(() => {
        sandbox = adone.shani.util.sandbox.create();

        this.sequelize = Support.getSequelizeInstance(null, null, null, {
            replication: {
                write: Support.getConnectionOptions(),
                read: [Support.getConnectionOptions()]
            }
        });

        expect(this.sequelize.connectionManager.pool.write).to.be.ok;
        expect(this.sequelize.connectionManager.pool.read).to.be.ok;

        this.User = this.sequelize.define("User", {
            firstName: {
                type: DataTypes.STRING,
                field: "first_name"
            }
        });

        return this.User.sync({ force: true })
            .then(() => {
                readSpy = sandbox.spy(this.sequelize.connectionManager.pool.read, "acquire");
                writeSpy = sandbox.spy(this.sequelize.connectionManager.pool.write, "acquire");
            });
    });

    afterEach(() => {
        sandbox.restore();
    });

    const expectReadCalls = () => {
        expect(readSpy.callCount).least(1);
        expect(writeSpy.notCalled).eql(true);
    };

    const expectWriteCalls = () => {
        expect(writeSpy.callCount).least(1);
        expect(readSpy.notCalled).eql(true);
    };

    it("should be able to make a write", () => {
        return this.User.create({
            firstName: Math.random().toString()
        }).then(expectWriteCalls);
    });

    it("should be able to make a read", () => {
        return this.User.findAll().then(expectReadCalls);
    });

    it("should run read-only transactions on the replica", () => {
        return this.sequelize.transaction({ readOnly: true }, (transaction) => {
            return this.User.findAll({ transaction });
        }).then(expectReadCalls);
    });

    it("should run non-read-only transactions on the primary", () => {
        return this.sequelize.transaction((transaction) => {
            return this.User.findAll({ transaction });
        }).then(expectWriteCalls);
    });
});
