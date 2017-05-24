adone.run({
    initialize() {
        this.defineArguments({
            arguments: [
                { name: "number", default: 4 },
                { name: "boolean-true", default: true },
                { name: "boolean-false", default: false },
                { name: "null", default: null },
                { name: "undefined", default: undefined },
                { name: "choices", choices: [1, 2, 3, "hello", false], default: 2, help: "must be one of" }
            ],
            options: [
                { name: "--array", nargs: 1, default: ["", "1", 2], help: "some text" },
                { name: "--nested-array", holder: "AA", nargs: 1, default: [[1], [false], [[{ a: 2 }]]] },
                { name: "--object", nargs: 1, default: { a: 1, b: "123", c: [{ b: 4, c: "2" }] } }
            ],
            commands: [
                { name: "command-1", help: "this is command 1" },
                { name: "command-2", help: "{magenta-bg}Help message styling{/}" },
                { name: "command-3" },
                { name: "command-4", help: "this is command 5" },
                { name: "command-5" }
            ]
        });
    },
    main() {
        adone.log("it works");
    }
});
