describe("stream", "replace", () => {
    const script = [
        '<script type="text/javascript">',
        "console.log('hello');",
        'document.addEventListener("DOMContentLoaded", function () {',
        '  document.body.style.backgroundColor = "red";',
        "});",
        "</script>"
    ].join("\n");

    const { stream: { concat: concatStream, replace: replaceStream } } = adone;

    it("should be able to replace within a chunk", async () => {
        const replace = replaceStream("</head>", `${script}</head>`);
        const data = replace.pipe(concatStream({ encoding: "string" }, ));
        replace.end([
            "<!DOCTYPE html>",
            "<html>",
            " <head>",
            "   <title>Test</title>",
            " </head>",
            " <body>",
            "   <h1>Head</h1>",
            " </body>",
            "</html>"
        ].join("\n"));
        expect(await data).to.include(script);
    });

    it("should be able to replace between chunks", async () => {
        const haystacks = [
            ["<!DOCTYPE html>",
                "<html>",
                " <head>",
                "   <title>Test</title>",
                " </he"
            ].join("\n"),
            ["ad>",
                " <body>",
                "   <h1>Head</h1>",
                " </body>",
                "</html>"
            ].join("\n")
        ];

        const replace = replaceStream("</head>", `${script}</head>`);
        const data = replace.pipe(concatStream({ encoding: "string" }));

        haystacks.forEach((haystack) => {
            replace.write(haystack);
        });

        replace.end();
        expect(await data).to.include(script);
    });

    it("should default to case insensitive string matches", async () => {
        const replace = replaceStream("</HEAD>", `${script}</head>`);
        const data = replace.pipe(concatStream({ encoding: "string" }));
        replace.end([
            "<!DOCTYPE html>",
            "<html>",
            " <head>",
            "   <title>Test</title>",
            " </head>",
            " <body>",
            "   <h1>Head</h1>",
            " </body>",
            "</html>"
        ].join("\n"));
        expect(await data).to.include(script);
    });

    it("should be possible to force case sensitive string matches", async () => {
        const replace = replaceStream("</HEAD>", `${script}</head>`, { ignoreCase: false });
        const data = replace.pipe(concatStream({ encoding: "string" }));
        replace.end([
            "<!DOCTYPE html>",
            "<html>",
            " <head>",
            "   <title>Test</title>",
            " </head>",
            " <body>",
            "   <h1>Head</h1>",
            " </body>",
            "</html>"
        ].join("\n"));
        expect(await data).to.not.include(script);
    });

    it("should be able to handle no matches", async () => {
        const haystacks = [
            ["<!DOCTYPE html>",
                "<html>",
                " <head>",
                "   <title>Test</title>",
                " </de"
            ].join("\n"),
            ["ad>",
                " <body>",
                "   <h1>Head</h1>",
                " </body>",
                "</html>"
            ].join("\n")
        ];

        const replace = replaceStream("</head>", `${script}</head>`);
        const data = replace.pipe(concatStream({ encoding: "string" }));

        haystacks.forEach((haystack) => {
            replace.write(haystack);
        });

        replace.end();
        expect(await data).to.not.include(script);
    });

    it("should be able to handle dangling tails", async () => {
        const replace = replaceStream("</head>", `${script}</head>`);
        const data = replace.pipe(concatStream({ encoding: "string" }));
        replace.end([
            "<!DOCTYPE html>",
            "<html>",
            " <head>",
            "   <title>Test</title>",
            " </he"
        ].join("\n"));
        expect(await data).to.include("</he");
    });

    it("should be able to handle multiple searches and replaces", async () => {
        const haystacks = [
            ["<!DOCTYPE html>",
                "<html>",
                " <head>",
                "   <title>Test</title>",
                " </head>",
                " <body>",
                " <p> Hello 1</p>",
                " <p> Hello 2</"
            ].join("\n"),
            ["p>",
                " <p> Hello 3</p>",
                " <p> Hello 4</p>",
                " <p> Hello 5</p>",
                " </body>",
                "</html>"
            ].join("\n")
        ];

        const replace = replaceStream("</p>", ", world</p>");
        const data = replace.pipe(concatStream({ encoding: "string" }));

        haystacks.forEach((haystack) => {
            replace.write(haystack);
        });

        replace.end();
        expect(await data).to.be.equal([
            "<!DOCTYPE html>",
            "<html>",
            " <head>",
            "   <title>Test</title>",
            " </head>",
            " <body>",
            " <p> Hello 1, world</p>",
            " <p> Hello 2, world</p>",
            " <p> Hello 3, world</p>",
            " <p> Hello 4, world</p>",
            " <p> Hello 5, world</p>",
            " </body>",
            "</html>"
        ].join("\n"));
    });

    it("should be able to handle a limited searches and replaces", async () => {
        const haystacks = [
            ["<!DOCTYPE html>",
                "<html>",
                " <head>",
                "   <title>Test</title>",
                " </head>",
                " <body>",
                " <p> Hello 1</p>",
                " <p> Hello 2</"
            ].join("\n"),
            ["p>",
                " <p> Hello 3</p>",
                " <p> Hello 4</p>",
                " <p> Hello 5</p>",
                " </body>",
                "</html>"
            ].join("\n")
        ];

        const replace = replaceStream("</p>", ", world</p>", { limit: 3 });
        const data = replace.pipe(concatStream({ encoding: "string" }));

        haystacks.forEach((haystack) => {
            replace.write(haystack);
        });

        replace.end();
        expect(await data).to.equal([
            "<!DOCTYPE html>",
            "<html>",
            " <head>",
            "   <title>Test</title>",
            " </head>",
            " <body>",
            " <p> Hello 1, world</p>",
            " <p> Hello 2, world</p>",
            " <p> Hello 3, world</p>",
            " <p> Hello 4</p>",
            " <p> Hello 5</p>",
            " </body>",
            "</html>"
        ].join("\n"));
    });

    it("should be able to customize the regexp options - deprecated", async () => {
        const haystacks = [
            ["<!DOCTYPE html>",
                "<html>",
                " <head>",
                "   <title>Test</title>",
                " </head>",
                " <body>",
                " <P> Hello 1</P>",
                " <P> Hello 2</"
            ].join("\n"),
            ["P>",
                " <P> Hello 3</P>",
                " <p> Hello 4</p>",
                " <p> Hello 5</p>",
                " </body>",
                "</html>"
            ].join("\n")
        ];

        const replace = replaceStream("</P>", ", world</P>", { regExpOptions: "gm" });
        const data = replace.pipe(concatStream({ encoding: "string" }));

        haystacks.forEach((haystack) => {
            replace.write(haystack);
        });

        replace.end();
        expect(await data).to.equal([
            "<!DOCTYPE html>",
            "<html>",
            " <head>",
            "   <title>Test</title>",
            " </head>",
            " <body>",
            " <P> Hello 1, world</P>",
            " <P> Hello 2, world</P>",
            " <P> Hello 3, world</P>",
            " <p> Hello 4</p>",
            " <p> Hello 5</p>",
            " </body>",
            "</html>"
        ].join("\n"));
    });

    it("should replace characters specified and not modify partial matches", async () => {
        const replace = replaceStream("ab", "Z");
        const data = replace.pipe(concatStream({ encoding: "string" }));
        replace.end([
            "ab",
            "a",
            "a",
            "b"
        ].join("\n"));
        expect(await data).to.equal([
            "Z",
            "a",
            "a",
            "b"
        ].join("\n"));
    });

    it("should handle partial matches between complete matches", async () => {
        const replace = replaceStream("ab", "Z");
        const data = replace.pipe(concatStream({ encoding: "string" }));
        replace.end([
            "ab",
            "a",
            "ab",
            "b"
        ].join("\n"));
        expect(await data).to.equal([
            "Z",
            "a",
            "Z",
            "b"
        ].join("\n"));
    });

    it("should only replace characters specified", async () => {
        const replace = replaceStream("ab", "Z");
        const data = replace.pipe(concatStream({ encoding: "string" }));
        replace.end([
            "ab",
            "a",
            "b"
        ].join("\n"));
        expect(await data).to.equal([
            "Z",
            "a",
            "b"
        ].join("\n"));
    });

    it("should be able to use a replace function", async () => {
        const haystacks = [
            ["<!DOCTYPE html>",
                "<html>",
                " <head>",
                "   <title>Test</title>",
                " </he"
            ].join("\n"),
            ["ad>",
                " <body>",
                "   <h1>Head</h1>",
                " </body>",
                "</html>"
            ].join("\n")
        ];

        const replace = replaceStream("</head>", (match) => {
            expect(match).to.equal("</head>");
            return `${script}</head>`;
        });
        const data = replace.pipe(concatStream({ encoding: "string" }));

        haystacks.forEach((haystack) => {
            replace.write(haystack);
        });

        replace.end();
        expect(await data).to.include(script);
    });

    it("should be able to change each replacement value with a function", async () => {
        const haystacks = [
            ["<!DOCTYPE html>",
                "<html>",
                " <head>",
                "   <title>Test</title>",
                " </head>",
                " <body>",
                " <p> Hello 1</p>",
                " <p> Hello 2</"
            ].join("\n"),
            ["p>",
                " <p> Hello 3</p>",
                " <p> Hello 4</p>",
                " <p> Hello 5</p>",
                " </body>",
                "</html>"
            ].join("\n")
        ];

        const greetings = ["Hi", "Hey", "Gday", "Bonjour", "Greetings"];

        const replace = replaceStream("Hello", greetings.shift.bind(greetings));
        const data = replace.pipe(concatStream({ encoding: "string" }));

        haystacks.forEach((haystack) => {
            replace.write(haystack);
        });

        replace.end();
        expect(await data).to.equal([
            "<!DOCTYPE html>",
            "<html>",
            " <head>",
            "   <title>Test</title>",
            " </head>",
            " <body>",
            " <p> Hi 1</p>",
            " <p> Hey 2</p>",
            " <p> Gday 3</p>",
            " <p> Bonjour 4</p>",
            " <p> Greetings 5</p>",
            " </body>",
            "</html>"
        ].join("\n"));
    });

    it("should be able to replace within a chunk using regex", async () => {
        const replace = replaceStream(/<\/head>/, `${script}</head>`);
        const data = replace.pipe(concatStream({ encoding: "string" }));
        replace.end([
            "<!DOCTYPE html>",
            "<html>",
            " <head>",
            "   <title>Test</title>",
            " </head>",
            " <body>",
            "   <h1>Head</h1>",
            " </body>",
            "</html>"
        ].join("\n"));
        expect(await data).to.include(script);
    });

    it("should be able to replace between chunks using regex", async () => {
        const haystacks = [
            ["<!DOCTYPE html>",
                "<html>",
                " <head>",
                "   <title>Test</title>",
                " </head>",
                " <body>",
                "   <h1>I love feeeee"
            ].join("\n"),
            ["eeeeeeeeeed</h1>",
                " </body>",
                "</html>"
            ].join("\n")
        ];

        const replace = replaceStream(/fe+d/, "foooooooood");
        const data = replace.pipe(concatStream({ encoding: "string" }));

        haystacks.forEach((haystack) => {
            replace.write(haystack);
        });

        replace.end();
        expect(await data).to.include("foooooooood");
    });

    it("should be able to handle no matches using regex", async () => {
        const haystacks = [
            ["<!DOCTYPE html>",
                "<html>",
                " <head>",
                "   <title>Test</title>",
                " </de"
            ].join("\n"),
            ["ad>",
                " <body>",
                "   <h1>Head</h1>",
                " </body>",
                "</html>"
            ].join("\n")
        ];

        const replace = replaceStream(/<\/head>/, `${script}</head>`);
        const data = replace.pipe(concatStream({ encoding: "string" }));

        haystacks.forEach((haystack) => {
            replace.write(haystack);
        });

        replace.end();
        expect(await data).to.not.include(script);
    });

    it("should be able to handle dangling tails using regex", async () => {
        const replace = replaceStream(/<\/head>/, `${script}</head>`);
        const data = replace.pipe(concatStream({ encoding: "string" }));

        replace.end([
            "<!DOCTYPE html>",
            "<html>",
            " <head>",
            "   <title>Test</title>",
            " </he"
        ].join("\n"));
        expect(await data).to.include("</he");
    });

    it("should be able to handle multiple searches and replaces using regex", async () => {
        const haystacks = [
            ["<!DOCTYPE html>",
                "<html>",
                " <head>",
                "   <title>Test</title>",
                " </head>",
                " <body>",
                " <p> Hello 1</p>",
                " <p> Hello 2</"
            ].join("\n"),
            ["p>",
                " <p> Hello 3</p>",
                " <p> Hello 4</p>",
                " <p> Hello 5</p>",
                " </body>",
                "</html>"
            ].join("\n")
        ];

        const replace = replaceStream(/<\/p>/g, ", world</p>");
        const data = replace.pipe(concatStream({ encoding: "string" }));

        haystacks.forEach((haystack) => {
            replace.write(haystack);
        });

        replace.end();
        expect(await data).to.equal([
            "<!DOCTYPE html>",
            "<html>",
            " <head>",
            "   <title>Test</title>",
            " </head>",
            " <body>",
            " <p> Hello 1, world</p>",
            " <p> Hello 2, world</p>",
            " <p> Hello 3, world</p>",
            " <p> Hello 4, world</p>",
            " <p> Hello 5, world</p>",
            " </body>",
            "</html>"
        ].join("\n"));
    });

    it("should be able to handle a limited searches and replaces using regex", async () => {
        const haystacks = [
            ["<!DOCTYPE html>",
                "<html>",
                " <head>",
                "   <title>Test</title>",
                " </head>",
                " <body>",
                " <p> Hello 1</p>",
                " <p> Hello 2</"
            ].join("\n"),
            ["p>",
                " <p> Hello 3</p>",
                " <p> Hello 4</p>",
                " <p> Hello 5</p>",
                " </body>",
                "</html>"
            ].join("\n")
        ];

        const replace = replaceStream(/<\/p>/g, ", world</p>", { limit: 3 });
        const data = replace.pipe(concatStream({ encoding: "string" }));

        haystacks.forEach((haystack) => {
            replace.write(haystack);
        });

        replace.end();
        expect(await data).to.equal([
            "<!DOCTYPE html>",
            "<html>",
            " <head>",
            "   <title>Test</title>",
            " </head>",
            " <body>",
            " <p> Hello 1, world</p>",
            " <p> Hello 2, world</p>",
            " <p> Hello 3, world</p>",
            " <p> Hello 4</p>",
            " <p> Hello 5</p>",
            " </body>",
            "</html>"
        ].join("\n"));
    });

    it("should be able to customize the regexp options using regex - deprecated", async () => {
        const haystacks = [
            ["<!DOCTYPE html>",
                "<html>",
                " <head>",
                "   <title>Test</title>",
                " </head>",
                " <body>",
                " <P> Hello 1</P>",
                " <P> Hello 2</"
            ].join("\n"),
            ["P>",
                " <P> Hello 3</P>",
                " <p> Hello 4</p>",
                " <p> Hello 5</p>",
                " </body>",
                "</html>"
            ].join("\n")
        ];

        const replace = replaceStream(/<\/P>/, ", world</P>", { regExpOptions: "gm" });
        const data = replace.pipe(concatStream({ encoding: "string" }));

        haystacks.forEach((haystack) => {
            replace.write(haystack);
        });

        replace.end();
        expect(await data).to.equal([
            "<!DOCTYPE html>",
            "<html>",
            " <head>",
            "   <title>Test</title>",
            " </head>",
            " <body>",
            " <P> Hello 1, world</P>",
            " <P> Hello 2, world</P>",
            " <P> Hello 3, world</P>",
            " <p> Hello 4</p>",
            " <p> Hello 5</p>",
            " </body>",
            "</html>"
        ].join("\n"));
    });

    it("should be possible to specify the regexp flags when using a regex", async () => {
        const haystacks = [
            ["<!DOCTYPE html>",
                "<html>",
                " <head>",
                "   <title>Test</title>",
                " </head>",
                " <body>",
                " <P> Hello 1</P>",
                " <P> Hello 2</"
            ].join("\n"),
            ["P>",
                " <P> Hello 3</P>",
                " <p> Hello 4</p>",
                " <p> Hello 5</p>",
                " </body>",
                "</html>"
            ].join("\n")
        ];

        const replace = replaceStream(/<\/P>/gm, ", world</P>");
        const data = replace.pipe(concatStream({ encoding: "string" }));

        haystacks.forEach((haystack) => {
            replace.write(haystack);
        });

        replace.end();
        expect(await data).to.equal([
            "<!DOCTYPE html>",
            "<html>",
            " <head>",
            "   <title>Test</title>",
            " </head>",
            " <body>",
            " <P> Hello 1, world</P>",
            " <P> Hello 2, world</P>",
            " <P> Hello 3, world</P>",
            " <p> Hello 4</p>",
            " <p> Hello 5</p>",
            " </body>",
            "</html>"
        ].join("\n"));
    });

    it("should replace characters specified and not modify partial matches using regex", async () => {
        const replace = replaceStream("ab", "Z");
        const data = replace.pipe(concatStream({ encoding: "string" }));
        replace.end([
            "ab",
            "a",
            "a",
            "b"
        ].join("\n"));
        expect(await data).to.equal([
            "Z",
            "a",
            "a",
            "b"
        ].join("\n"));
    });

    it("should handle partial matches between complete matches using regex", async () => {
        const replace = replaceStream(/ab/g, "Z");
        const data = replace.pipe(concatStream({ encoding: "string" }));
        replace.end([
            "ab",
            "a",
            "ab",
            "b"
        ].join("\n"));
        expect(await data).to.equal([
            "Z",
            "a",
            "Z",
            "b"
        ].join("\n"));
    });

    it("should only replace characters specified using regex", async () => {
        const replace = replaceStream(/ab/, "Z");
        const data = replace.pipe(concatStream({ encoding: "string" }));
        replace.end([
            "ab",
            "a",
            "b"
        ].join("\n"));
        expect(await data).to.equal([
            "Z",
            "a",
            "b"
        ].join("\n"));
    });

    it("should be able to use a replace function using regex", async () => {
        const haystacks = [
            ["<!DOCTYPE html>",
                "<html>",
                " <head>",
                "   <title>Test</title>",
                " </he"
            ].join("\n"),
            ["ad>",
                " <body>",
                "   <h1>Head</h1>",
                " </body>",
                "</html>"
            ].join("\n")
        ];

        const replaceFn = (match, p1, offset, string) => {
            expect(match).to.equal("</head>");
            expect(p1).to.equal("head");
            expect(offset).to.equal(55);
            expect(string).to.equal(haystacks.join(""));
            return `${script}</head>`;
        };

        const replace = replaceStream(/<\/(head)>/, replaceFn);
        const data = replace.pipe(concatStream({ encoding: "string" }));

        haystacks.forEach((haystack) => {
            replace.write(haystack);
        });

        replace.end();
        expect(await data).to.include(script);
    });

    it("should be able to change each replacement value with a function using regex", async () => {
        const haystacks = [
            ["<!DOCTYPE html>",
                "<html>",
                " <head>",
                "   <title>Test</title>",
                " </head>",
                " <body>",
                " <p> Hello 1</p>",
                " <p> Hello 2</"
            ].join("\n"),
            ["p>",
                " <p> Hello 3</p>",
                " <p> Hello 4</p>",
                " <p> Hello 5</p>",
                " </body>",
                "</html>"
            ].join("\n")
        ];

        const greetings = ["Hi", "Hey", "Gday", "Bonjour", "Greetings"];

        const replace = replaceStream(/Hello/g, greetings.shift.bind(greetings));
        const data = replace.pipe(concatStream({ encoding: "string" }));

        haystacks.forEach((haystack) => {
            replace.write(haystack);
        });

        replace.end();
        expect(await data).to.equal([
            "<!DOCTYPE html>",
            "<html>",
            " <head>",
            "   <title>Test</title>",
            " </head>",
            " <body>",
            " <p> Hi 1</p>",
            " <p> Hey 2</p>",
            " <p> Gday 3</p>",
            " <p> Bonjour 4</p>",
            " <p> Greetings 5</p>",
            " </body>",
            "</html>"
        ].join("\n"));
    });

    it("should be able to replace captures using $1 notation", async () => {
        const replace = replaceStream(/(a)(b)/g, "this is $1 and this is $2 and this is again $1");
        const data = replace.pipe(concatStream({ encoding: "string" }));
        replace.end([
            "ab",
            "a",
            "ab",
            "b"
        ].join("\n"));
        expect(await data).to.equal([
            "this is a and this is b and this is again a",
            "a",
            "this is a and this is b and this is again a",
            "b"
        ].join("\n"));
    });

    it("should be able to replace when the match is a tail using a regex", async () => {
        const replace = replaceStream(/<\/html>/g, `${script}</html>`);
        const data = replace.pipe(concatStream({ encoding: "string" }));
        replace.end([
            "<!DOCTYPE html>",
            "<html>",
            " <head>",
            "   <title>Test</title>",
            " </head>",
            " <body>",
            "   <h1>Head</h1>",
            " </body>",
            "</html>"
        ].join("\n"));
        expect(await data).to.include(script);
    });

    it("should push chunks immediately except tail", (done) => {
        const replace = replaceStream(/REPLACE/, "");
        const replaced = new adone.std.stream.PassThrough();

        const recievedChunks = [];
        replace.pipe(replaced);
        replaced.on("data", (data) => {
            recievedChunks.push(data);
        });
        replaced.on("end", () => {
            expect(recievedChunks.length).to.equal(3);
            expect(recievedChunks[0]).to.have.length(99);
            expect(recievedChunks[1]).to.have.length(50);
            expect(recievedChunks[2]).to.have.length(100);
            done();
        });
        replace.write((Buffer.alloc(50)));
        replace.write((Buffer.alloc(49)));
        replace.write((Buffer.alloc(100)));
        replace.end((Buffer.alloc(50)));
    });
});
