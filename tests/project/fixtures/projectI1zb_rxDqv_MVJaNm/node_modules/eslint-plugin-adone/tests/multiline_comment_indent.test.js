const name = "multiline-comment-indent";

describe(name, function () {
    const valid = this.valid(name);
    const invalid = this.invalid(name);

    const indentError = "stars must have identical indent";
    const indentErrors = [indentError];
    const styleError = "multiline comments must be like\n/**\n *\n */";
    const styleErrors = [styleError];
    const missingStarError = "each line must start with *";
    const missingStarErrors = [missingStarError];
    const missingSpaceError = "space must be after *";
    const missingSpaceErrors = [missingSpaceError];
    const extraSpaceError = "only one space must be after *";
    const extraSpaceErrors = [extraSpaceError];
    const extraStarError = "must be only one * initial star";
    const extraStarErrors = [extraStarError];

    describe("common", () => {
        valid("valid with no comments", {
            code: "class A {}"
        });

        valid("valid with correct comment", {
            code: `
                /**
                 * A
                 * B
                 */
                class A {}
            `
        });

        invalid("invalid with incorrect indent", {
            code: `
                /**
                * A
                * B
                */
                class A {}
            `,
            output: `
                /**
                 * A
                 * B
                 */
                class A {}
            `,
            errors: indentErrors
        });

        invalid("invalid with incorrect indent", {
            code: `
                /**
                  * A
                * B
                 */
                class A {}
            `,
            output: `
                /**
                 * A
                 * B
                 */
                class A {}
            `,
            errors: indentErrors
        });

        valid("valid with line comment", {
            code: `
                // A
                class A {}
            `
        });

        invalid("invalid for different style multiline comments", {
            code: `
                /* A */
                class A {}
            `,
            output: `
                /**
                 * A
                 */
                class A {}
            `,
            errors: styleErrors
        });

        invalid("invalid for different style multiline comments", {
            code: `
                /* A
                 * B
                 */
                class A {}
            `,
            output: `
                /**
                 * A
                 * B
                 */
                class A {}
            `,
            errors: styleErrors
        });

        invalid("invalid for different style multiline comments", {
            code: `
                /*
                 * A
                 * B
                 */
                class A {}
            `,
            output: `
                /**
                 * A
                 * B
                 */
                class A {}
            `,
            errors: styleErrors
        });

        invalid("invalid with mising stars", {
            code: `
                /**
                 * A
                 * B
                 C
                 */
                class A {}
            `,
            output: `
                /**
                 * A
                 * B
                 * C
                 */
                class A {}
            `,
            errors: missingStarErrors
        });

        invalid("invalid with mising stars", {
            code: `
                /*
                 * A
                 * B
                 C
                 */
                class A {}
            `,
            output: `
                /**
                 * A
                 * B
                 * C
                 */
                class A {}
            `,
            errors: styleErrors
        });

        invalid("invalid with mising stars", {
            code: `
                /*
                 C
                 */
                class A {}
            `,
            output: `
                /**
                 * C
                 */
                class A {}
            `,
            errors: styleErrors
        });

        invalid("invalid with mising stars", {
            code: `
                /*

                 C
                 */
                class A {}
            `,
            output: `
                /**
                 *
                 * C
                 */
                class A {}
            `,
            errors: styleErrors
        });

        invalid("invalid with missing spaces", {
            code: `
                /**
                 *A
                 */
                class A {}
            `,
            output: `
                /**
                 * A
                 */
                class A {}
            `,
            errors: missingSpaceErrors
        });

        invalid("extra stars", {
            code: `
                /**
                 ** A
                 */
                class A {}
            `,
            output: `
                /**
                 * A
                 */
                class A {}
            `,
            errors: missingSpaceErrors
        });
    });

    describe("method definition", () => {
        valid("correct method definition", {
            code: `
                class A {
                    /**
                     * A
                     */
                    b() {}
                }
            `
        });

        invalid("incorrect indent", {
            code: `
                class A {
                    /**
                    * A
                    * B
                    */
                    b() {}
                }
            `,
            output: `
                class A {
                    /**
                     * A
                     * B
                     */
                    b() {}
                }
            `,
            errors: indentErrors
        });
    });

    describe("function declaration", () => {
        valid("correct function declaration", {
            code: `
                /**
                 * A
                 * B
                 */
                function f() {

                }
            `
        });

        invalid("incorrect indent", {
            code: `
                /**
                * A
                * B
                */
                function f() {

                }
            `,
            output: `
                /**
                 * A
                 * B
                 */
                function f() {

                }
            `,
            errors: indentErrors
        });
    });

    describe("variable declaration", () => {
        valid("valid variable declaration", {
            code: `
                /**
                 * A
                 * B
                 */
                const a = 1;
            `
        });

        invalid("incorrect indent", {
            code: `
                /**
                * A
                * B
                */
                const a = 1;
            `,
            output: `
                /**
                 * A
                 * B
                 */
                const a = 1;
            `,
            errors: indentErrors
        });
    });

    describe("expression statement", () => {
        valid("valid statement", {
            code: `
                /**
                 *
                 */
                doSomething();
            `
        });

        invalid("incorrect indent", {
            code: `
                /**
                * A
                * B
                */
                doSomething();
            `,
            output: `
                /**
                 * A
                 * B
                 */
                doSomething();
            `,
            errors: indentErrors
        });
    });

    describe("named export", () => {
        valid("valid export", {
            code: `
                /**
                 * A
                 * B
                 */
                export const a = 1;
            `
        });

        invalid("incorrect indent", {
            code: `
                /**
                * A
                * B
                */
                export const a = 1;
            `,
            output: `
                /**
                 * A
                 * B
                 */
                export const a = 1;
            `,
            errors: indentErrors
        });
    });

    describe("default export", () => {
        valid("valid export", {
            code: `
                /**
                 * A
                 * B
                 */
                export default function f() {}
            `
        });

        invalid("incorrect indent", {
            code: `
                /**
                * A
                * B
                */
                export default function f() {}
            `,
            output: `
                /**
                 * A
                 * B
                 */
                export default function f() {}
            `,
            errors: indentErrors
        });
    });
});
