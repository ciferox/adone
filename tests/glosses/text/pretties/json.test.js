const { text: { pretty }, cui } = adone;

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
            cui.style.green("- ") + input[0],
            cui.style.green("- ") + input[1]
        ].join("\n"));
    });

    it("should output a function", () => {
        const input = ["first string", function (a) {
            return a;
        }];
        const output = pretty.json(input);

        assert.equal(output, [
            cui.style.green("- ") + input[0],
            `${cui.style.green("- ")}function() {}`
        ].join("\n"));
    });

    it("should output an array of arrays", () => {
        const input = ["first string", ["nested 1", "nested 2"], "second string"];
        const output = pretty.json(input);

        assert.equal(output, [
            cui.style.green("- ") + input[0],
            cui.style.green("- "),
            `  ${cui.style.green("- ")}${input[1][0]}`,
            `  ${cui.style.green("- ")}${input[1][1]}`,
            cui.style.green("- ") + input[2]
        ].join("\n"));
    });

    it("should output a hash of strings", () => {
        const input = { param1: "first string", param2: "second string" };
        const output = pretty.json(input);

        assert.equal(output, [
            `${cui.style.green("param1: ")}first string`,
            `${cui.style.green("param2: ")}second string`
        ].join("\n"));
    });

    it("should output a hash of hashes", () => {
        const input = {
            firstParam: { subparam: "first string", subparam2: "another string" },
            secondParam: "second string"
        };
        const output = pretty.json(input);

        assert.equal(output, [
            cui.style.green("firstParam: "),
            `  ${cui.style.green("subparam: ")} first string`,
            `  ${cui.style.green("subparam2: ")}another string`,
            `${cui.style.green("secondParam: ")}second string`
        ].join("\n"));
    });

    it("should indent correctly the hashes keys", () => {
        const input = { veryLargeParam: "first string", param: "second string" };
        const output = pretty.json(input);

        assert.equal(output, [
            `${cui.style.green("veryLargeParam: ")}first string`,
            `${cui.style.green("param: ")}         second string`
        ].join("\n"));
    });

    it("should allow to disable values aligning with longest index", () => {
        const input = { veryLargeParam: "first string", param: "second string" };
        const output = pretty.json(input, { noAlign: true });

        assert.equal(output, [
            `${cui.style.green("veryLargeParam: ")}first string`,
            `${cui.style.green("param: ")}second string`
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
            cui.style.green("firstParam: "),
            `  ${cui.style.green("subparam: ")} first string`,
            `  ${cui.style.green("subparam2: ")}another string`,
            `  ${cui.style.green("subparam3: ")}`,
            `    ${cui.style.green("- ")}different`,
            `    ${cui.style.green("- ")}values`,
            `    ${cui.style.green("- ")}in an array`,
            `${cui.style.green("secondParam: ")}second string`,
            cui.style.green("anArray: "),
            `  ${cui.style.green("- ")}`,
            `    ${cui.style.green("param3: ")} value`,
            `    ${cui.style.green("param10: ")}other value`,
            cui.style.green("emptyArray: "),
            "  (empty array)"
        ].join("\n"));
    });

    it("should allow to configure colors for hash keys", () => {
        const input = { param1: "first string", param2: "second string" };
        const output = pretty.json(input, { keysColor: "blue" });

        assert.equal(output, [
            `${cui.style.blue("param1: ")}first string`,
            `${cui.style.blue("param2: ")}second string`
        ].join("\n"));
    });

    it("should allow to configure colors for numbers", () => {
        const input = { param1: 17, param2: 22.3 };
        const output = pretty.json(input, { numberColor: "red" });

        assert.equal(output, [
            cui.style.green("param1: ") + cui.style.red("17"),
            cui.style.green("param2: ") + cui.style.red("22.3")
        ].join("\n"));
    });

    it("should allow to configure the default indentation", () => {
        const input = { param: ["first string", "second string"] };
        const output = pretty.json(input, { defaultIndentation: 4 });

        assert.equal(output, [
            cui.style.green("param: "),
            `    ${cui.style.green("- ")}first string`,
            `    ${cui.style.green("- ")}second string`
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
            cui.style.blue("param1: ") + cui.style.red("first string"),
            cui.style.blue("param2: ") + cui.style.red("second string")
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

        assert.equal(output, `${cui.style.green("installs: ")}first string, second string, false, 13`);

        input = { installs: [["first string", "second string"], "third string"] };
        output = pretty.json(input, { inlineArrays: true });

        assert.equal(output, [
            cui.style.green("installs: "),
            `  ${cui.style.green("- ")}first string, second string`,
            `  ${cui.style.green("- ")}third string`
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
            `${cui.style.green("param1: ")}first string`,
            `${cui.style.green("param2: ")}second string`
        ].join("\n"));
    });

    describe("Printing numbers, booleans and other objects", () => {
        it("should print numbers correctly ", () => {
            const input = 12345;
            const output = pretty.json(input, {}, 4);

            assert.equal(output, `    ${cui.style.blue("12345")}`);
        });

        it("should print booleans correctly ", () => {
            let input = true;
            let output = pretty.json(input, {}, 4);

            assert.equal(output, `    ${cui.style.green("true")}`);

            input = false;
            output = pretty.json(input, {}, 4);

            assert.equal(output, `    ${cui.style.red("false")}`);
        });

        it("should print a null object correctly ", () => {
            const input = null;
            const output = pretty.json(input, {}, 4);

            assert.equal(output, `    ${cui.style.grey("null")}`);
        });

        it("should print an Error correctly ", () => {
            Error.stackTraceLimit = 1;
            const input = new Error("foo");
            const stack = input.stack.split("\n");
            const output = pretty.json(input, {}, 4);

            assert.equal(output, [
                `    ${cui.style.green("message: ")}foo`,
                `    ${cui.style.green("stack: ")}`,
                `      ${cui.style.green("- ")}${stack[0]}`,
                `      ${cui.style.green("- ")}${stack[1]}`
            ].join("\n"));
        });

        it("should print serializable items in an array inline", () => {
            const dt = new Date();
            const output = pretty.json(["a", 3, null, true, false, dt]);

            assert.equal(output, [
                `${cui.style.green("- ")}a`,
                cui.style.green("- ") + cui.style.blue("3"),
                cui.style.green("- ") + cui.style.grey("null"),
                cui.style.green("- ") + cui.style.green("true"),
                cui.style.green("- ") + cui.style.red("false"),
                cui.style.green("- ") + dt
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
                `    ${cui.style.green("dt1: ")}${dt1.toString()}`,
                `    ${cui.style.green("dt2: ")}${dt2.toString()}`
            ].join("\n"));
        });
    });
});
