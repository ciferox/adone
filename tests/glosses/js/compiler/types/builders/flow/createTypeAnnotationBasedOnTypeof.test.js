const {
    js: { compiler: { types: {createTypeAnnotationBasedOnTypeof }}}
} = adone;

describe.todo("builders", () => {
    describe("flow", () => {
        describe("createTypeAnnotationBasedOnTypeof", () => {
            const values = {
                string: typeof "string",
                number: typeof 123,
                true: typeof true,
                object: typeof {},
                undefined: typeof undefined,
                function: typeof function () {},
                symbol: typeof Symbol()
            };

            for (const name in values) {
                const value = values[name];
                it(name, () => {
                    const result = createTypeAnnotationBasedOnTypeof(value);
                    expect(result).toMatchSnapshot();
                });
            }

            it("invalid", () => {
                expect(() =>
                    createTypeAnnotationBasedOnTypeof("thisdoesnotexist"),
                ).to.throw(Error);
            });
        });
    });
});
