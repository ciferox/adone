const { is } = adone;
const { ltgt } = adone.database.level;

const clone = (o) => {
    const O = {};
    for (const k in o) {
        O[k] = o[k]
            ;
    }
    return O;
};

const elements = [
    1, 2, 3, 4, 5
];

const ranges = [
    //default
    {
        range:
        {},
        selection:
        elements
    },
    {
        range:
        { reverse: true },
        selection:
        elements.slice().reverse()
    },

    //start/end - this has a lot of semantics because reverse is significant.
    {
        range:
        { start: 2 },
        selection:
        [2, 3, 4, 5]
    },
    {
        range:
        { start: 2, reverse: true },
        selection:
        [2, 1]
    },
    {
        range:
        { end: 2 },
        selection:
        [1, 2]
    },
    {
        range:
        { end: 2, reverse: true },
        selection:
        [2, 3, 4, 5].reverse()
    },
    {
        range:
        { start: 2.5 },
        selection:
        [3, 4, 5]
    },
    {
        range:
        { start: 2.5, reverse: true },
        selection:
        [2, 1]
    },
    {
        range:
        { end: 2.5, reverse: true },
        selection:
        [5, 4, 3]
    },
    {
        range:
        { start: 5 },
        selection:
        [5]
    },
    {
        range:
        { start: 5.5 },
        selection:
        []
    },
    {
        range:
        { end: 0.5 },
        selection:
        []
    },
    {
        range:
        { start: 5.5, reverse: true },
        selection:
        [5, 4, 3, 2, 1]
    },
    {
        range:
        { end: 0.5, reverse: true },
        selection:
        [5, 4, 3, 2, 1]
    },

    //nullish and empty strings signify are streated like null!
    {
        range:
        { end: null, reverse: true },
        selection:
        [5, 4, 3, 2, 1]
    },
    {
        range:
        { end: undefined, reverse: true },
        selection:
        [5, 4, 3, 2, 1]
    },
    {
        range:
        { end: "", reverse: true },
        selection:
        [5, 4, 3, 2, 1]
    },

    //lt/gt/lte/gte

    {
        range:
        { lt: 2.5 },
        selection:
        [1, 2]
    },
    {
        range:
        { gt: 2.5 },
        selection:
        [3, 4, 5]
    },
    {
        range:
        { lt: 2 },
        selection:
        [1]
    },
    {
        range:
        { gt: 2 },
        selection:
        [3, 4, 5]
    },

    {
        range:
        { lte: 2.5 },
        selection:
        [1, 2]
    },
    {
        range:
        { gte: 2.5 },
        selection:
        [3, 4, 5]
    },
    {
        range:
        { lte: 2 },
        selection:
        [1, 2]
    },
    {
        range:
        { gte: 2 },
        selection:
        [2, 3, 4, 5]
    },

    {
        range:
        { gt: 2.5, lt: 5 },
        selection:
        [3, 4]
    },
    {
        range:
        { gte: 2, lt: 3.5 },
        selection:
        [2, 3]
    },
    {
        range:
        { gt: 2.5, lte: 4 },
        selection:
        [3, 4]
    },
    {
        range:
        { gte: 2, lte: 4 },
        selection:
        [2, 3, 4]
    },

    //min/max - used by sublevel, equiv to gte, lte

    {
        range:
        { min: 2, max: 4 },
        selection:
        [2, 3, 4]
    },

    {
        range:
        { max: 2.5 },
        selection:
        [1, 2]
    },
    {
        range:
        { min: 2.5 },
        selection:
        [3, 4, 5]
    },
    {
        range:
        { max: 2 },
        selection:
        [1, 2]
    },
    {
        range:
        { min: 2 },
        selection:
        [2, 3, 4, 5]
    }

];


describe("databases", "level", "ltgt", () => {
    it("upperBound", () => {
        assert.equal("b", ltgt.upperBound({ start: "b", reverse: true }));
        assert.equal("b", ltgt.upperBound({ end: "b", reverse: false }));
        assert.equal(undefined, ltgt.lowerBound({ start: "b", reverse: true }));
        assert.equal(undefined, ltgt.lowerBound({ end: "b", reverse: false }));
    });


    it("bounds and inclusive", () => {
        assert.equal(ltgt.upperBound({ lt: "b", reverse: true }), "b");
        assert.equal(ltgt.upperBound({ lte: "b", reverse: true }), "b");

        assert.equal(ltgt.upperBound({ lt: "b" }), "b");
        assert.equal(ltgt.upperBound({ lte: "b" }), "b");

        assert.equal(ltgt.upperBoundInclusive({ lt: "b" }), false);

        assert.equal(ltgt.upperBoundInclusive({ lte: "b" }), true);

        assert.equal(ltgt.lowerBoundInclusive({ gt: "b" }), false);
        assert.equal(ltgt.lowerBoundInclusive({ gte: "b" }), true);
    });

    const strings = ["00", "01", "02"];
    const sranges = [
        {
            range:
            { start: "00" },
            selection:
            ["00", "01", "02"]
        },
        {
            range:
            { start: "03", reverse: true },
            selection:
            ["02", "01", "00"]
        }

    ];

    const compare = (a, b) => a - b;

    const make = (elements, ranges) => {
        ranges.forEach((e) => {
            it(`${JSON.stringify(e.range)} => ${JSON.stringify(e.selection)}`, () => {
                const actual = elements.filter(ltgt.filter(e.range));
                if (e.range.reverse) {
                    actual.reverse();
                }
                assert.deepEqual(actual, e.selection, `test range:${JSON.stringify(e.range)}`);

                const range = ltgt.toLtgt(e.range);
                //should not just return the same thing.
                assert.notOk(range.min || range.max || range.start || range.end);

                const actual2 = elements.filter(ltgt.filter(range));
                if (e.range.reverse) {
                    actual2.reverse();
                }
                assert.deepEqual(actual2, e.selection);
            });
        });
    };

    make(elements, ranges);
    make(strings, sranges);
    make(elements.map(String), ranges.map((e) => {
        const r = {};
        for (const k in e.range) {
            if (is.number(e.range[k])) {
                r[k] = e.range.toString();
            }
        }
        return { range: e.range, selection: e.selection.map(String) };
    }));

    const createLtgtTests = (mutate) => {
        return () => {
            const map = (key) => `foo!${key}`;

            const check = (expected, input) => {
                input = clone(input);
                assert.deepEqual(expected, ltgt.toLtgt(input, mutate ? input : null, map, "!", "~"));
            };

            //start, end

            check({ gte: "foo!a", lte: "foo!b" }, { start: "a", end: "b" });
            check({ gte: "foo!a", lte: "foo!~" }, { start: "a" });
            check({ gte: "foo!!", lte: "foo!b" }, { end: "b" });

            check({ gte: "foo!a", lte: "foo!b", reverse: true },
                { start: "b", end: "a", reverse: true });

            // min, max

            check({ gte: "foo!a", lte: "foo!b" }, { min: "a", max: "b" });
            check({ gte: "foo!a", lte: "foo!~" }, { min: "a" });
            check({ gte: "foo!!", lte: "foo!b" }, { max: "b" });
            check({ gte: "foo!!", lte: "foo!~" }, {});

            // lt, gt

            check({ gt: "foo!a", lt: "foo!b" }, { gt: "a", lt: "b" });
            check({ gt: "foo!a", lte: "foo!~" }, { gt: "a" });
            check({ gte: "foo!!", lt: "foo!b" }, { lt: "b" });
            check({ gte: "foo!!", lte: "foo!~" }, {});

            // lt, gt

            check({ gte: "foo!a", lte: "foo!b" }, { gte: "a", lte: "b" });
            check({ gte: "foo!a", lte: "foo!~" }, { gte: "a" });
            check({ gte: "foo!!", lte: "foo!b" }, { lte: "b" });
            check({ gte: "foo!!", lte: "foo!~" }, {});
        };
    };

    it("toLtgt - immutable", createLtgtTests(false));
    it("toLtgt - mutable", createLtgtTests(true));
});
