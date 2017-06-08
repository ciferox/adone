describe("net", "mail", "Well-Known Services Tests", () => {
    const { net: { mail: { __: { wellKnown } } } } = adone;

    describe("#wellKnown", () => {

        it("Should find by key", () => {
            expect(wellKnown("Gmail")).to.deep.equal({
                host: "smtp.gmail.com",
                port: 465,
                secure: true
            });
        });

        it("Should find by alias", () => {
            expect(wellKnown("Google Mail")).to.deep.equal({
                host: "smtp.gmail.com",
                port: 465,
                secure: true
            });
        });

        it("Should find by domain", () => {
            expect(wellKnown("GoogleMail.com")).to.deep.equal({
                host: "smtp.gmail.com",
                port: 465,
                secure: true
            });
        });

        it("Should find no match", () => {
            expect(wellKnown("zzzzzz")).to.be.false;
        });

    });

});
