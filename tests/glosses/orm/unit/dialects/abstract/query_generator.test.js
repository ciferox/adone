describe("QueryGenerator", function () {
    const { operator } = adone.orm;
    const getAbstractQueryGenerator = this.getAbstractQueryGenerator;

    describe("whereItemQuery", () => {
        it("should generate correct query for Symbol operators", function () {
            const QG = getAbstractQueryGenerator(this.sequelize);
            expect(QG.whereItemQuery(operator.or, [{ test: { [operator.gt]: 5 } }, { test: { [operator.lt]: 3 } }, { test: { [operator.in]: [4] } }]))
                .to.be.equal("(test > 5 OR test < 3 OR test IN (4))");

            expect(QG.whereItemQuery(operator.and, [{ test: { [operator.between]: [2, 5] } }, { test: { [operator.ne]: 3 } }, { test: { [operator.not]: 4 } }]))
                .to.be.equal("(test BETWEEN 2 AND 5 AND test != 3 AND test != 4)");
        });

        it("should not parse any strings as aliases  operators", function () {
            const QG = getAbstractQueryGenerator(this.sequelize);
            expect(() => QG.whereItemQuery("$or", [{ test: 5 }, { test: 3 }]))
                .to.throw("Invalid value { test: 5 }");

            expect(() => QG.whereItemQuery("$and", [{ test: 5 }, { test: 3 }]))
                .to.throw("Invalid value { test: 5 }");

            expect(() => QG.whereItemQuery("test", { $gt: 5 }))
                .to.throw("Invalid value { '$gt': 5 }");

            expect(() => QG.whereItemQuery("test", { $between: [2, 5] }))
                .to.throw("Invalid value { '$between': [ 2, 5 ] }");

            expect(() => QG.whereItemQuery("test", { $ne: 3 }))
                .to.throw("Invalid value { '$ne': 3 }");

            expect(() => QG.whereItemQuery("test", { $not: 3 }))
                .to.throw("Invalid value { '$not': 3 }");

            expect(() => QG.whereItemQuery("test", { $in: [4] }))
                .to.throw("Invalid value { '$in': [ 4 ] }");
        });

        it("should parse set aliases strings as operators", function () {
            const QG = getAbstractQueryGenerator(this.sequelize);
            const aliases = {
                OR: operator.or,
                "!": operator.not,
                "^^": operator.gt
            };

            QG.setOperatorsAliases(aliases);

            expect(QG.whereItemQuery("OR", [{ test: { "^^": 5 } }, { test: { "!": 3 } }, { test: { [operator.in]: [4] } }]))
                .to.be.equal("(test > 5 OR test != 3 OR test IN (4))");

            expect(QG.whereItemQuery(operator.and, [{ test: { [operator.between]: [2, 5] } }, { test: { "!": 3 } }, { test: { "^^": 4 } }]))
                .to.be.equal("(test BETWEEN 2 AND 5 AND test != 3 AND test > 4)");

            expect(() => QG.whereItemQuery("OR", [{ test: { "^^": 5 } }, { test: { $not: 3 } }, { test: { [operator.in]: [4] } }]))
                .to.throw("Invalid value { '$not': 3 }");

            expect(() => QG.whereItemQuery("OR", [{ test: { $gt: 5 } }, { test: { "!": 3 } }, { test: { [operator.in]: [4] } }]))
                .to.throw("Invalid value { '$gt': 5 }");

            expect(() => QG.whereItemQuery("$or", [{ test: 5 }, { test: 3 }]))
                .to.throw("Invalid value { test: 5 }");

            expect(() => QG.whereItemQuery("$and", [{ test: 5 }, { test: 3 }]))
                .to.throw("Invalid value { test: 5 }");

            expect(() => QG.whereItemQuery("test", { $gt: 5 }))
                .to.throw("Invalid value { '$gt': 5 }");

            expect(() => QG.whereItemQuery("test", { $between: [2, 5] }))
                .to.throw("Invalid value { '$between': [ 2, 5 ] }");

            expect(() => QG.whereItemQuery("test", { $ne: 3 }))
                .to.throw("Invalid value { '$ne': 3 }");

            expect(() => QG.whereItemQuery("test", { $not: 3 }))
                .to.throw("Invalid value { '$not': 3 }");

            expect(() => QG.whereItemQuery("test", { $in: [4] }))
                .to.throw("Invalid value { '$in': [ 4 ] }");
        });

    });
});

