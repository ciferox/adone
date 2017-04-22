const { text: { pretty }, terminal } = adone;

describe("pretty json", () => {
    it("should output a string exactly equal as the input", () => {
        const input = "This is a string";
        const output = pretty.json(input);

        assert.equal(output, input);
    });

    it("should output a string with indentation", () => {
        const input = "This is a string";
        const output = pretty.json(input, {}, 4);

        assert.equal(output, `    ${input}`);
    });

    it("should output a multiline string with indentation", () => {
        const input = "multiple\nlines";
        const output = pretty.json(input, {}, 4);

        assert.equal(output, '    """\n      multiple\n      lines\n    """');
    });

    it("should output an array of strings", () => {
        const input = ["first string", "second string"];
        const output = pretty.json(input);

        assert.equal(output, [
            terminal.green("- ") + input[0],
            terminal.green("- ") + input[1]
        ].join("\n"));
    });

    it("should output a function", () => {
        const input = ["first string", function (a) {
            return a;
        }];
        const output = pretty.json(input);

        assert.equal(output, [
            terminal.green("- ") + input[0],
            `${terminal.green("- ")}function() {}`
        ].join("\n"));
    });

    it("should output an array of arrays", () => {
        const input = ["first string", ["nested 1", "nested 2"], "second string"];
        const output = pretty.json(input);

        assert.equal(output, [
            terminal.green("- ") + input[0],
            terminal.green("- "),
            `  ${terminal.green("- ")}${input[1][0]}`,
            `  ${terminal.green("- ")}${input[1][1]}`,
            terminal.green("- ") + input[2]
        ].join("\n"));
    });

    it("should output a hash of strings", () => {
        const input = { param1: "first string", param2: "second string" };
        const output = pretty.json(input);

        assert.equal(output, [
            `${terminal.green("param1: ")}first string`,
            `${terminal.green("param2: ")}second string`
        ].join("\n"));
    });

    it("should output a hash of hashes", () => {
        const input = {
            firstParam: { subparam: "first string", subparam2: "another string" },
            secondParam: "second string"
        };
        const output = pretty.json(input);

        assert.equal(output, [
            terminal.green("firstParam: "),
            `  ${terminal.green("subparam: ")} first string`,
            `  ${terminal.green("subparam2: ")}another string`,
            `${terminal.green("secondParam: ")}second string`
        ].join("\n"));
    });

    it("should indent correctly the hashes keys", () => {
        const input = { veryLargeParam: "first string", param: "second string" };
        const output = pretty.json(input);

        assert.equal(output, [
            `${terminal.green("veryLargeParam: ")}first string`,
            `${terminal.green("param: ")}         second string`
        ].join("\n"));
    });

    it("should allow to disable values aligning with longest index", () => {
        const input = { veryLargeParam: "first string", param: "second string" };
        const output = pretty.json(input, { noAlign: true });

        assert.equal(output, [
            `${terminal.green("veryLargeParam: ")}first string`,
            `${terminal.green("param: ")}second string`
        ].join("\n"));
    });

    it("should output a really nested object", () => {
        const input = {
            firstParam: {
                subparam: "first string",
                subparam2: "another string",
                subparam3: ["different", "values", "in an array"]
            },
            secondParam: "second string",
            anArray: [{
                param3: "value",
                param10: "other value"
            }],
            emptyArray: []
        };

        const output = pretty.json(input);

        assert.equal(output, [
            terminal.green("firstParam: "),
            `  ${terminal.green("subparam: ")} first string`,
            `  ${terminal.green("subparam2: ")}another string`,
            `  ${terminal.green("subparam3: ")}`,
            `    ${terminal.green("- ")}different`,
            `    ${terminal.green("- ")}values`,
            `    ${terminal.green("- ")}in an array`,
            `${terminal.green("secondParam: ")}second string`,
            terminal.green("anArray: "),
            `  ${terminal.green("- ")}`,
            `    ${terminal.green("param3: ")} value`,
            `    ${terminal.green("param10: ")}other value`,
            terminal.green("emptyArray: "),
            "  (empty array)"
        ].join("\n"));
    });

    it("should allow to configure colors for hash keys", () => {
        const input = { param1: "first string", param2: "second string" };
        const output = pretty.json(input, { keysColor: "blue" });

        assert.equal(output, [
            `${terminal.blue("param1: ")}first string`,
            `${terminal.blue("param2: ")}second string`
        ].join("\n"));
    });

    it("should allow to configure colors for numbers", () => {
        const input = { param1: 17, param2: 22.3 };
        const output = pretty.json(input, { numberColor: "red" });

        assert.equal(output, [
            terminal.green("param1: ") + terminal.red("17"),
            terminal.green("param2: ") + terminal.red("22.3")
        ].join("\n"));
    });

    it("should allow to configure the default indentation", () => {
        const input = { param: ["first string", "second string"] };
        const output = pretty.json(input, { defaultIndentation: 4 });

        assert.equal(output, [
            terminal.green("param: "),
            `    ${terminal.green("- ")}first string`,
            `    ${terminal.green("- ")}second string`
        ].join("\n"));
    });

    it("should allow to configure the empty message for arrays", () => {
        const input = [];
        const output = pretty.json(input, { emptyArrayMsg: "(empty)" });

        assert.equal(output, [
            "(empty)"
        ].join("\n"));
    });

    it("should allow to configure colors for strings", () => {
        const input = { param1: "first string", param2: "second string" };
        const output = pretty.json(
            input,
            { keysColor: "blue", stringColor: "red" }
        );

        assert.equal(output, [
            terminal.blue("param1: ") + terminal.red("first string"),
            terminal.blue("param2: ") + terminal.red("second string")
        ].join("\n"));
    });

    it("should allow to not use colors", () => {
        const input = { param1: "first string", param2: ["second string"] };
        const output = pretty.json(input, { noColor: true });

        assert.equal(output, [
            "param1: first string",
            "param2: ",
            "  - second string"
        ].join("\n"));
    });

    it("should allow to print simple arrays inline", () => {
        let input = { installs: ["first string", "second string", false, 13] };
        let output = pretty.json(input, { inlineArrays: true });

        assert.equal(output, `${terminal.green("installs: ")}first string, second string, false, 13`);

        input = { installs: [["first string", "second string"], "third string"] };
        output = pretty.json(input, { inlineArrays: true });

        assert.equal(output, [
            terminal.green("installs: "),
            `  ${terminal.green("- ")}first string, second string`,
            `  ${terminal.green("- ")}third string`
        ].join("\n"));
    });

    it("should not print an object prototype", () => {
        const Input = function () {
            this.param1 = "first string";
            this.param2 = "second string";
        };
        Input.prototype = { randomProperty: "idontcare" };

        const output = pretty.json(new Input());

        assert.equal(output, [
            `${terminal.green("param1: ")}first string`,
            `${terminal.green("param2: ")}second string`
        ].join("\n"));
    });

    describe("Printing numbers, booleans and other objects", () => {
        it("should print numbers correctly ", () => {
            const input = 12345;
            const output = pretty.json(input, {}, 4);

            assert.equal(output, `    ${terminal.blue("12345")}`);
        });

        it("should print booleans correctly ", () => {
            let input = true;
            let output = pretty.json(input, {}, 4);

            assert.equal(output, `    ${terminal.green("true")}`);

            input = false;
            output = pretty.json(input, {}, 4);

            assert.equal(output, `    ${terminal.red("false")}`);
        });

        it("should print a null object correctly ", () => {
            const input = null;
            const output = pretty.json(input, {}, 4);

            assert.equal(output, `    ${terminal.grey("null")}`);
        });

        it("should print an Error correctly ", () => {
            Error.stackTraceLimit = 1;
            const input = new Error("foo");
            const stack = input.stack.split("\n");
            const output = pretty.json(input, {}, 4);

            assert.equal(output, [
                `    ${terminal.green("message: ")}foo`,
                `    ${terminal.green("stack: ")}`,
                `      ${terminal.green("- ")}${stack[0]}`,
                `      ${terminal.green("- ")}${stack[1]}`
            ].join("\n"));
        });

        it("should print serializable items in an array inline", () => {
            const dt = new Date();
            const output = pretty.json(["a", 3, null, true, false, dt]);

            assert.equal(output, [
                `${terminal.green("- ")}a`,
                terminal.green("- ") + terminal.blue("3"),
                terminal.green("- ") + terminal.grey("null"),
                terminal.green("- ") + terminal.green("true"),
                terminal.green("- ") + terminal.red("false"),
                terminal.green("- ") + dt
            ].join("\n"));
        });

        it("should print dates correctly", () => {
            const input = new Date();
            const expected = input.toString();
            const output = pretty.json(input, {}, 4);

            assert.equal(output, `    ${expected}`);
        });

        it("should print dates in objects correctly", () => {
            const dt1 = new Date();
            const dt2 = new Date();

            const input = {
                dt1: dt2,
                dt2
            };

            const output = pretty.json(input, {}, 4);

            assert.equal(output, [
                `    ${terminal.green("dt1: ")}${dt1.toString()}`,
                `    ${terminal.green("dt2: ")}${dt2.toString()}`
            ].join("\n"));
        });
    });
});
