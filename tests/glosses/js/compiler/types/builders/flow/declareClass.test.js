const {
    js: { compiler: { types: t } }
} = adone;

describe.todo("builders", () => {
    describe("flow", () => {
        describe("declareClass", () => {
            it("accept TypeParameterDeclaration as typeParameters", () => {
                const typeParameter = t.typeParameter(null, null, null);
                typeParameter.name = "T";
                const declaredClass = t.declareClass(
                    t.identifier("A"),
                    t.typeParameterDeclaration([typeParameter]),
                    [],
                    t.objectTypeAnnotation([], [], [], []),
                );
                expect(t.isDeclareClass(declaredClass)).to.be.true;
            });

            it("not accept typeParameterInstantiation as typeParameters", () => {
                expect(() =>
                    t.declareClass(
                        t.identifier("A"),
                        t.typeParameterInstantiation([
                            t.genericTypeAnnotation(t.identifier("T"))
                        ]),
                        [],
                        t.objectTypeAnnotation([], [], [], []),
                    ),
                ).to.throw(Error);
            });
        });
    });
});
