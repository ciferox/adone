describe("util", "inflection", () => {
    const { inflection } = adone.util;

    describe("singularizeWord", () => {
        const { singularizeWord } = inflection;

        it("should singularize the given word", () => {
            expect(singularizeWord("status")).to.be.equal("status");
            expect(singularizeWord("child")).to.be.equal("child");
            expect(singularizeWord("children")).to.be.equal("child");
            expect(singularizeWord("address")).to.be.equal("address");
            expect(singularizeWord("man")).to.be.equal("man");
            expect(singularizeWord("woman")).to.be.equal("woman");
            expect(singularizeWord("women")).to.be.equal("woman");
            expect(singularizeWord("person")).to.be.equal("person");
            expect(singularizeWord("people")).to.be.equal("person");
            expect(singularizeWord("movies")).to.be.equal("movie");
            expect(singularizeWord("queries")).to.be.equal("query");
            expect(singularizeWord("octopi")).to.be.equal("octopus");
            expect(singularizeWord("Hats")).to.be.equal("Hat");
            expect(singularizeWord("lives")).to.be.equal("life");
            expect(singularizeWord("baths")).to.be.equal("bath");
            expect(singularizeWord("calves")).to.be.equal("calf");
            expect(singularizeWord("feet")).to.be.equal("foot");
            expect(singularizeWord("books")).to.be.equal("book");
            expect(singularizeWord("geese")).to.be.equal("goose");
            expect(singularizeWord("teeth")).to.be.equal("tooth");
            expect(singularizeWord("tooth")).to.be.equal("tooth");
            expect(singularizeWord("knives")).to.be.equal("knife");
            expect(singularizeWord("halves")).to.be.equal("half");
            expect(singularizeWord("caves")).to.be.equal("cave");
            expect(singularizeWord("saves")).to.be.equal("save");
            expect(singularizeWord("street")).to.be.equal("street");
            expect(singularizeWord("streets")).to.be.equal("street");
            expect(singularizeWord("data")).to.be.equal("datum");
            expect(singularizeWord("meta")).to.be.equal("metum");
            expect(singularizeWord("whereases")).to.be.equal("whereas");
            expect(singularizeWord("guys", "person")).to.be.equal("person");
            expect(singularizeWord("matrices")).to.be.equal("matrix");
            expect(singularizeWord("vertices")).to.be.equal("vertex");
            expect(singularizeWord("canvases")).to.be.equal("canvas");
            expect(singularizeWord("campuses")).to.be.equal("campus");
            expect(singularizeWord("campus")).to.be.equal("campus");
            expect(singularizeWord("criteria")).to.be.equal("criterion");
            expect(singularizeWord("criterion")).to.be.equal("criterion");
            expect(singularizeWord("genera")).to.be.equal("genus");
            expect(singularizeWord("genus")).to.be.equal("genus");
            expect(singularizeWord("minus")).to.be.equal("minus");
        });
    });

    describe("pluralizeWord", () => {
        const { pluralizeWord } = inflection;

        it("should pluralize the given word", () => {
            expect(pluralizeWord("people")).to.be.equal("people");
            expect(pluralizeWord("men")).to.be.equal("men");
            expect(pluralizeWord("women")).to.be.equal("women");
            expect(pluralizeWord("woman")).to.be.equal("women");
            expect(pluralizeWord("person")).to.be.equal("people");
            expect(pluralizeWord("octopus")).to.be.equal("octopi");
            expect(pluralizeWord("human")).to.be.equal("humans");
            expect(pluralizeWord("aircraft")).to.be.equal("aircraft");
            expect(pluralizeWord("luck")).to.be.equal("luck");
            expect(pluralizeWord("Hat")).to.be.equal("Hats");
            expect(pluralizeWord("life")).to.be.equal("lives");
            expect(pluralizeWord("bath")).to.be.equal("baths");
            expect(pluralizeWord("calf")).to.be.equal("calves");
            expect(pluralizeWord("foot")).to.be.equal("feet");
            expect(pluralizeWord("book")).to.be.equal("books");
            expect(pluralizeWord("goose")).to.be.equal("geese");
            expect(pluralizeWord("tooth")).to.be.equal("teeth");
            expect(pluralizeWord("teeth")).to.be.equal("teeth");
            expect(pluralizeWord("knife")).to.be.equal("knives");
            expect(pluralizeWord("half")).to.be.equal("halves");
            expect(pluralizeWord("cave")).to.be.equal("caves");
            expect(pluralizeWord("save")).to.be.equal("saves");
            expect(pluralizeWord("street")).to.be.equal("streets");
            expect(pluralizeWord("streets")).to.be.equal("streets");
            expect(pluralizeWord("data")).to.be.equal("data");
            expect(pluralizeWord("meta")).to.be.equal("meta");
            expect(pluralizeWord("summons")).to.be.equal("summonses");
            expect(pluralizeWord("whereas")).to.be.equal("whereases");
            expect(pluralizeWord("person", "guys")).to.be.equal("guys");
            expect(pluralizeWord("index")).to.be.equal("indices");
            expect(pluralizeWord("matrix")).to.be.equal("matrices");
            expect(pluralizeWord("vertex")).to.be.equal("vertices");
            expect(pluralizeWord("canvas")).to.be.equal("canvases");
            expect(pluralizeWord("campus")).to.be.equal("campuses");
            expect(pluralizeWord("campuses")).to.be.equal("campuses");
            expect(pluralizeWord("criterion")).to.be.equal("criteria");
            expect(pluralizeWord("criteria")).to.be.equal("criteria");
            expect(pluralizeWord("genus")).to.be.equal("genera");
            expect(pluralizeWord("genera")).to.be.equal("genera");
        });
    });

    describe("underscore", () => {
        const { underscore } = inflection;

        it("should transform the given word with underscore", () => {
            expect(underscore("MessageProperties")).to.be.equal("message_properties");
            expect(underscore("messageProperties")).to.be.equal("message_properties");
            expect(underscore("MP")).to.be.equal("m_p");
            expect(underscore("MP", true)).to.be.equal("MP");
        });
    });
});
