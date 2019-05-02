const { Fuzzy } = adone.text;

describe("Fuzzy", () => {
    describe('Flat list of strings: ["Apple", "Orange", "Banana"]', () => {
        const fruits = ["Apple", "Orange", "Banana"];
        const fuzzy = new Fuzzy(fruits);

        it('searching for the term "Apple"', () => {
            const result = fuzzy.search("Apple");
            assert.equal(result.length, 1);
            assert.equal(result[0], 0);
        });

        it('performing a fuzzy search for the term "ran"', () => {
            const result = fuzzy.search("ran");
            assert.equal(result.length, 2);
            assert.equal(result[0], 1);
            assert.equal(result[1], 2);
        });

        it('performing a fuzzy search for the term "nan"', () => {
            const result = fuzzy.search("nan");
            assert.equal(result.length, 2);
            assert.equal(result[0], 2);
            assert.equal(result[1], 1);
        });
    });

    describe('List of books - searching "title" and "author"', () => {
        const books = require(adone.path.join(__dirname, "fixtures", "books.json"));
        const options = {
            keys: ["title", "author"],
            tokenize: true
        };
        const fuzzy = new Fuzzy(books, options);

        it('searching for the term "HTML5"', () => {
            const result = fuzzy.search("HTML5");
            assert.equal(result.length, 3);
            assert.deepEqual(result[0], {
                title: "HTML5",
                author: "Remy Sharp"
            });
        });

        it('searching for the term "Woodhouse"', () => {
            const result = fuzzy.search("Jeeves Woodhouse");
            assert.equal(result.length, 6);
            const output = [
                { title: "Right Ho Jeeves", author: "P.D. Woodhouse" },
                { title: "Thank You Jeeves", author: "P.D. Woodhouse" },
                { title: "The Code of the Wooster", author: "P.D. Woodhouse" },
                { title: "The Lock Artist", author: "Steve Hamilton" },
                { title: "the wooster code", author: "aa" },
                { title: "The code of the wooster", author: "aa" }
            ];
            assert.deepEqual(result, output);
        });
        it('searching for the term "brwn"', () => {
            const result = fuzzy.search("brwn");
            assert.isTrue(result.length > 3);
            assert.deepEqual(result[0], {
                title: "The DaVinci Code",
                author: "Dan Brown"
            });
            assert.deepEqual(result[1], {
                title: "Angels & Demons",
                author: "Dan Brown"
            });
            assert.deepEqual(result[2], {
                title: "The Lost Symbol",
                author: "Dan Brown"
            });
        });
    });

    describe('Deep key search, with ["title", "author.firstName"]', () => {
        const books = [{
            title: "Old Man's War",
            author: {
                firstName: "John",
                lastName: "Scalzi"
            }
        }, {
            title: "The Lock Artist",
            author: {
                firstName: "Steve",
                lastName: "Hamilton"
            }
        }, {
            title: "HTML5"
        }, {
            title: "A History of England",
            author: {
                firstName: 1066,
                lastName: "Hastings"
            }
        }];
        const options = {
            keys: ["title", "author.firstName"]
        };
        const fuzzy = new Fuzzy(books, options);

        it('searching for the term "Stve"', () => {
            const result = fuzzy.search("Stve");
            assert.isTrue(result.length > 0);
            assert.deepEqual(result[0], {
                title: "The Lock Artist",
                author: {
                    firstName: "Steve",
                    lastName: "Hamilton"
                }
            });
        });

        it("when searching for the term 106", () => {
            it("we get a list of exactly 1 item", () => {
                const result = fuzzy.search("106");
                assert.isTrue(result.length > 0);
            });

            it("whose first value is found", () => {
                const result = fuzzy.search("106");
                assert.deepEqual(result[0], {
                    title: "A History of England",
                    author: {
                        firstName: 1066,
                        lastName: "Hastings"
                    }
                });
            });
        });
    });

    describe('Custom search function, with ["title", "author.firstName"]', () => {
        const books = [{
            title: "Old Man's War",
            author: {
                firstName: "John",
                lastName: "Scalzi"
            }
        }, {
            title: "The Lock Artist",
            author: {
                firstName: "Steve",
                lastName: "Hamilton"
            }
        }];
        const options = {
            keys: ["title", "author.firstName"],
            getFn(obj) {
                if (!obj) {
                    return null;
                }
                obj = obj.author.lastName;
                return obj;
            }
        };
        const fuzzy = new Fuzzy(books, options);

        it('searching for the term "Hmlt"', () => {
            const result = fuzzy.search("Hmlt");
            assert.isTrue(result.length > 0);
            assert.deepEqual(result[0], {
                title: "The Lock Artist",
                author: {
                    firstName: "Steve",
                    lastName: "Hamilton"
                }
            });
        });

        it('searching for the term "Stve"', () => {
            const result = fuzzy.search("Stve");
            // assert.isTrue(result.length > 0)
            assert.equal(result.length, 0);
        });
    });

    describe('Include score in result list: ["Apple", "Orange", "Banana"]', () => {
        const fruits = ["Apple", "Orange", "Banana"];
        const fuzzy = new Fuzzy(fruits, {
            includeScore: true
        });

        it('searching for the term "Apple"', () => {
            const result = fuzzy.search("Apple");
            assert.equal(result.length, 1);
            assert.equal(result[0].item, 0);
            assert.equal(result[0].score, 0);
        });

        it('performing a fuzzy search for the term "ran"', () => {
            const result = fuzzy.search("ran");
            assert.equal(result.length, 2);
            assert.equal(result[0].item, 1);
            assert.equal(result[1].item, 2);
            assert.isAbove(result[0].score, 0);
            assert.isAbove(result[1].score, 0);
        });
    });

    describe('Only include ID in results list, with "ISBN"', () => {
        const books = [{
            ISBN: "0765348276",
            title: "Old Man's War",
            author: "John Scalzi"
        }, {
            ISBN: "0312696957",
            title: "The Lock Artist",
            author: "Steve Hamilton"
        }];
        const options = {
            keys: ["title", "author"],
            id: "ISBN"
        };
        const fuzzy = new Fuzzy(books, options);

        it('searching for the term "Stve"', () => {
            const result = fuzzy.search("Stve");
            assert.equal(result.length, 1);
            assert.equal(result, "0312696957");
        });
    });

    describe("Include both ID and score in results list", () => {
        const books = [{
            ISBN: "0765348276",
            title: "Old Man's War",
            author: "John Scalzi"
        }, {
            ISBN: "0312696957",
            title: "The Lock Artist",
            author: "Steve Hamilton"
        }];
        const options = {
            keys: ["title", "author"],
            id: "ISBN",
            includeScore: true
        };
        const fuzzy = new Fuzzy(books, options);

        it('searching for the term "Stve"', () => {
            const result = fuzzy.search("Stve");
            assert.equal(result.length, 1);
            assert.equal(result[0].item, "0312696957");
            assert.isAbove(result[0].score, 0);
        });
    });

    describe("Search when IDs are numbers", () => {
        const books = [{
            ISBN: 1111,
            title: "Old Man's War",
            author: "John Scalzi"
        }, {
            ISBN: 2222,
            title: "The Lock Artist",
            author: "Steve Hamilton"
        }];
        const options = {
            keys: ["title", "author"],
            id: "ISBN",
            includeScore: true
        };
        const fuzzy = new Fuzzy(books, options);

        it('searching for the term "Stve"', () => {
            const result = fuzzy.search("Stve");
            assert.equal(result.length, 1);
            assert.equal(result[0].item, 2222);
            assert.isAbove(result[0].score, 0);
        });
    });

    describe("Recurse into arrays", () => {
        const books = [{
            ISBN: "0765348276",
            title: "Old Man's War",
            author: "John Scalzi",
            tags: ["fiction"]
        }, {
            ISBN: "0312696957",
            title: "The Lock Artist",
            author: "Steve Hamilton",
            tags: ["fiction"]
        }, {
            ISBN: "0321784421",
            title: "HTML5",
            author: "Remy Sharp",
            tags: ["web development", "nonfiction"]
        }];
        const fuzzy = new Fuzzy(books, {
            keys: ["tags"],
            id: "ISBN",
            threshold: 0,
            includeMatches: true
        });

        it('searching for the tag "nonfiction"', () => {
            const result = fuzzy.search("nonfiction");
            assert.equal(result.length, 1);
            assert.equal(result[0].item, "0321784421");
        });

        it("with matched tag provided", () => {
            const result = fuzzy.search("nonfiction");
            const matches = result[0].matches;
            assert.deepEqual(matches[0], {
                key: "tags",
                arrayIndex: 1,
                value: "nonfiction",
                indices: [[0, 9]]
            });
        });
    });

    describe("Recurse into objects in arrays", () => {
        const books = [{
            ISBN: "0765348276",
            title: "Old Man's War",
            author: {
                name: "John Scalzi",
                tags: [{
                    value: "American"
                }]
            }
        }, {
            ISBN: "0312696957",
            title: "The Lock Artist",
            author: {
                name: "Steve Hamilton",
                tags: [{
                    value: "American"
                }]
            }
        }, {
            ISBN: "0321784421",
            title: "HTML5",
            author: {
                name: "Remy Sharp",
                tags: [{
                    value: "British"
                }]
            }
        }];
        const options = {
            keys: ["author.tags.value"],
            id: "ISBN",
            threshold: 0
        };
        const fuzzy = new Fuzzy(books, options);

        it('searching for the author tag "British"', () => {
            const result = fuzzy.search("British");
            assert.equal(result.length, 1);
            assert.equal(result[0], "0321784421");
        });
    });

    describe("Searching by ID", () => {
        const books = [{
            ISBN: "A",
            title: "Old Man's War",
            author: "John Scalzi"
        }, {
            ISBN: "B",
            title: "The Lock Artist",
            author: "Steve Hamilton"
        }];
        const options = {
            keys: ["title", "author"],
            id: "ISBN"
        };
        const fuzzy = new Fuzzy(books, options);

        it('searching for the term "Stve"', () => {
            const result = fuzzy.search("Stve");
            assert.equal(result.length, 1);
            assert.isString(result[0]);
            assert.equal(result[0], "B");
        });
    });

    describe("Set new list on Fuse", () => {
        const fruits = ["Apple", "Orange", "Banana"];
        const vegetables = ["Onion", "Lettuce", "Broccoli"];

        const fuzzy = new Fuzzy(fruits);
        fuzzy.setCollection(vegetables);

        it('searching for the term "Apple"', () => {
            const result = fuzzy.search("Lettuce");
            assert.equal(result.length, 1);
            assert.equal(result[0], 1);
        });
    });

    describe("Searching by nested ID", () => {
        const books = [{
            ISBN: {
                name: "A"
            },
            title: "Old Man's War",
            author: "John Scalzi"
        }, {
            ISBN: {
                name: "B"
            },
            title: "The Lock Artist",
            author: "Steve Hamilton"
        }];
        const options = {
            keys: ["title", "author"],
            id: "ISBN.name"
        };
        const fuzzy = new Fuzzy(books, options);

        it('searching for the term "Stve"', () => {
            const result = fuzzy.search("Stve");
            assert.equal(result.length, 1);
            assert.isString(result[0]);
            assert.equal(result[0], "B");
        });
    });

    describe("Searching list", () => {
        const items = ["FH Mannheim", "University Mannheim"];
        const fuzzy = new Fuzzy(items);

        it('searching for the term "Uni Mannheim"', () => {
            const result = fuzzy.search("Unive Mannheim");

            assert.equal(result.length, 2);
            assert.equal(result[0], 1);
        });
    });

    describe("Searching list", () => {
        const items = [
            "Borwaila hamlet",
            "Bobe hamlet",
            "Bo hamlet",
            "Boma hamlet"];

        const fuzzy = new Fuzzy(items, {
            includeScore: true
        });

        it('searching for the term "Bo hamet"', () => {
            const result = fuzzy.search("Bo hamet");
            assert.equal(result.length, 4);
            assert.equal(result[0].item, 2);
        });
    });

    describe("List of books - searching for long pattern length > 32", () => {
        const books = require(adone.path.join(__dirname, "fixtures", "books.json"));
        const options = {
            keys: ["title"]
        };
        const fuzzy = new Fuzzy(books, options);

        it('searching for the term "HTML5 HTML5 HTML5 HTML5 HTML5 HTML5 HTML5 HTML5 HTML5 HTML5 HTML5 HTML5 HTML5 HTML5 HTML5 HTML5"', () => {
            const result = fuzzy.search("HTML5 ");
            assert.isTrue(Boolean(result.length));
            assert.deepEqual(result[0], {
                title: "HTML5",
                author: "Remy Sharp"
            });
        });
    });

    describe("Weighted search", () => {
        const items = [{
            title: "Old Man's War fiction",
            author: "John X",
            tags: ["war"]
        }, {
            title: "Right Ho Jeeves",
            author: "P.D. Mans",
            tags: ["fiction", "war"]
        }];

        it('searching for the term "Man", where the author is weighted higher than title', () => {
            const options = {
                keys: [{
                    name: "title",
                    weight: 0.3
                }, {
                    name: "author",
                    weight: 0.7
                }]
            };
            const fuzzy = new Fuzzy(items, options);
            const result = fuzzy.search("Man");

            assert.deepEqual(result[0].title, "Right Ho Jeeves");
        });

        it('searching for the term "Man", where the title is weighted higher than author', () => {
            const options = {
                keys: [{
                    name: "title",
                    weight: 0.7
                }, {
                    name: "author",
                    weight: 0.3
                }]
            };
            const fuzzy = new Fuzzy(items, options);
            const result = fuzzy.search("Man");

            assert.deepEqual(result[0].author, "John X");
        });

        it('searching for the term "war", where tags are weighted higher than all other keys', () => {
            const options = {
                keys: [{
                    name: "title",
                    weight: 0.8
                }, {
                    name: "author",
                    weight: 0.3
                }, {
                    name: "tags",
                    weight: 0.2
                }]
            };
            const fuzzy = new Fuzzy(items, options);
            const result = fuzzy.search("fiction");

            assert.deepEqual(result[0].author, "P.D. Mans");
        });
    });

    describe("Search location", () => {
        const items = [{
            name: "Hello World"
        }];
        const options = {
            keys: ["name"],
            includeScore: true,
            includeMatches: true
        };
        const fuzzy = new Fuzzy(items, options);

        it('searching for the term "wor"', () => {
            const result = fuzzy.search("wor");
            assert.isTrue(Boolean(result.length));

            const matches = result[0].matches;
            const a = matches[0].indices[0];
            const b = matches[0].indices[1];
            assert.deepEqual(a, [4, 4]);
            assert.deepEqual(b, [6, 8]);
        });

        it("with original text value", () => {
            const result = fuzzy.search("wor");
            const matches = result[0].matches;
            assert.equal(matches[0].value, "Hello World");
        });
    });

    describe('Search with match all tokens: ["AustralianSuper - Corporate Division", "Aon Master Trust - Corporate Super", "Promina Corporate Superannuation Fund", "Workforce Superannuation Corporate", "IGT (Australia) Pty Ltd Superannuation Fund"]', () => {
        const items = [
            "AustralianSuper - Corporate Division",
            "Aon Master Trust - Corporate Super",
            "Promina Corporate Superannuation Fund",
            "Workforce Superannuation Corporate",
            "IGT (Australia) Pty Ltd Superannuation Fund"
        ];

        it('searching for the term "Australia"', () => {
            const fuzzy = new Fuzzy(items, {
                tokenize: true
            });
            const result = fuzzy.search("Australia");
            assert.equal(result.length, 2);
            assert.notEqual(result.indexOf(0), -1);
            assert.notEqual(result.indexOf(4), -1);
        });

        it('searching for the term "corporate"', () => {
            const fuzzy = new Fuzzy(items, {
                tokenize: true
            });
            const result = fuzzy.search("corporate");

            assert.equal(result.length, 4);
            assert.notEqual(result.indexOf(0), -1);
            assert.notEqual(result.indexOf(1), -1);
            assert.notEqual(result.indexOf(2), -1);
            assert.notEqual(result.indexOf(3), -1);
        });

        it('searching for the term "Australia corporate" without "matchAllTokens" set to false', () => {
            const fuzzy = new Fuzzy(items, {
                tokenize: true,
                matchAllTokens: false
            });
            const result = fuzzy.search("Australia corporate");
            assert.equal(result.length, 5);
            assert.notEqual(result.indexOf(0), -1);
            assert.notEqual(result.indexOf(1), -1);
            assert.notEqual(result.indexOf(2), -1);
            assert.notEqual(result.indexOf(3), -1);
            assert.notEqual(result.indexOf(4), -1);
        });
        it('searching for the term "Australia corporate" with "matchAllTokens" set to true', () => {
            const fuzzy = new Fuzzy(items, {
                tokenize: true,
                matchAllTokens: true
            });
            const result = fuzzy.search("Australia corporate");
            assert.equal(result.length, 1);
            assert.notEqual(result.indexOf(0), -1);
        });
    });

    describe("Searching with default options", () => {
        const items = ["t te tes test tes te t"];

        const fuzzy = new Fuzzy(items, {
            includeMatches: true
        });

        it('searching for the term "test"', () => {
            const result = fuzzy.search("test");
            assert.equal(result[0].matches[0].indices.length, 4);
            assert.equal(result[0].matches[0].indices[0][0], 0);
            assert.equal(result[0].matches[0].indices[0][1], 0);
        });

        it("the seach pattern is longer than maxPatternLength and contains RegExp special characters", () => {
            const resultThunk = () => fuzzy.search("searching with a sufficiently long string sprinkled with ([ )] *+^$ etc.");

            assert.doesNotThrow(resultThunk);
        });
    });

    describe("Searching with findallmatches options", () => {
        const items = ["t te tes test tes te t"];

        const fuzzy = new Fuzzy(items, {
            includeMatches: true,
            findAllMatches: true
        });

        it('searching for the term "test"', () => {
            const result = fuzzy.search("test");
            assert.equal(result[0].matches[0].indices.length, 7);
            assert.equal(result[0].matches[0].indices[0][0], 0);
            assert.equal(result[0].matches[0].indices[0][1], 0);
        });
    });

    describe("Searching with minMatchCharLength options", () => {
        const items = ["t te tes test tes te t"];

        const fuzzy = new Fuzzy(items, {
            includeMatches: true,
            minMatchCharLength: 2
        });

        it('searching for the term "test"', () => {
            const result = fuzzy.search("test");
            assert.equal(result[0].matches[0].indices.length, 3);
            assert.equal(result[0].matches[0].indices[0][0], 2);
            assert.equal(result[0].matches[0].indices[0][1], 3);
        });

        it("when searching for a string shorter than minMatchCharLength", () => {
            const result = fuzzy.search("t");
            assert.equal(result.length, 1);
            assert.equal(result[0].matches.length, 0);
        });
    });

    describe("Weighted search with exact match", () => {
        const items = [{
            title: "John Smith",
            author: "Steve Pearson"
        }, {
            title: "The life of Jane",
            author: "John Smith"
        }];

        describe('When searching for the term "John Smith" with author weighted higher', () => {
            const options = {
                keys: [{
                    name: "title",
                    weight: 0.3
                }, {
                    name: "author",
                    weight: 0.7
                }]
            };

            const fuzzy = new Fuzzy(items, options);

            it('we get the value { title: "The life of Jane", author: "John Smith" }', () => {
                const result = fuzzy.search("John Smith");
                assert.deepEqual(result[0].title, "The life of Jane");
                assert.deepEqual(result[0].author, "John Smith");
            });
        });

        describe('When searching for the term "John Smith" with title weighted higher', () => {
            const options = {
                keys: [{
                    name: "title",
                    weight: 0.7
                }, {
                    name: "author",
                    weight: 0.3
                }]
            };

            const fuzzy = new Fuzzy(items, options);

            it('We get the value { title: "John Smith", author: "Steve Pearson" }', () => {
                const result = fuzzy.search("John Smith");
                assert.deepEqual(result[0].title, "John Smith");
                assert.deepEqual(result[0].author, "Steve Pearson");
            });
        });
    });

    describe("Weighted search with exact match in arrays", () => {
        const items = [{
            title: "Jackson",
            author: "Steve Pearson",
            tags: ["Kevin Wong", "Victoria Adam", "John Smith"]
        }, {
            title: "The life of Jane",
            author: "John Smith",
            tags: ["Jane", "Jackson", "Sam"]
        }];

        describe('When searching for the term "Jackson", with tags weighted higher and string inside tags getting exact match', () => {
            const options = {
                keys: [{
                    name: "tags",
                    weight: 0.7
                }, {
                    name: "title",
                    weight: 0.3
                }]
            };

            const fuzzy = new Fuzzy(items, options);

            it('We get the value { title: "The life of Jane", tags: ["Jane", "Jackson", "Sam"] ... }', () => {
                const result = fuzzy.search("Jackson");
                assert.deepEqual(result[0].title, "The life of Jane");
                assert.deepEqual(result[0].tags, ["Jane", "Jackson", "Sam"]);
            });
        });

        describe('When searching for the term "Jackson", with title weighted higher and string inside getting exact match', () => {
            const options = {
                keys: [{
                    name: "tags",
                    weight: 0.3
                }, {
                    name: "title",
                    weight: 0.7
                }]
            };

            const fuzzy = new Fuzzy(items, options);

            it('We get the value { title: "Jackson", tags: "Kevin Wong", ... }', () => {
                const result = fuzzy.search("Jackson");
                assert.deepEqual(result[0].title, "Jackson");
                assert.deepEqual(result[0].tags, ["Kevin Wong", "Victoria Adam", "John Smith"]);
            });
        });
    });
});
