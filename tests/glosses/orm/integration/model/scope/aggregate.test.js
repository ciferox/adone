describe("aggregate", () => {
    const { orm } = adone;
    const { type } = orm;

    beforeEach(function () {
        this.Child = this.sequelize.define("Child", {
            priority: type.INTEGER
        });
        this.ScopeMe = this.sequelize.define("ScopeMe", {
            username: type.STRING,
            email: type.STRING,
            access_level: type.INTEGER,
            other_value: type.INTEGER
        }, {
            defaultScope: {
                where: {
                    access_level: {
                        gte: 5
                    }
                }
            },
            scopes: {
                lowAccess: {
                    where: {
                        access_level: {
                            lte: 5
                        }
                    }
                },
                withOrder: {
                    order: ["username"]
                },
                withInclude: {
                    include: [{
                        model: this.Child,
                        where: {
                            priority: 1
                        }
                    }]
                }
            }
        });
        this.Child.belongsTo(this.ScopeMe);
        this.ScopeMe.hasMany(this.Child);

        return this.sequelize.sync({ force: true }).then(() => {
            const records = [
                { username: "tony", email: "tony@sequelizejs.com", access_level: 3, other_value: 7 },
                { username: "tobi", email: "tobi@fakeemail.com", access_level: 10, other_value: 11 },
                { username: "dan", email: "dan@sequelizejs.com", access_level: 5, other_value: 10 },
                { username: "fred", email: "fred@foobar.com", access_level: 3, other_value: 7 }
            ];
            return this.ScopeMe.bulkCreate(records);
        }).then(() => {
            return this.ScopeMe.findAll();
        }).then((records) => {
            return Promise.all([
                records[0].createChild({
                    priority: 1
                }),
                records[1].createChild({
                    priority: 2
                })
            ]);
        });
    });

    it("should apply defaultScope", async function () {
        expect(await this.ScopeMe.aggregate("*", "count")).to.be.equal(2);
    });

    it("should be able to override default scope", async function () {
        expect(await this.ScopeMe.aggregate("*", "count", { where: { access_level: { gt: 5 } } })).to.be.equal(1);
    });

    it("should be able to unscope", async function () {
        expect(await this.ScopeMe.unscoped().aggregate("*", "count")).to.be.equal(4);
    });

    it("should be able to apply other scopes", async function () {
        expect(await this.ScopeMe.scope("lowAccess").aggregate("*", "count")).to.be.equal(3);
    });

    it("should be able to merge scopes with where", async function () {
        expect(await this.ScopeMe.scope("lowAccess").aggregate("*", "count", { where: { username: "dan" } })).to.be.equal(1);
    });

    it("should be able to use where on include", async function () {
        expect(await this.ScopeMe.scope("withInclude").aggregate("ScopeMe.id", "count", {
            plain: true,
            dataType: new type.INTEGER(),
            includeIgnoreAttributes: false,
            limit: null,
            offset: null,
            order: null,
            attributes: []
        })).to.be.equal(1);
    });
});
