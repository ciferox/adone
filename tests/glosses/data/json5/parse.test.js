const { is, std: { fs, path }, data: { json5 } } = adone;

const dirsPath = adone.std.path.resolve(__dirname, "fixtures");

const readErrorSpec = (filePath) => {
    const specName = `${path.basename(filePath, ".txt")}.errorSpec`;
    const specPath = path.join(path.dirname(filePath), specName);
    let specTxt;
    try {
        specTxt = fs.readFileSync(specPath); // note that existsSync has been deprecated
    } catch (e) {
        //
    }
    if (specTxt) {
        try {
            return json5.decode(specTxt);
        } catch (err) {
            err.message = `Error reading error specification file ${specName}: ${err.message}`;
            throw err;
        }
    }
};

const testParseJSON5 = (filePath, str) => {
    const errorSpec = readErrorSpec(filePath);
    let err;
    try {
        json5.decode(str);
    } catch (e) {
        err = e;
    }
    assert(err, "Expected JSON5 parsing to fail.");
    if (errorSpec) {
        for (const key of Object.keys(errorSpec)) {
            if (key === "message") {
                assert(err.message.startsWith(errorSpec.message), `Expected error message ${err.message} to start with ${errorSpec.message}`);
            } else {
                assert.equal(err[key], errorSpec[key], `Expected parse error field ${key} to hold value ${errorSpec[key]}`);
            }
        }
    }
};

const dirs = fs.readdirSync(dirsPath).filter((fn) => {
    if (fn.substr(0, 1) === ".") {
        return false;
    }
    return fs.statSync(path.join(dirsPath, fn)).isDirectory();
});

dirs.forEach((dir) => {
    // skip the TODO directory -- these tests are expected to fail:
    if (dir === "todo") {
        return;
    }

    // create a test suite for this group of tests:
    describe("data", "json5", dir, () => {
        fs.readdirSync(path.join(dirsPath, dir)).forEach((fileName) => {
            const ext = path.extname(fileName);
            const filePath = path.join(dirsPath, dir, fileName);
            let str = fs.readFileSync(filePath, "utf8");
            if (dir !== "new-lines") {
                str = str.replace(/\r\n/g, "\n");
            }

            const parseJSON5 = () => {
                return json5.decode(str);
            };

            const parseJSON = () => {
                return JSON.parse(str);
            };

            const parseES5 = () => {
                return eval(`"use strict"; (\n${str}\n)`);
            };

            it(fileName, () => {
                switch (ext) {
                    case ".json":
                        assert.deepEqual(parseJSON5(), parseJSON(), "Expected parsed JSON5 to equal parsed JSON.");
                        break;
                    case ".json5":
                        // test validation
                        assert.throws(parseJSON, SyntaxError);
                        // Need special case for NaN as NaN != NaN
                        if (fileName === "nan.json5") {
                            assert.equal(is.nan(parseJSON5()), is.nan(parseES5()), "Expected parsed JSON5 to equal parsed ES5.");
                        } else {
                            assert.deepEqual(parseJSON5(), parseES5(), "Expected parsed JSON5 to equal parsed ES5.");
                        }
                        break;
                    case ".js":
                        assert.throws(parseJSON, SyntaxError);
                        assert.doesNotThrow(parseES5, "Test case bug: expected ES5 parsing not to fail.");
                        assert.throws(parseJSON5, SyntaxError);
                        break;
                    case ".txt":
                        assert.throws(parseES5, SyntaxError);
                        testParseJSON5(filePath, str);
                        break;
                }
            });
        });
    });
});
