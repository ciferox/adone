const { Inspector } = adone.meta;
describe("meta", () => {
    describe.skip("Variable expressions", () => {
        const cases = [
            {
                code: "const { is } = adone",
                result: ["global", "adone", "adone.is"],
                globals: ["global", "adone", "is"]
            },
            {
                code: "const { exception, netron } = adone",
                result: ["global", "adone", "adone.x", "adone.netron"],
                globals: ["global", "adone", "x", "netron"]
            },
            {
                code: "const { tag, meta, x, configuration } = adone",
                result: ["global", "adone", "adone.tag", "adone.x", "adone.meta", "adone.configuration"],
                globals: ["global", "adone", "tag", "x", "meta", "configuration"]
            },
            {
                code: "const { Private, Public } = adone.netron.decorator",
                result: ["global", "adone", "adone.netron", "adone.netron.decorator"],
                globals: ["global", "adone"]
            },
            {
                code: "const { decorator } = adone.netron",
                result: ["global", "adone", "adone.netron", "adone.netron.decorator"],
                globals: ["global", "adone", "decorator"]
            },
            {
                code: "const { decorator: { Public, Private } } = adone.netron",
                result: ["global", "adone", "adone.netron", "adone.netron.decorator"],
                globals: ["global", "adone"]
            },
            {
                code: "const { netron: { decorator: { Public, Private } } } = adone",
                result: ["global", "adone", "adone.netron", "adone.netron.decorator"],
                globals: ["global", "adone"]
            },
            {
                code: "const { is, vendor: { lodash }, netron: { decorator: { Public, Private } } } = adone",
                result: ["global", "adone", "adone.is", "adone.netron", "adone.netron.decorator", "adone.vendor", "adone.vendor.lodash"],
                globals: ["global", "adone", "is", "lodash"]
            }
        ];

        for (const cs of cases) {
            it(cs.code, () => {
                const inspector = new Inspector(cs.code);
                inspector.analyze();
                assert.sameMembers(inspector.namespaces, cs.result);
                assert.sameMembers(inspector.globals, cs.globals);
            });
        }
    });
});
