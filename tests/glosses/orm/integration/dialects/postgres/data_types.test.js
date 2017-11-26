import Support from "../../support";

const dialect = Support.getTestDialect();

describe("[POSTGRES Specific] Data Types", { skip: dialect !== "postgres" }, () => {
    adone.private(adone.orm).dialect.postgres; // load postgres just to be sure the types are defined

    const { type } = adone.orm;

    describe("DATE/DATEONLY Validate and Stringify", () => {
        const now = new Date();
        const nowString = now.toISOString();


        it("DATE should validate a Date as normal", () => {
            expect(new type[dialect].DATE().validate(now)).to.equal(true);
            expect(new type[dialect].DATE().validate(nowString)).to.equal(true);
        });

        it("DATE should validate Infinity/-Infinity as true", () => {
            expect(new type[dialect].DATE().validate(Infinity)).to.equal(true);
            expect(new type[dialect].DATE().validate(-Infinity)).to.equal(true);
        });

        it("DATE should stringify Infinity/-Infinity to infinity/-infinity", () => {
            expect(new type[dialect].DATE().stringify(Infinity)).to.equal("Infinity");
            expect(new type[dialect].DATE().stringify(-Infinity)).to.equal("-Infinity");
        });

        it("DATEONLY should stringify Infinity/-Infinity to infinity/-infinity", () => {
            expect(new type[dialect].DATEONLY().stringify(Infinity)).to.equal("Infinity");
            expect(new type[dialect].DATEONLY().stringify(-Infinity)).to.equal("-Infinity");
        });
    });

    describe("DATE/DATEONLY Sanitize", () => {
        const now = new Date();
        const nowString = now.toISOString();
        const nowDateOnly = nowString.substr(0, 10);

        it("DATE should sanitize a Date as normal", () => {
            expect(new type[dialect].DATE()._sanitize(now)).to.be.deep.equal(now);
            expect(new type[dialect].DATE()._sanitize(nowString)).to.be.deep.equal(now);
        });

        it("DATE should sanitize Infinity/-Infinity as Infinity/-Infinity", () => {
            expect(new type[dialect].DATE()._sanitize(Infinity)).to.equal(Infinity);
            expect(new type[dialect].DATE()._sanitize(-Infinity)).to.equal(-Infinity);
        });

        it('DATE should sanitize "Infinity"/"-Infinity" as Infinity/-Infinity', () => {
            expect(new type[dialect].DATE()._sanitize("Infinity")).to.equal(Infinity);
            expect(new type[dialect].DATE()._sanitize("-Infinity")).to.equal(-Infinity);
        });

        it("DATEONLY should sanitize a Date as normal", () => {
            expect(new type[dialect].DATEONLY()._sanitize(now)).to.equal(nowDateOnly);
            expect(new type[dialect].DATEONLY()._sanitize(nowString)).to.equal(nowDateOnly);
        });

        it("DATEONLY should sanitize Infinity/-Infinity as Infinity/-Infinity", () => {
            expect(new type[dialect].DATEONLY()._sanitize(Infinity)).to.equal(Infinity);
            expect(new type[dialect].DATEONLY()._sanitize(-Infinity)).to.equal(-Infinity);
        });

        it('DATEONLY should sanitize "Infinity"/"-Infinity" as Infinity/-Infinity', () => {
            expect(new type[dialect].DATEONLY()._sanitize("Infinity")).to.equal(Infinity);
            expect(new type[dialect].DATEONLY()._sanitize("-Infinity")).to.equal(-Infinity);
        });
    });

    /**
     * @param {Date} d
     * @param {Date} a
     * @param {Date} b
     */
    const assertWithinTime = (d, a, b) => {
        // TODO: implement the same in assert ?
        expect(d.getTime()).to.be.gte(a.getTime()).and.lte(b.getTime());
    };

    /**
     * @param {Date} d
     * @param {Date} a
     * @param {Date} b
     */
    const assertWithinDate = (d, a, b) => {
        // TODO: implement the same in assert ?
        /**
         * @type {Date}
         */
        const d1 = adone.util.clone(d);
        const a1 = adone.util.clone(a);
        const b1 = adone.util.clone(b);

        d1.setUTCHours(0);
        d1.setUTCMinutes(0);
        d1.setUTCSeconds(0);
        d1.setUTCMilliseconds(0);

        a1.setUTCHours(0);
        a1.setUTCMinutes(0);
        a1.setUTCSeconds(0);
        a1.setUTCMilliseconds(0);

        b1.setUTCHours(0);
        b1.setUTCMinutes(0);
        b1.setUTCSeconds(0);
        b1.setUTCMilliseconds(0);

        assertWithinTime(d1, a1, b1);
    };

    describe("DATE SQL", () => {
        // create dummy user
        it("should be able to create and update records with Infinity/-Infinity", function () {
            this.sequelize.options.typeValidation = true;

            const date = new Date();
            const User = this.sequelize.define("User", {
                username: this.sequelize.type.STRING,
                beforeTime: {
                    type: this.sequelize.type.DATE,
                    defaultValue: -Infinity
                },
                sometime: {
                    type: this.sequelize.type.DATE,
                    defaultValue: this.sequelize.fn("NOW")
                },
                anotherTime: {
                    type: this.sequelize.type.DATE
                },
                afterTime: {
                    type: this.sequelize.type.DATE,
                    defaultValue: Infinity
                }
            }, {
                timestamps: true
            });

            return User.sync({
                force: true
            }).then(() => {
                return User.create({
                    username: "bob",
                    anotherTime: Infinity
                }, {
                    validate: true
                });
            }).then((user) => {
                expect(user.username).to.equal("bob");
                expect(user.beforeTime).to.equal(-Infinity);
                expect(user.sometime).to.be.a("date");
                // fixme: wrong server time?
                // assertWithinTime(user.sometime, date, new Date());
                expect(user.anotherTime).to.equal(Infinity);
                expect(user.afterTime).to.equal(Infinity);

                return user.update({
                    sometime: Infinity
                }, {
                    returning: true
                });
            }).then((user) => {
                expect(user.sometime).to.equal(Infinity);

                return user.update({
                    sometime: Infinity
                });
            }).then((user) => {
                expect(user.sometime).to.equal(Infinity);

                return user.update({
                    sometime: this.sequelize.fn("NOW")
                }, {
                    returning: true
                });
            }).then((user) => {
                expect(user.sometime).to.be.a("date");
                // fixme: wrong server time ?
                // assertWithinTime(user.sometime, date, new Date());

                // find
                return User.findAll();
            }).then((users) => {
                expect(users[0].beforeTime).to.equal(-Infinity);
                expect(users[0].sometime).to.not.equal(Infinity);
                expect(users[0].afterTime).to.equal(Infinity);

                return users[0].update({
                    sometime: date
                });
            }).then((user) => {
                expect(user.sometime).to.be.deep.equal(date);

                return user.update({
                    sometime: date
                });
            }).then((user) => {
                expect(user.sometime).to.be.deep.equal(date);
            });
        });
    });

    describe("DATEONLY SQL", () => {
        // create dummy user
        it("should be able to create and update records with Infinity/-Infinity", function () {
            this.sequelize.options.typeValidation = true;

            const date = new Date();
            const User = this.sequelize.define("User", {
                username: this.sequelize.type.STRING,
                beforeTime: {
                    type: this.sequelize.type.DATEONLY,
                    defaultValue: -Infinity
                },
                sometime: {
                    type: this.sequelize.type.DATEONLY,
                    defaultValue: this.sequelize.fn("NOW")
                },
                anotherTime: {
                    type: this.sequelize.type.DATEONLY
                },
                afterTime: {
                    type: this.sequelize.type.DATEONLY,
                    defaultValue: Infinity
                }
            }, {
                timestamps: true
            });

            return User.sync({
                force: true
            }).then(() => {
                return User.create({
                    username: "bob",
                    anotherTime: Infinity
                }, {
                    validate: true
                });
            }).then((user) => {
                expect(user.username).to.equal("bob");
                expect(user.beforeTime).to.equal(-Infinity);
                assertWithinDate(new Date(user.sometime), date, new Date());
                expect(user.anotherTime).to.equal(Infinity);
                expect(user.afterTime).to.equal(Infinity);

                return user.update({
                    sometime: Infinity
                }, {
                    returning: true
                });
            }).then((user) => {
                expect(user.sometime).to.equal(Infinity);

                return user.update({
                    sometime: Infinity
                });
            }).then((user) => {
                expect(user.sometime).to.equal(Infinity);

                return user.update({
                    sometime: this.sequelize.fn("NOW")
                }, {
                    returning: true
                });
            }).then((user) => {
                expect(user.sometime).to.not.equal(Infinity);
                assertWithinDate(new Date(user.sometime), date, new Date());
                // find
                return User.findAll();
            }).then((users) => {
                expect(users[0].beforeTime).to.equal(-Infinity);
                expect(users[0].sometime).to.not.equal(Infinity);
                expect(users[0].afterTime).to.equal(Infinity);

                return users[0].update({
                    sometime: "1969-07-20"
                });
            }).then((user) => {
                expect(user.sometime).to.equal("1969-07-20");

                return user.update({
                    sometime: "1969-07-20"
                });
            }).then((user) => {
                expect(user.sometime).to.equal("1969-07-20");
            });
        });
    });

});
