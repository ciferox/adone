describe("upsert", function () {
    const current = this.sequelize;
    const { orm } = adone;
    const { type } = orm;

    if (!current.dialect.supports.upserts) {
        return;
    }

    const self = this;
    const User = current.define("User", {
        name: type.STRING,
        virtualValue: {
            type: type.VIRTUAL,
            set(val) {
                return this.value = val;
            },
            get() {
                return this.value;
            }
        },
        value: type.STRING,
        secretValue: {
            type: type.INTEGER,
            allowNull: false
        },
        createdAt: {
            type: type.DATE,
            field: "created_at"
        }
    });

    const UserNoTime = current.define("UserNoTime", {
        name: type.STRING
    }, {
        timestamps: false
    });

    beforeEach(() => {
        this.query = current.query;
        current.query = stub().returns(Promise.resolve());

        self.stub = stub(current.getQueryInterface(), "upsert").callsFake(() => {
            return User.build({});
        });
    });

    afterEach(function () {
        current.query = this.query;
        self.stub.restore();
    });


    it("skip validations for missing fields", async () => {
        await User.upsert({
            name: "Grumpy Cat"
        });
    });

    it("creates new record with correct field names", () => {
        return User
            .upsert({
                name: "Young Cat",
                virtualValue: 999
            })
            .then(() => {
                expect(Object.keys(self.stub.getCall(0).args[1])).to.deep.equal([
                    "name", "value", "created_at", "updatedAt"
                ]);
            });
    });

    it("creates new record with timestamps disabled", () => {
        return UserNoTime
            .upsert({
                name: "Young Cat"
            })
            .then(() => {
                expect(Object.keys(self.stub.getCall(0).args[1])).to.deep.equal([
                    "name"
                ]);
            });
    });

    it("updates all changed fields by default", () => {
        return User
            .upsert({
                name: "Old Cat",
                virtualValue: 111
            })
            .then(() => {
                expect(Object.keys(self.stub.getCall(0).args[2])).to.deep.equal([
                    "name", "value", "updatedAt"
                ]);
            });
    });
});
