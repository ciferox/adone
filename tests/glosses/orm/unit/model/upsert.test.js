import Support from "../../support";

const current = Support.sequelize;
const Promise = current.Promise;
const { DataTypes } = adone.orm;

describe(Support.getTestDialectTeaser("Model"), { skip: !current.dialect.supports.upserts }, () => {
    describe("method upsert", function () {
        const self = this;
        const User = current.define("User", {
            name: DataTypes.STRING,
            virtualValue: {
                type: DataTypes.VIRTUAL,
                set(val) {
                    return this.value = val;
                },
                get() {
                    return this.value;
                }
            },
            value: DataTypes.STRING,
            secretValue: {
                type: DataTypes.INTEGER,
                allowNull: false
            },
            createdAt: {
                type: DataTypes.DATE,
                field: "created_at"
            }
        });

        const UserNoTime = current.define("UserNoTime", {
            name: DataTypes.STRING
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
});
