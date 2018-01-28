describe("upsert", function () {
    const current = this.sequelize;
    const { orm } = adone;
    const { type } = orm;

    if (!current.dialect.supports.upserts) {
        return;
    }

    this.User = current.define("User", {
        name: type.STRING,
        virtualValue: {
            type: type.VIRTUAL,
            set(val) {
                this.value = val;
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

    this.UserNoTime = current.define("UserNoTime", {
        name: type.STRING
    }, {
        timestamps: false
    });

    beforeEach(() => {
        this.query = stub(current, "query").returns(Promise.resolve());

        this.stub = stub(current.getQueryInterface(), "upsert").returns(Promise.resolve([true, undefined]));
    });

    afterEach(() => {
        current.query.restore();
        current.getQueryInterface().upsert.restore();
    });


    it("skip validations for missing fields", async () => {
        await this.User.upsert({
            name: "Grumpy Cat"
        });
    });

    it("creates new record with correct field names", () => {
        return this.User
            .upsert({
                name: "Young Cat",
                virtualValue: 999
            })
            .then(() => {
                expect(Object.keys(this.stub.getCall(0).args[1])).to.deep.equal([
                    "name", "value", "created_at", "updatedAt"
                ]);
            });
    });

    it("creates new record with timestamps disabled", () => {
        return this.UserNoTime
            .upsert({
                name: "Young Cat"
            })
            .then(() => {
                expect(Object.keys(this.stub.getCall(0).args[1])).to.deep.equal([
                    "name"
                ]);
            });
    });

    it("updates all changed fields by default", () => {
        return this.User
            .upsert({
                name: "Old Cat",
                virtualValue: 111
            })
            .then(() => {
                expect(Object.keys(this.stub.getCall(0).args[2])).to.deep.equal([
                    "name", "value", "updatedAt"
                ]);
            });
    });
});
