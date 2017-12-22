describe("util", "toposort", () => {
    const { toposort } = adone.util;

    describe("Toposort", () => {
        it("should sort correctly", () => {
            const t = new toposort.Sorter();

            t.add("3", "2")
                .add("2", "1")
                .add("6", "5")
                .add("5", ["2", "4"]);

            const arr = t.sort();
            const fails = [];

            assert.array(arr);

            const possibilities = [
                ["3", "6", "5", "4", "2", "1"],
                ["3", "6", "5", "2", "4", "1"],
                ["6", "3", "5", "2", "4", "1"],
                ["6", "3", "5", "2", "1", "4"],
                ["6", "5", "3", "2", "1", "4"],
                ["6", "5", "3", "2", "4", "1"],
                ["6", "5", "4", "3", "2", "1"]
            ];

            possibilities.forEach((possibility) => {
                try {
                    assert.deepEqual(arr, possibility);
                } catch (e) {
                    fails.push(e);
                }
            });

            if (fails.length === possibilities.length) {
                throw fails[0];
            }
        });

        it("should find cyclic dependencies", () => {
            const t = new toposort.Sorter();
            t.add("3", "2")
                .add("2", "1")
                .add("1", "3");

            try {
                t.sort();
                assert(false);

            } catch (err) {
                assert(err instanceof Error);
            }
        });

        it("#2 - should add the item if an empty array of dependencies is passed", () => {
            const t = new toposort.Sorter();
            const out = t.add("1", []).sort();

            assert.deepEqual(out, ["1"]);
        });

        it("should handle deeply nested dependencies", () => {
            const t = new toposort.Sorter();

            t.add("3", "1")
                .add("6", ["3", "4", "5"])
                .add("7", "1")
                .add("9", ["8", "6", "7"])
                .add("4", ["2", "3"])
                .add("2", "3")
                .add("5", ["3", "4"])
                .add("8", ["1", "2", "3", "4", "5"]);

            const out = t.sort().reverse();

            assert.deepEqual(out, ["1", "3", "2", "4", "5", "6", "7", "8", "9"]);
        });

        it("should work on the example dependencies", () => {
            const t = new toposort.Sorter();

            t.add("jquery-ui-core", "jquery")
                .add("jquery-ui-widget", "jquery")
                .add("jquery-ui-button", ["jquery-ui-core", "jquery-ui-widget"])
                .add("plugin", ["backbone", "jquery-ui-button"])
                .add("backbone", ["underscore", "jquery"]);

            assert.deepEqual(t.sort().reverse(), [
                "jquery",
                "jquery-ui-core",
                "jquery-ui-widget",
                "jquery-ui-button",
                "underscore",
                "backbone",
                "plugin"
            ]);
        });
    });
});
