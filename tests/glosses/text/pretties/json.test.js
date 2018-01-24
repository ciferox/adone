const {
    text: { pretty },
    terminal: { styler }
} = adone;

describe("text", "pretty", "json", () => {
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
            styler.green("- ") + input[0],
            styler.green("- ") + input[1]
        ].join("\n"));
    });

    it("should output a function", () => {
        const input = ["first string", function (a) {
            return a;
        }];
        const output = pretty.json(input);

        assert.equal(output, [
            styler.green("- ") + input[0],
            `${styler.green("- ")}function() {}`
        ].join("\n"));
    });

    it("should output an array of arrays", () => {
        const input = ["first string", ["nested 1", "nested 2"], "second string"];
        const output = pretty.json(input);

        assert.equal(output, [
            styler.green("- ") + input[0],
            styler.green("- "),
            `  ${styler.green("- ")}${input[1][0]}`,
            `  ${styler.green("- ")}${input[1][1]}`,
            styler.green("- ") + input[2]
        ].join("\n"));
    });

    it("should output a hash of strings", () => {
        const input = { param1: "first string", param2: "second string" };
        const output = pretty.json(input);

        assert.equal(output, [
            `${styler.green("param1: ")}first string`,
            `${styler.green("param2: ")}second string`
        ].join("\n"));
    });

    it("should output a hash of hashes", () => {
        const input = {
            firstParam: { subparam: "first string", subparam2: "another string" },
            secondParam: "second string"
        };
        const output = pretty.json(input);

        assert.equal(output, [
            styler.green("firstParam: "),
            `  ${styler.green("subparam: ")} first string`,
            `  ${styler.green("subparam2: ")}another string`,
            `${styler.green("secondParam: ")}second string`
        ].join("\n"));
    });

    it("should indent correctly the hashes keys", () => {
        const input = { veryLargeParam: "first string", param: "second string" };
        const output = pretty.json(input);

        assert.equal(output, [
            `${styler.green("veryLargeParam: ")}first string`,
            `${styler.green("param: ")}         second string`
        ].join("\n"));
    });

    it("should allow to disable values aligning with longest index", () => {
        const input = { veryLargeParam: "first string", param: "second string" };
        const output = pretty.json(input, { noAlign: true });

        assert.equal(output, [
            `${styler.green("veryLargeParam: ")}first string`,
            `${styler.green("param: ")}second string`
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
            styler.green("firstParam: "),
            `  ${styler.green("subparam: ")} first string`,
            `  ${styler.green("subparam2: ")}another string`,
            `  ${styler.green("subparam3: ")}`,
            `    ${styler.green("- ")}different`,
            `    ${styler.green("- ")}values`,
            `    ${styler.green("- ")}in an array`,
            `${styler.green("secondParam: ")}second string`,
            styler.green("anArray: "),
            `  ${styler.green("- ")}`,
            `    ${styler.green("param3: ")} value`,
            `    ${styler.green("param10: ")}other value`,
            styler.green("emptyArray: "),
            "  (empty array)"
        ].join("\n"));
    });

    it("should allow to configure colors for hash keys", () => {
        const input = { param1: "first string", param2: "second string" };
        const output = pretty.json(input, { keysColor: "blue" });

        assert.equal(output, [
            `${styler.blue("param1: ")}first string`,
            `${styler.blue("param2: ")}second string`
        ].join("\n"));
    });

    it("should allow to configure colors for numbers", () => {
        const input = { param1: 17, param2: 22.3 };
        const output = pretty.json(input, { numberColor: "red" });

        assert.equal(output, [
            styler.green("param1: ") + styler.red("17"),
            styler.green("param2: ") + styler.red("22.3")
        ].join("\n"));
    });

    it("should allow to configure the default indentation", () => {
        const input = { param: ["first string", "second string"] };
        const output = pretty.json(input, { defaultIndentation: 4 });

        assert.equal(output, [
            styler.green("param: "),
            `    ${styler.green("- ")}first string`,
            `    ${styler.green("- ")}second string`
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
            styler.blue("param1: ") + styler.red("first string"),
            styler.blue("param2: ") + styler.red("second string")
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

        assert.equal(output, `${styler.green("installs: ")}first string, second string, false, 13`);

        input = { installs: [["first string", "second string"], "third string"] };
        output = pretty.json(input, { inlineArrays: true });

        assert.equal(output, [
            styler.green("installs: "),
            `  ${styler.green("- ")}first string, second string`,
            `  ${styler.green("- ")}third string`
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
            `${styler.green("param1: ")}first string`,
            `${styler.green("param2: ")}second string`
        ].join("\n"));
    });

    describe("Printing numbers, booleans and other objects", () => {
        it("should print numbers correctly ", () => {
            const input = 12345;
            const output = pretty.json(input, {}, 4);

            assert.equal(output, `    ${styler.blue("12345")}`);
        });

        it("should print booleans correctly ", () => {
            let input = true;
            let output = pretty.json(input, {}, 4);

            assert.equal(output, `    ${styler.green("true")}`);

            input = false;
            output = pretty.json(input, {}, 4);

            assert.equal(output, `    ${styler.red("false")}`);
        });

        it("should print a null object correctly ", () => {
            const input = null;
            const output = pretty.json(input, {}, 4);

            assert.equal(output, `    ${styler.grey("null")}`);
        });

        it("should print an Error correctly ", () => {
            const orig = Error.stackTraceLimit;
            Error.stackTraceLimit = 1;
            try {
                const input = new Error("foo");
                const stack = input.stack.split("\n");
                const output = pretty.json(input, {}, 4);

                assert.equal(output, [
                    `    ${styler.green("message: ")}foo`,
                    `    ${styler.green("stack: ")}`,
                    `      ${styler.green("- ")}${stack[0]}`,
                    `      ${styler.green("- ")}${stack[1]}`
                ].join("\n"));
            } finally {
                Error.stackTraceLimit = orig;
            }
        });

        it("should print serializable items in an array inline", () => {
            const dt = new Date();
            const output = pretty.json(["a", 3, null, true, false, dt]);

            assert.equal(output, [
                `${styler.green("- ")}a`,
                styler.green("- ") + styler.blue("3"),
                styler.green("- ") + styler.grey("null"),
                styler.green("- ") + styler.green("true"),
                styler.green("- ") + styler.red("false"),
                styler.green("- ") + dt
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
                `    ${styler.green("dt1: ")}${dt1.toString()}`,
                `    ${styler.green("dt2: ")}${dt2.toString()}`
            ].join("\n"));
        });
    });
});
