describe("glosses", "net", "mail", "addressparser", () => {
    const { net: { mail: { __: { addressparser } } } } = adone;

    it("should handle single address correctly", () => {
        const input = "andris@tr.ee";
        const expected = [{
            address: "andris@tr.ee",
            name: ""
        }];
        expect(addressparser(input)).to.deep.equal(expected);
    });

    it("should handle multiple addresses correctly", () => {
        const input = "andris@tr.ee, andris@example.com";
        const expected = [{
            address: "andris@tr.ee",
            name: ""
        }, {
            address: "andris@example.com",
            name: ""
        }];
        expect(addressparser(input)).to.deep.equal(expected);
    });

    it("should handle unquoted name correctly", () => {
        const input = "andris <andris@tr.ee>";
        const expected = [{
            name: "andris",
            address: "andris@tr.ee"
        }];
        expect(addressparser(input)).to.deep.equal(expected);
    });

    it("should handle quoted name correctly", () => {
        const input = '"reinman, andris" <andris@tr.ee>';
        const expected = [{
            name: "reinman, andris",
            address: "andris@tr.ee"
        }];
        expect(addressparser(input)).to.deep.equal(expected);
    });

    it("should handle quoted semicolons correctly", () => {
        const input = '"reinman; andris" <andris@tr.ee>';
        const expected = [{
            name: "reinman; andris",
            address: "andris@tr.ee"
        }];
        expect(addressparser(input)).to.deep.equal(expected);
    });

    it("should handle unquoted name, unquoted address correctly", () => {
        const input = "andris andris@tr.ee";
        const expected = [{
            name: "andris",
            address: "andris@tr.ee"
        }];
        expect(addressparser(input)).to.deep.equal(expected);
    });

    it("should handle emtpy group correctly", () => {
        const input = "Undisclosed:;";
        const expected = [{
            name: "Undisclosed",
            group: []
        }];
        expect(addressparser(input)).to.deep.equal(expected);
    });

    it("should handle address group correctly", () => {
        const input = "Disclosed:andris@tr.ee, andris@example.com;";
        const expected = [{
            name: "Disclosed",
            group: [{
                address: "andris@tr.ee",
                name: ""
            }, {
                address: "andris@example.com",
                name: ""
            }]
        }];
        expect(addressparser(input)).to.deep.equal(expected);
    });

    it("should handle semicolon as a delimiter", () => {
        const input = "andris@tr.ee; andris@example.com;";
        const expected = [{
            address: "andris@tr.ee",
            name: ""
        }, {
            address: "andris@example.com",
            name: ""
        }];
        expect(addressparser(input)).to.deep.equal(expected);
    });

    it("should handle mixed group correctly", () => {
        const input = "Test User <test.user@mail.ee>, Disclosed:andris@tr.ee, andris@example.com;,,,, Undisclosed:;";
        const expected = [{
            address: "test.user@mail.ee",
            name: "Test User"
        }, {
            name: "Disclosed",
            group: [{
                address: "andris@tr.ee",
                name: ""
            }, {
                address: "andris@example.com",
                name: ""
            }]
        }, {
            name: "Undisclosed",
            group: []
        }];
        expect(addressparser(input)).to.deep.equal(expected);
    });

    it("semicolon as delimiter should not break group parsing", () => {
        const input = "Test User <test.user@mail.ee>; Disclosed:andris@tr.ee, andris@example.com;,,,, Undisclosed:; bob@example.com;";
        const expected = [{
            address: "test.user@mail.ee",
            name: "Test User"
        }, {
            name: "Disclosed",
            group: [{
                address: "andris@tr.ee",
                name: ""
            }, {
                address: "andris@example.com",
                name: ""
            }]
        }, {
            name: "Undisclosed",
            group: []
        }, {
            address: "bob@example.com",
            name: ""
        }];
        expect(addressparser(input)).to.deep.equal(expected);
    });

    it("should handle name from comment correctly", () => {
        const input = "andris@tr.ee (andris)";
        const expected = [{
            name: "andris",
            address: "andris@tr.ee"
        }];
        expect(addressparser(input)).to.deep.equal(expected);
    });

    it("should handle skip comment correctly", () => {
        const input = "andris@tr.ee (reinman) andris";
        const expected = [{
            name: "andris",
            address: "andris@tr.ee"
        }];
        expect(addressparser(input)).to.deep.equal(expected);
    });

    it("should handle missing address correctly", () => {
        const input = "andris";
        const expected = [{
            name: "andris",
            address: ""
        }];
        expect(addressparser(input)).to.deep.equal(expected);
    });

    it("should handle apostrophe in name correctly", () => {
        const input = "O'Neill";
        const expected = [{
            name: "O'Neill",
            address: ""
        }];
        expect(addressparser(input)).to.deep.equal(expected);
    });

    it("should handle particularily bad input, unescaped colon correctly", () => {
        const input = "FirstName Surname-WithADash :: Company <firstname@company.com>";
        const expected = [{
            name: "FirstName Surname-WithADash",
            group: [{
                name: undefined,
                group: [{
                    address: "firstname@company.com",
                    name: "Company"
                }]
            }]
        }];
        expect(addressparser(input)).to.deep.equal(expected);
    });

    // should not change an invalid email to valid email
    it("should handle invalid email address correctly", () => {
        const input = "name@address.com@address2.com";
        const expected = [{
            name: "",
            address: "name@address.com@address2.com"
        }];
        expect(addressparser(input)).to.deep.equal(expected);
    });

    it("should handle unexpected <", () => {
        const input = "reinman > andris < test <andris@tr.ee>";
        const expected = [{
            name: "reinman > andris",
            address: "andris@tr.ee"
        }];
        expect(addressparser(input)).to.deep.equal(expected);
    });
});
