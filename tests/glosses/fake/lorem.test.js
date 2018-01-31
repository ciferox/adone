const {
    is,
    fake
} = adone;

describe("lorem.js", () => {
    describe("words()", () => {
        beforeEach(() => {
            spy(fake.helpers, "shuffle");
        });

        afterEach(() => {
            fake.helpers.shuffle.restore();
        });

        context("when no 'num' param passed in", () => {
            it("returns three words", () => {
                const str = fake.lorem.words();
                const words = str.split(" ");
                assert.ok(is.array(words));
                assert.equal(true, words.length >= 3);
                // assert.ok(fake.helpers.shuffle.called);
            });
        });

        context("when 'num' param passed in", () => {
            it("returns requested number of words", () => {
                const str = fake.lorem.words(7);
                const words = str.split(" ");
                assert.ok(is.array(words));
                assert.equal(words.length, 7);
            });
        });
    });

    describe("slug()", () => {
        beforeEach(() => {
            spy(fake.helpers, "shuffle");
        });

        afterEach(() => {
            fake.helpers.shuffle.restore();
        });

        const validateSlug = function (wordCount, str) {
            assert.equal(1, str.match(/^[a-z][a-z-]*[a-z]$/).length);
            assert.equal(wordCount - 1, str.match(/-/g).length);
        };

        context("when no 'wordCount' param passed in", () => {
            it("returns a slug with three words", () => {
                const str = fake.lorem.slug();
                validateSlug(3, str);
            });
        });

        context("when 'wordCount' param passed in", () => {
            it("returns a slug with requested number of words", () => {
                const str = fake.lorem.slug(7);
                validateSlug(7, str);
            });
        });

    });

    /*
    describe("sentence()", function () {
        context("when no 'wordCount' or 'range' param passed in", function () {
            it("returns a string of at least three words", function () {
                spy(fake.lorem, 'words');
                sinon.stub(fake.random, 'number').returns(2);
                var sentence = fake.lorem.sentence();
                assert.ok(typeof sentence === 'string');
                var parts = sentence.split(' ');
                assert.equal(parts.length, 5); // default 3 plus stubbed 2.
                assert.ok(fake.lorem.words.calledWith(5));

                fake.lorem.words.restore();
                fake.random.number.restore();
            });
        });

        context("when 'wordCount' param passed in", function () {
            it("returns a string of at least the requested number of words", function () {
                spy(fake.lorem, 'words');
                sinon.stub(fake.random, 'number').withArgs(7).returns(2);
                var sentence = fake.lorem.sentence(10);

                assert.ok(typeof sentence === 'string');
                var parts = sentence.split(' ');
                assert.equal(parts.length, 12); // requested 10 plus stubbed 2.
                assert.ok(fake.lorem.words.calledWith(12));

                fake.lorem.words.restore();
                fake.random.number.restore();
            });
        });

        context("when 'wordCount' and 'range' params passed in", function () {
            it("returns a string of at least the requested number of words", function () {
                spy(fake.lorem, 'words');
                sinon.stub(fake.random, 'number').withArgs(4).returns(4);

                var sentence = fake.lorem.sentence(10, 4);

                assert.ok(typeof sentence === 'string');
                var parts = sentence.split(' ');
                assert.equal(parts.length, 14); // requested 10 plus stubbed 4.
                assert.ok(fake.random.number.calledWith(4)); // random.number should be called with the 'range' we passed. 
                assert.ok(fake.lorem.words.calledWith(14));

                fake.lorem.words.restore();
                fake.random.number.restore();
            });


        });
    });
    */
    /*
    describe("sentences()", function () {
        context("when no 'sentenceCount' param passed in", function () {
            it("returns newline-separated string of three sentences", function () {
                spy(fake.lorem, 'sentence');
                var sentences = fake.lorem.sentences();

                assert.ok(typeof sentences === 'string');
                var parts = sentences.split('\n');
                assert.equal(parts.length, 3);
                assert.ok(fake.lorem.sentence.calledThrice);

                fake.lorem.sentence.restore();
            });
        });

        context("when 'sentenceCount' param passed in", function () {
            it("returns newline-separated string of requested number of sentences", function () {
                spy(fake.lorem, 'sentence');
                var sentences = fake.lorem.sentences(5);

                assert.ok(typeof sentences === 'string');
                var parts = sentences.split('\n');
                assert.equal(parts.length, 5);

                fake.lorem.sentence.restore();
            });
        });
    });
    */
    /*
    describe("paragraph()", function () {
        context("when no 'wordCount' param passed in", function () {
            it("returns a string of at least three sentences", function () {
                spy(fake.lorem, 'sentences');
                sinon.stub(fake.random, 'number').returns(2);
                var paragraph = fake.lorem.paragraph();

                assert.ok(typeof paragraph === 'string');
                var parts = paragraph.split('\n');
                assert.equal(parts.length, 5); // default 3 plus stubbed 2.
                assert.ok(fake.lorem.sentences.calledWith(5));

                fake.lorem.sentences.restore();
                fake.random.number.restore();
            });
        });

        context("when 'wordCount' param passed in", function () {
            it("returns a string of at least the requested number of sentences", function () {
                spy(fake.lorem, 'sentences');
                sinon.stub(fake.random, 'number').returns(2);
                var paragraph = fake.lorem.paragraph(10);

                assert.ok(typeof paragraph === 'string');
                var parts = paragraph.split('\n');
                assert.equal(parts.length, 12); // requested 10 plus stubbed 2.
                assert.ok(fake.lorem.sentences.calledWith(12));

                fake.lorem.sentences.restore();
                fake.random.number.restore();
            });
        });
    });
    */
    
    /*

    describe("paragraphs()", function () {
        context("when no 'paragraphCount' param passed in", function () {
            it("returns newline-separated string of three paragraphs", function () {
                spy(fake.lorem, 'paragraph');
                var paragraphs = fake.lorem.paragraphs();

                assert.ok(typeof paragraphs === 'string');
                var parts = paragraphs.split('\n \r');
                assert.equal(parts.length, 3);
                assert.ok(fake.lorem.paragraph.calledThrice);

                fake.lorem.paragraph.restore();
            });
        });

        context("when 'paragraphCount' param passed in", function () {
            it("returns newline-separated string of requested number of paragraphs", function () {
                spy(fake.lorem, 'paragraph');
                var paragraphs = fake.lorem.paragraphs(5);

                assert.ok(typeof paragraphs === 'string');
                var parts = paragraphs.split('\n \r');
                assert.equal(parts.length, 5);

                fake.lorem.paragraph.restore();
            });
        });
    });
    */
});
