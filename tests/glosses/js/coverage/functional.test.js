describe("js", "coverage", "functional", () => {
    const { js: { coverage } } = adone;
    const { calculateCoverage } = coverage;

    const testBranch = (code, values, plugins = []) => {
        expect(calculateCoverage(code, { plugins }).branch).to.be.deep.equal(values);
    };

    const testStatement = (code, values, plugins = []) => {
        expect(calculateCoverage(code, { plugins }).statement).to.be.deep.equal(values);
    };

    const testFunction = (code, values, plugins = []) => {
        expect(calculateCoverage(code, { plugins }).function).to.be.deep.equal(values);
    };

    const test = (code, values, plugins = []) => {
        const t = calculateCoverage(code, { plugins });
        for (const k of Object.keys(values)) {
            expect(t[k]).to.be.deep.equal(values[k]);
        }
    };

    const res = (passed, total) => ({ total, passed, percent: passed / total * 100 });

    describe("if", () => {
        specify("simple branch", () => {
            testBranch(`
                if (1) {

                }
            `, { total: 1, passed: 1, percent: 100 });
        });

        specify("simple branch no cover", () => {
            testBranch(`
                if (0) {

                }
            `, res(0, 1));
        });

        specify("with vars", () => {
            testBranch(`
                const a = 5;
                if (a > 5) {

                }
                if (a < 5) {

                }
                if (a === 5) {
                    if (1) {}
                }
            `, res(2, 4));
        });

        specify("else", () => {
            testBranch(`
                const a = 5;
                if (a > 5) {

                } else {
                    if (1) {}
                }
            `, res(2, 3));
        });

        specify("else if else ", () => {
            testBranch(`
                const a = 5;
                if (a > 5) {

                } else if (a < 5) {

                } else {
                    if (1) {}
                }
            `, res(2, 4));
        });

        specify("else if else if", () => {
            testBranch(`
                const a = 5;
                if (a > 5) {

                } else if (a < 5) {

                } else if (a === 5) {
                    if (1) {}
                }
            `, res(2, 4));
        });

        specify("else if else if no cover", () => {
            testBranch(`
                const a = 5;
                if (a > 5) {

                } else if (a < 5) {

                } else if (a === 0) {

                }
            `, res(0, 3));
        });

        specify("consequent expression", () => {
            testBranch(`
                const a = 5;
                if (a === 5) 1; else if (a === 6) {
                    if (1) {}
                }
            `, res(1, 3));
        });

        specify("alternate expression", () => {
            testBranch(`
                const a = 5;
                if (a === 6) {
                    if (1) {}
                } else 2;
            `, res(1, 3));
        });

        specify("consequent expression + alternate expression", () => {
            testBranch(`
                const a = 5;
                let b = 0;
                if (a > 5) 1; else ++b;
                if (a === 5) ++b; else 1;
                if (b === 2) {
                    //
                }
            `, res(3, 5));
        });

        specify("1 statement", () => {
            testStatement(`
                if (1) {

                }
            `, res(1, 1));
        });

        specify("2 statements", () => {
            testStatement(`
                if (1) {

                }
                if (1) {

                }
            `, res(2, 2));
        });

        specify("else if statement", () => {
            testStatement(`
                if (0) {

                } else if (1) {

                }
            `, res(2, 2));
        });

        specify("no else if statement cover", () => {
            testStatement(`
                if (1) {

                } else if (1) {

                }
            `, res(1, 2)); // never reaches the second if
        });
    });

    describe("array function", () => {
        specify("simple", () => {
            testFunction(`
                const f = () => {

                };
                f();
            `, res(1, 1));
        });

        specify("simple no cover", () => {
            testFunction(`
                const f = () => {};
            `, res(0, 1));
        });

        specify("expression body no cover", () => {
            testFunction(`
                const f = () => 1;
            `, res(0, 1));
        });

        specify("expression body", () => {
            test(`
                const f = () => 1;
                if (f() === 1) {

                }
            `, { function: res(1, 1), branch: res(1, 1) });
        });
    });

    describe("break", () => {
        specify("cover", () => {
            testStatement(`
                for (const i of [1, 2, 3]) {
                    if (i === 2) {
                        break;
                    }
                }
            `, res(3, 3)); // for + if + break
        });

        specify("no cover", () => {
            testStatement(`
                for (const i of [1, 2, 3]) {
                    if (i === 4) {
                        break;
                    }
                }
            `, res(2, 3)); // for + if + break
        });

        specify("label break", () => {
            testStatement(`
                hello: for (const i of [1, 2, 3]) {
                    if (i === 2) {
                        break hello;
                    }
                }
            `, res(3, 3)); // for + if + break
        });

        specify("inside switch", () => {
            testStatement(`
                switch (1) {
                    case 1: {
                        break;
                    }
                }
            `, res(2, 2));
            testStatement(`
                switch (1) {
                    case 1:
                        break;
                }
            `, res(2, 2));
        });
    });

    describe("continue", () => {
        specify("cover", () => {
            testStatement(`
                for (const i of [1, 2, 3]) {
                    if (i === 2) {
                        continue;
                    }
                }
            `, res(3, 3)); // for + if + continue
        });

        specify("no cover", () => {
            testStatement(`
                for (const i of [1, 2, 3]) {
                    if (i === 4) {
                        continue;
                    }
                }
            `, res(2, 3)); // for + if + continue
        });

        specify("label continue", () => {
            testStatement(`
                hello: for (const i of [1, 2, 3]) {
                    if (i === 2) {
                        continue hello;
                    }
                }
            `, res(3, 3));
        });
    });

    describe("debugger", () => {
        specify("cover", () => {
            testStatement(`
                debugger;
            `, res(1, 1));
        });

        specify("no cover", () => {
            testStatement(`
                if (0) {
                    debugger;
                }
            `, res(1, 2)); // only if
        });
    });

    describe("return", () => {
        specify("cover", () => {
            testStatement(`
                const f = () => {
                    return 1;
                };
                f();
            `, res(3, 3)); // var + ret + call
        });

        specify("no cover", () => {
            testStatement(`
                const f = () => {
                    return 1;
                };
            `, res(1, 2)); // var + ret
        });
    });

    describe("throw", () => {
        specify("cover", () => {
            testStatement(`
                try {
                    throw new Error();
                } catch (err) {
                    //
                }
            `, res(2, 2)); // try + throw
        });

        specify("no cover", () => {
            testStatement(`
                if (0) {
                    throw new Error();
                }
            `, res(1, 2)); // if + throw
        });
    });

    describe("try", () => {
        specify("cover", () => {
            testStatement(`
                try {

                } catch (err) {

                }
            `, res(1, 1));
        });

        specify("no cover", () => {
            testStatement(`
                if (0) {
                    try {

                    } catch (err) {

                    }
                }
            `, res(1, 2)); // if + try
        });

        specify("catch branch", () => {
            testBranch(`
                try {
                    throw new Error();
                } catch (err) {

                }
            `, res(1, 1));
        });

        specify("no catch branch cover", () => {
            testBranch(`
                try {

                } catch (err) {

                }
            `, res(0, 1));
        });
    });

    describe("expression statement", () => {
        specify("cover", () => {
            testStatement(`
                1 + 1;
            `, res(1, 1));
        });

        specify("no cover", () => {
            testStatement(`
                if (0) {
                    1 + 1;
                }
            `, res(1, 2));
        });
    });

    describe("for", () => {
        specify("cover", () => {
            testStatement(`
                for (let i = 0; i < 10; ++i) {

                }
            `, res(1, 1));
            testStatement(`
                for (let i = 0; i < 10; ++i);
            `, res(1, 1));
        });

        specify("no cover", () => {
            testStatement(`
                if (0) {
                    for (let i = 0; i < 10; ++i) {

                    }
                }
            `, res(1, 2));
            testStatement(`
                if (0) {
                    for (let i = 0; i < 10; ++i);
                }
            `, res(1, 2));
        });

        specify("cover body/update", () => {
            testBranch(`
                for (let i = 0; i < 10; ++i) {

                }
            `, res(2, 2));
            testBranch(`
                for (let i = 0; i < 10; ++i);
            `, res(2, 2));
        });

        specify("no cover update", () => {
            testBranch(`
                for (let i = 0; i < 10; ++i) {
                    break;
                }
            `, res(1, 2));
            testBranch(`
                for (let i = 0; i < 10; ++i) break;
            `, res(1, 2));
        });

        specify("no cover body + update", () => {
            testBranch(`
                for (let i = 0; false; ++i) {

                }
            `, res(0, 2));
            testBranch(`
                for (let i = 0; false; ++i);
            `, res(0, 2));
        });
    });

    describe("for in", () => {
        specify("cover", () => {
            testStatement(`
                for (const k in { a: 1 }) {

                }
            `, res(1, 1));
            testStatement(`
                for (const k in { a: 1 });
            `, res(1, 1));
        });

        specify("no cover", () => {
            testStatement(`
                if (0) {
                    for (const k in { a: 1 }) {

                    }
                }
            `, res(1, 2));
            testStatement(`
                if (0) {
                    for (const k in { a: 1 });
                }
            `, res(1, 2));
        });

        specify("cover body", () => {
            testBranch(`
                for (const k in { a: 1 }) {

                }
            `, res(1, 1));
        });
        specify("no cover body", () => {
            testBranch(`
                for (const k in {}) {

                }
            `, res(0, 1));
        });
    });

    describe("for of", () => {
        specify("cover", () => {
            testStatement(`
                for (const k of [1]) {

                }
            `, res(1, 1));
            testStatement(`
                for (const k of [1]);
            `, res(1, 1));
        });

        specify("no cover", () => {
            testStatement(`
                if (0) {
                    for (const k of [1]) {

                    }
                }
            `, res(1, 2));
            testStatement(`
                if (0) {
                    for (const k of [1]);
                }
            `, res(1, 2));
        });

        specify("cover body", () => {
            testBranch(`
                for (const k of [1]) {

                }
            `, res(1, 1));
        });
        specify("no cover body", () => {
            testBranch(`
                for (const k of []) {

                }
            `, res(0, 1));
        });
    });

    describe("while", () => {
        specify("cover", () => {
            testStatement(`
                while (true) {
                    break;
                }
            `, res(2, 2));
            testStatement(`
                while (true) break;
            `, res(2, 2));
        });

        specify("no cover", () => {
            testStatement(`
                if (0) {
                    while (1);
                }
            `, res(1, 2));
        });

        specify("cover body", () => {
            testBranch(`
                while (true) {
                    break;
                }
            `, res(1, 1));
            testBranch(`
                while (true) break;
            `, res(1, 1));
        });

        specify("no cover body", () => {
            testBranch(`
                while (false) {

                }
            `, res(0, 1));
            testBranch(`
                while (false);
            `, res(0, 1));
        });
    });

    describe("do while", () => {
        specify("cover", () => {
            testStatement(`
                do {

                } while (false);
            `, res(1, 1));
            testStatement(`
                do ; while (false);
            `, res(1, 1));
        });

        specify("no cover", () => {
            testStatement(`
                if (0) {
                    do {

                    } while (false);
                }
            `, res(1, 2));
            testStatement(`
                if (0) {
                    do ; while (false);
                }
            `, res(1, 2));
        });

        specify("cover test", () => {
            testBranch(`
                do {

                } while (false);
            `, res(1, 1));
            testBranch(`
                do ; while (false);
            `, res(1, 1));
        });
        specify("no cover test", () => {
            testBranch(`
                do {
                    break;
                } while (false);
            `, res(0, 1));
        });
    });

    describe("switch", () => {
        specify("cover", () => {
            testStatement(`
                switch (1) {

                }
            `, res(1, 1));
        });

        specify("no cover", () => {
            testStatement(`
                if (0) {
                    switch (1) {

                    }
                }
            `, res(1, 2));
        });

        specify("case", () => {
            testBranch(`
                switch (1) {
                    case 1:
                        ;
                }
            `, res(1, 1));
            testBranch(`
                switch (1) {
                    case 1: {

                    }
                }
            `, res(1, 1));
        });

        specify("multiple cases", () => {
            testBranch(`
                const f = (a) => {
                    switch (a) {
                        case 1:
                            if (1);
                            break;
                        case 2:
                            break;
                        case 3:
                            if (1);
                            break;
                    }
                };
                f(1);
                f(3);
            `, res(4, 5));
        });

        specify("multiple matching cases", () => {
            testBranch(`
                const f = (a) => {
                    switch (a) {
                        case 1:
                        case 2:
                        case 3:
                            break;
                        case 5:
                            if (1);
                            if (1);
                            if (1);
                            if (1);
                            if (1);
                    }
                };
                f(1);
            `, res(3, 9));
        });

        specify("default", () => {
            testBranch(`
                switch (1) {
                    case 2: {
                        break;
                    }
                    default: {

                    }
                }
            `, res(1, 2));
            testBranch(`
                switch (1) {
                    case 1: {

                    }
                    default: {

                    }
                }
            `, res(2, 2));
        });

    });

    describe.skip("with", () => {
        specify("cover", () => {
            testStatement(`
                with ({ a: 1 }) {

                }
            `, res(1, 1));
        });

        specify("no cover", () => {
            testStatement(`
                if (0) {
                    with ({ a: 1 }) {

                    }
                }
            `, res(1, 1));
        });
    });

    describe("function declaration", () => {
        specify("cover", () => {
            test(`
                function f() {

                }
                f();
            `, { function: res(1, 1), statement: res(2, 2) });
        });

        specify("no cover", () => {
            test(`
                function f() {

                }
            `, { function: res(0, 1), statement: res(1, 1) });
        });
    });

    describe("function expression", () => {
        specify("cover", () => {
            testFunction(`
                const f = function () {

                };
                f();
            `, res(1, 1));
        });

        specify("no cover", () => {
            testFunction(`
                const f = function () {

                };
            `, res(0, 1));
        });
    });

    describe.skip("labeled statement", () => {
        //
    });

    describe("conditional expression", () => {
        specify("consequent", () => {
            testBranch(`
                if ((1 ? 2 : 3) === 2) {

                }
            `, res(2, 3));
        });

        specify("alternate", () => {
            testBranch(`
                if ((0 ? 2 : 3) === 3) {

                }
            `, res(2, 3));
        });

        specify("alternate + consequent", () => {
            testBranch(`
                const f = (a) => a ? 2 : 3;
                if (f(true) === 2) {

                }
                if (f(false) === 3) {

                }
            `, res(4, 4));
        });

        specify("no cover", () => {
            testBranch(`
                if (0) {
                    1 ? 2 : 3;
                }
            `, res(0, 3));
        });
    });

    describe("logical expression", () => {
        specify("cover all parts", () => {
            testBranch(`
                1 && 2 && 3 && 4;
            `, res(4, 4));
        });

        specify("no cover trailing", () => {
            testBranch(`
                0 && 1 && 2 && 3;
            `, res(1, 4));
            testBranch(`
                true || (true && false)
            `, res(1, 4));
        });

        specify("complex", () => {
            testBranch(`
                true &&
                (false || true) &&
                ((true && false) || true || false)
            `, res(8, 9));
        });
    });

    describe("variable declaration", () => {
        specify("cover", () => {
            testStatement(`
                const a = 1;
                let b = 3;
                var c = 4;
                let e, r, t;
                let y;
                let u;
                var k
            `, res(7, 7));
        });

        specify("no cover", () => {
            testStatement(`
                if (0) {
                    const a = 0;
                }
            `, res(1, 2));
        });
    });

    describe("class method", () => {
        specify("cover", () => {
            testFunction(`
                class A {
                    a() {

                    }
                }
                new A().a();
            `, res(1, 1));
        });

        specify("no cover", () => {
            testFunction(`
                class A {
                    a() {

                    }
                }
            `, res(0, 1));
        });
    });

    describe("object method", () => {
        specify("cover", () => {
            testFunction(`
                const a = {
                    a() {

                    }
                };
                a.a();
            `, res(1, 1));
        });

        specify("no cover", () => {
            testFunction(`
                const a = {
                    a() {

                    }
                };
            `, res(0, 1));
        });
    });

    describe("assignment pattern", () => {
        specify("assignment cover", () => {
            testBranch(`
                let b;
                [b = 3] = [];
                ({ b = 2 } = {});
            `, res(2, 2));
        });

        specify("no assignment cover", () => {
            testBranch(`
                let b;
                [b = 3] = [2];
                ({ b = 2 } = { b: 2 });
            `, res(0, 2));
        });

        specify("param cover", () => {
            testBranch(`
                const f = (a = 2) => {};
                f();
            `, res(1, 1));
        });

        specify("no param cover", () => {
            testBranch(`
                const f = (a = 2) => {};
                f(2);
            `, res(0, 1));
        });

        specify("descructuring", () => {
            testBranch(`
                const f = ([a = 2] = []) => {};
                f();
            `, res(2, 2));
            testBranch(`
                const f = ([a = 2] = []) => {};
                f([]);
            `, res(1, 2));
            testBranch(`
                const f = ([a = 2] = []) => {};
                f([1]);
            `, res(0, 2));
        });
    });

    describe("class declaration", () => {
        specify("cover", () => {
            testStatement(`
                class A {

                }
            `, res(1, 1));
        });

        specify("no cover", () => {
            testStatement(`
                if (0) {
                    class A {

                    }
                }
            `, res(1, 2));
        });
    });

    describe("overall stats", () => {
        it("should be correct", () => {
            test(`
                const f = (a) => {
                    if (a > 5) {
                        return 2;
                    }
                    return 3;
                };
                const g = (a) => {
                    if (a < 5) {
                        return 3;
                    }
                    return 2;
                };
                f(7);
                g(7);
            `, { statement: res(8, 10), function: res(2, 2), branch: res(1, 2), overall: res(11, 14) });
        });
    });
});
