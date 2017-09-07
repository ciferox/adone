export default async function (directory) {
    await FS.createStructure(directory, [
        ["helloworld.js", [
            "'use strict';",
            "",
            "function helloWorld() {",
            "    console.log('Hello world!');",
            "}"
        ].join("\n")],
        ["helloworld.map.js", [
            "'use strict';",
            "",
            "function helloWorld() {",
            "    console.log('Hello world!');",
            "}",
            "",
            "//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiIiwic291cmNlcyI6WyJoZWxsb3dvcmxkLmpzIl0sInNvdXJjZXNDb250ZW50IjpbIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gaGVsbG9Xb3JsZCgpIHtcbiAgICBjb25zb2xlLmxvZygnSGVsbG8gd29ybGQhJyk7XG59XG4iXSwiZmlsZSI6ImhlbGxvd29ybGQuanMifQ==",
            ""
        ].join("\n")],
        ["helloworld2.js", [
            "'use strict';",
            "",
            "function helloWorld2() {",
            "    console.log('Hello world 2!');",
            "}",
            ""
        ].join("\n")],
        ["helloworld2.js.map", `
            {
                "version":3,
                "file":"helloworld2.js",
                "names":[],
                "mappings":"",
                "sources":["helloworld2.js"],
                "sourcesContent":["source content from source map"]
            }
        `],
        ["helloworld3.js.map", `
            {
                "version": 3,
                "file": "helloworld.js",
                "names": [],
                "mappings": "",
                "sources": ["helloworld.js", "test1.js"]
            }
        `],
        ["helloworld4.js.map", `
            {
                "version": 3,
                "file": "helloworld.js",
                "names": [],
                "mappings": "",
                "sources": ["helloworld.js", "missingfile"]
            }
        `],
        ["helloworld5.js.map", `
            {
                "version": 3,
                "file": "helloworld.js",
                "names": [],
                "mappings": "",
                "sources": ["../helloworld.js", "../test1.js"],
                "sourceRoot": "test"
            }
        `],
        ["helloworld6.js.map", `
            {
                "version": 3,
                "file": "helloworld.js",
                "names": [],
                "mappings": "",
                "sources": ["helloworld.js", "http://example2.com/test1.js"],
                "sourceRoot": "http://example.com/"
            }
        `],
        ["helloworld7.js", [
            "'use strict';",
            "",
            "function helloWorld2() {",
            "    console.log('Hello world 7!');",
            "}",
            ""
        ].join("\n")],
        ["test1.js", "test1"],
        ["test2.js", "test2"],
        ["test3.js", "console.log('three');"],
        ["test4.js", "console.log('four');"]
    ]);
}
