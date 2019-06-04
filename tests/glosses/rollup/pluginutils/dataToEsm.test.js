const {
    rollup: { pluginutils: { dataToEsm } }
} = adone;

describe("dataToEsm", () => {
    it("outputs treeshakeable data", () => {
        expect(dataToEsm({ some: "data", another: "data" })).to.be.equal(
            'export var some = "data";\nexport var another = "data";\nexport default {\n\tsome: some,\n\tanother: another\n};\n'
        );
    });

    it("handles illegal identifiers, object shorthand, preferConst", () => {
        expect(
            dataToEsm({ 1: "data", default: "data" }, { objectShorthand: true, preferConst: true })
        ).to.be.equal('export default {\n\t"1": "data",\n\t"default": "data"\n};\n');
    });

    it("supports non-JSON data", () => {
        const date = new Date();
        expect(dataToEsm({ inf: Infinity, date, number: NaN, regexp: /.*/ })).to.be.equal(
            `export var inf = Infinity;\nexport var date = new Date(${
            date.getTime()
            });\nexport var number = NaN;\nexport var regexp = /.*/;\nexport default {\n\tinf: inf,\n\tdate: date,\n\tnumber: number,\n\tregexp: regexp\n};\n`
        );
    });

    it("supports a compact argument", () => {
        expect(
            dataToEsm({ some: "data", another: "data" }, { compact: true, objectShorthand: true })
        ).to.be.equal('export var some="data";export var another="data";export default{some,another};');
        expect(
            dataToEsm(
                { some: { deep: { object: "definition", here: "here" } }, another: "data" },
                { compact: true, objectShorthand: false }
            )
        ).to.be.equal(
            'export var some={deep:{object:"definition",here:"here"}};export var another="data";export default{some:some,another:another};'
        );
    });

    it("supports nested objects", () => {
        const obj = { a: { b: "c", d: ["e", "f"] } };
        expect(dataToEsm({ obj })).to.be.equal(
            'export var obj = {\n\ta: {\n\t\tb: "c",\n\t\td: [\n\t\t\t"e",\n\t\t\t"f"\n\t\t]\n\t}\n};\nexport default {\n\tobj: obj\n};\n'
        );
    });

    it("supports nested arrays", () => {
        const arr = ["a", "b"];
        expect(dataToEsm({ arr })).to.be.equal(
            'export var arr = [\n\t"a",\n\t"b"\n];\nexport default {\n\tarr: arr\n};\n'
        );
    });

    it("serializes null", () => {
        expect(dataToEsm({ null: null })).to.be.equal('export default {\n\t"null": null\n};\n');
    });

    it("supports default only", () => {
        const arr = ["a", "b"];
        expect(dataToEsm({ arr }, { namedExports: false })).to.be.equal(
            'export default {\n\tarr: [\n\t\t"a",\n\t\t"b"\n\t]\n};'
        );
    });

    it("exports default only for arrays", () => {
        const arr = ["a", "b"];
        expect(dataToEsm(arr)).to.be.equal('export default [\n\t"a",\n\t"b"\n];');
    });

    it("exports default only for null", () => {
        expect(dataToEsm(null)).to.be.equal("export default null;");
    });

    it("exports default only for primitive values", () => {
        expect(dataToEsm("some string")).to.be.equal('export default "some string";');
    });

    it("supports empty keys", () => {
        expect(dataToEsm({ a: "x", "": "y" })).to.be.equal(
            'export var a = "x";\nexport default {\n\ta: a,\n' + '\t"": "y"\n};\n'
        );
    });
});
