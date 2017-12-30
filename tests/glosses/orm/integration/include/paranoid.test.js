describe("paranoid", () => {
    const { orm } = adone;
    const { type } = orm;

    beforeEach(function ( ) {
        const S = this.sequelize;
        const A = this.A = S.define("A", { name: type.STRING }, { paranoid: true });
        const B = this.B = S.define("B", { name: type.STRING }, { paranoid: true });
        const C = this.C = S.define("C", { name: type.STRING }, { paranoid: true });
        const D = this.D = S.define("D", { name: type.STRING }, { paranoid: true });

        A.belongsTo(B);
        A.belongsToMany(D, { through: "a_d" });
        A.hasMany(C);

        B.hasMany(A);
        B.hasMany(C);

        C.belongsTo(A);
        C.belongsTo(B);

        D.belongsToMany(A, { through: "a_d" });

        return S.sync({ force: true });
    });

    before(function () {
        this.clock = fakeClock.install();
    });

    after(function () {
        this.clock.uninstall();
    });

    it("paranoid with timestamps: false should be ignored / not crash", function () {
        const S = this.sequelize;
        const Test = S.define("Test", {
            name: type.STRING
        }, {
            timestamps: false,
            paranoid: true
        });

        return S.sync({ force: true }).then(() => {
            return Test.findById(1);
        });
    });

    it("test if non required is marked as false", function ( ) {
        const A = this.A;
        const B = this.B;
        const options = {
            include: [
                {
                    model: B,
                    required: false
                }
            ]
        };

        return A.find(options).then(() => {
            expect(options.include[0].required).to.be.equal(false);
        });
    });

    it("test if required is marked as true", function ( ) {
        const A = this.A;
        const B = this.B;
        const options = {
            include: [
                {
                    model: B,
                    required: true
                }
            ]
        };

        return A.find(options).then(() => {
            expect(options.include[0].required).to.be.equal(true);
        });
    });

    it("should not load paranoid, destroyed instances, with a non-paranoid parent", async function () {
        const X = this.sequelize.define("x", {
            name: type.STRING
        }, {
            paranoid: false
        });

        const Y = this.sequelize.define("y", {
            name: type.STRING
        }, {
            timestamps: true,
            paranoid: true
        });

        X.hasMany(Y);

        await this.sequelize.sync({ force: true });
        const [x, y] = await Promise.all([
            X.create(),
            Y.create()
        ]);
        await x.addY(y);
        await y.destroy();
        //prevent CURRENT_TIMESTAMP to be same
        this.clock.tick(1000);
        {
            const [x] = await X.findAll({
                include: [Y]
            });
            expect(x.ys).to.have.length(0);
        }
    });
});
