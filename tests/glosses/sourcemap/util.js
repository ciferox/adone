const { sourcemap: { util } } = adone;

export const testGeneratedCode = " ONE.foo=function(a){return baz(a);};\n TWO.inc=function(a){return a+1;};";

export const testMap = {
    version: 3,
    file: "min.js",
    names: ["bar", "baz", "n"],
    sources: ["one.js", "two.js"],
    sourceRoot: "/the/root",
    mappings: "CAAC,IAAI,IAAM,SAAUA,GAClB,OAAOC,IAAID;CCDb,IAAI,IAAM,SAAUE,GAClB,OAAOA"
};

export const testMapNoSourceRoot = {
    version: 3,
    file: "min.js",
    names: ["bar", "baz", "n"],
    sources: ["one.js", "two.js"],
    mappings: "CAAC,IAAI,IAAM,SAAUA,GAClB,OAAOC,IAAID;CCDb,IAAI,IAAM,SAAUE,GAClB,OAAOA"
};

export const testMapEmptySourceRoot = {
    version: 3,
    file: "min.js",
    names: ["bar", "baz", "n"],
    sources: ["one.js", "two.js"],
    sourceRoot: "",
    mappings: "CAAC,IAAI,IAAM,SAAUA,GAClB,OAAOC,IAAID;CCDb,IAAI,IAAM,SAAUE,GAClB,OAAOA"
};

// This mapping is identical to above, but uses the indexed format instead.
export const indexedTestMap = {
    version: 3,
    file: "min.js",
    sections: [
        {
            offset: {
                line: 0,
                column: 0
            },
            map: {
                version: 3,
                sources: [
                    "one.js"
                ],
                sourcesContent: [
                    " ONE.foo = function (bar) {\n" +
                    "   return baz(bar);\n" +
                    " };"
                ],
                names: [
                    "bar",
                    "baz"
                ],
                mappings: "CAAC,IAAI,IAAM,SAAUA,GAClB,OAAOC,IAAID",
                file: "min.js",
                sourceRoot: "/the/root"
            }
        },
        {
            offset: {
                line: 1,
                column: 0
            },
            map: {
                version: 3,
                sources: [
                    "two.js"
                ],
                sourcesContent: [
                    " TWO.inc = function (n) {\n" +
                    "   return n + 1;\n" +
                    " };"
                ],
                names: [
                    "n"
                ],
                mappings: "CAAC,IAAI,IAAM,SAAUA,GAClB,OAAOA",
                file: "min.js",
                sourceRoot: "/the/root"
            }
        }
    ]
};

export const indexedTestMapDifferentSourceRoots = {
    version: 3,
    file: "min.js",
    sections: [
        {
            offset: {
                line: 0,
                column: 0
            },
            map: {
                version: 3,
                sources: [
                    "one.js"
                ],
                sourcesContent: [
                    " ONE.foo = function (bar) {\n" +
                    "   return baz(bar);\n" +
                    " };"
                ],
                names: [
                    "bar",
                    "baz"
                ],
                mappings: "CAAC,IAAI,IAAM,SAAUA,GAClB,OAAOC,IAAID",
                file: "min.js",
                sourceRoot: "/the/root"
            }
        },
        {
            offset: {
                line: 1,
                column: 0
            },
            map: {
                version: 3,
                sources: [
                    "two.js"
                ],
                sourcesContent: [
                    " TWO.inc = function (n) {\n" +
                    "   return n + 1;\n" +
                    " };"
                ],
                names: [
                    "n"
                ],
                mappings: "CAAC,IAAI,IAAM,SAAUA,GAClB,OAAOA",
                file: "min.js",
                sourceRoot: "/different/root"
            }
        }
    ]
};

export const testMapWithSourcesContent = {
    version: 3,
    file: "min.js",
    names: ["bar", "baz", "n"],
    sources: ["one.js", "two.js"],
    sourcesContent: [
        " ONE.foo = function (bar) {\n" +
        "   return baz(bar);\n" +
        " };",
        " TWO.inc = function (n) {\n" +
        "   return n + 1;\n" +
        " };"
    ],
    sourceRoot: "/the/root",
    mappings: "CAAC,IAAI,IAAM,SAAUA,GAClB,OAAOC,IAAID;CCDb,IAAI,IAAM,SAAUE,GAClB,OAAOA"
};

export const testMapRelativeSources = {
    version: 3,
    file: "min.js",
    names: ["bar", "baz", "n"],
    sources: ["./one.js", "./two.js"],
    sourcesContent: [
        " ONE.foo = function (bar) {\n" +
        "   return baz(bar);\n" +
        " };",
        " TWO.inc = function (n) {\n" +
        "   return n + 1;\n" +
        " };"
    ],
    sourceRoot: "/the/root",
    mappings: "CAAC,IAAI,IAAM,SAAUA,GAClB,OAAOC,IAAID;CCDb,IAAI,IAAM,SAAUE,GAClB,OAAOA"
};

export const emptyMap = {
    version: 3,
    file: "min.js",
    names: [],
    sources: [],
    mappings: ""
};


export const assertMapping = (
    generatedLine, generatedColumn, originalSource,
    originalLine, originalColumn,
    name, bias, map, assert,
    dontTestGenerated, dontTestOriginal
) => {
    if (!dontTestOriginal) {
        const origMapping = map.originalPositionFor({
            line: generatedLine,
            column: generatedColumn,
            bias
        });
        assert.equal(
            origMapping.name,
            name,
            `Incorrect name, expected ${JSON.stringify(name)}, got ${JSON.stringify(origMapping.name)}`
        );
        assert.equal(
            origMapping.line,
            originalLine,
            `Incorrect line, expected ${JSON.stringify(originalLine)}, got ${JSON.stringify(origMapping.line)}`
        );
        assert.equal(
            origMapping.column,
            originalColumn,
            `Incorrect column, expected ${JSON.stringify(originalColumn)}, got ${JSON.stringify(origMapping.column)}`
        );

        let expectedSource;

        if (originalSource && map.sourceRoot && originalSource.indexOf(map.sourceRoot) === 0) {
            expectedSource = originalSource;
        } else if (originalSource) {
            expectedSource = map.sourceRoot ? util.join(map.sourceRoot, originalSource) :
                                              originalSource;
        } else {
            expectedSource = null;
        }

        assert.equal(
            origMapping.source,
            expectedSource,
            `Incorrect source, expected ${JSON.stringify(expectedSource)}, got ${JSON.stringify(origMapping.source)}`
        );
    }

    if (!dontTestGenerated) {
        const genMapping = map.generatedPositionFor({
            source: originalSource,
            line: originalLine,
            column: originalColumn,
            bias
        });
        assert.equal(
            genMapping.line,
            generatedLine,
            `Incorrect line, expected ${JSON.stringify(generatedLine)}, got ${JSON.stringify(genMapping.line)}`
        );
        assert.equal(
            genMapping.column,
            generatedColumn,
            `Incorrect column, expected ${JSON.stringify(generatedColumn)}, got ${JSON.stringify(genMapping.column)}`
        );
    }
};

export const assertEqualMaps = (assert, actualMap, expectedMap) => {
    assert.equal(actualMap.version, expectedMap.version, "version mismatch");
    assert.equal(actualMap.file, expectedMap.file, "file mismatch");
    assert.equal(
        actualMap.names.length,
        expectedMap.names.length,
        `names length mismatch: ${actualMap.names.join(", ")} != ${expectedMap.names.join(", ")}`);
    for (let i = 0; i < actualMap.names.length; i++) {
        assert.equal(
            actualMap.names[i],
            expectedMap.names[i],
            `names[${i}] mismatch: ${actualMap.names.join(", ")} != ${expectedMap.names.join(", ")}`
        );
    }
    assert.equal(
        actualMap.sources.length,
        expectedMap.sources.length,
        `sources length mismatch: ${actualMap.sources.join(", ")} != ${expectedMap.sources.join(", ")}`
    );
    for (let i = 0; i < actualMap.sources.length; i++) {
        assert.equal(
            actualMap.sources[i],
            expectedMap.sources[i],
            `sources[${i}] length mismatch: ${actualMap.sources.join(", ")} != ${expectedMap.sources.join(", ")}`
        );
    }
    assert.equal(
        actualMap.sourceRoot,
        expectedMap.sourceRoot,
        `sourceRoot mismatch: ${actualMap.sourceRoot} != ${expectedMap.sourceRoot}`
    );
    assert.equal(
        actualMap.mappings,
        expectedMap.mappings,
        `mappings mismatch:\nActual:   ${actualMap.mappings}\nExpected: ${expectedMap.mappings}`
    );
    if (actualMap.sourcesContent) {
        assert.equal(
            actualMap.sourcesContent.length,
            expectedMap.sourcesContent.length,
            "sourcesContent length mismatch"
        );
        for (let i = 0; i < actualMap.sourcesContent.length; i++) {
            assert.equal(
                actualMap.sourcesContent[i],
                expectedMap.sourcesContent[i],
                `sourcesContent[${i}] mismatch`
            );
        }
    }
};
