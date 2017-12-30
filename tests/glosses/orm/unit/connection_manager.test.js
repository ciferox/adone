describe("connection manager", function () {
    const ConnectionManager = adone.private(adone.orm).dialect.abstract.ConnectionManager;

    describe("_connect", () => {
        beforeEach(() => {
            this.connection = {};
            this.stub = stub().returns(Promise.resolve(this.connection));

            this.dialect = {
                connectionManager: {
                    connect: this.stub
                }
            };

            this.sequelize = this.createSequelizeInstance();
        });

        it("should resolve connection on dialect connection manager", async function () {
            const connection = {};
            this.dialect.connectionManager.connect.returns(Promise.resolve(connection));

            const connectionManager = new ConnectionManager(this.dialect, this.sequelize);

            const config = {};

            expect(await connectionManager._connect(config)).to.be.equal(connection);

            expect(this.dialect.connectionManager.connect).to.have.been.calledWith(config);
        });

        it("should let beforeConnect hook modify config", function () {
            const username = Math.random().toString();
            const password = Math.random().toString();

            this.sequelize.beforeConnect((config) => {
                config.username = username;
                config.password = password;
                return config;
            });

            const connectionManager = new ConnectionManager(this.dialect, this.sequelize);

            return connectionManager._connect({}).then(() => {
                expect(this.dialect.connectionManager.connect).to.have.been.calledWith({
                    username,
                    password
                });
            });
        });

        it("should call afterConnect", async function () {
            const s = spy();
            this.sequelize.afterConnect(s);

            const connectionManager = new ConnectionManager(this.dialect, this.sequelize);

            await connectionManager._connect({});

            expect(s.callCount).to.equal(1);
            expect(s.firstCall.args[0]).to.equal(this.connection);
            expect(s.firstCall.args[1]).to.eql({});
        });
    });
});
