const { regex } = adone;

describe("regex", () => {
    describe("ansi", () => {
        const ansiCodes = require(adone.std.path.join(__dirname, "fixtures/ansi-codes"));
        const consumptionChars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ!@#$%^&*()_+1234567890-=[]{};\':"./>?,<\\|';

        // testing against codes found at: http://ascii-table.com/ansi-escape-sequences-vt-100.php
        it("match ansi code in a string", () => {
            assert.isTrue(regex.ansi().test("foo\u001b[4mcake\u001b[0m"));
            assert.isTrue(regex.ansi().test("\u001b[4mcake\u001b[0m"));
            assert.isTrue(regex.ansi().test("foo\u001b[4mcake\u001b[0m"));
            assert.isTrue(regex.ansi().test("\u001b[0m\u001b[4m\u001b[42m\u001b[31mfoo\u001b[39m\u001b[49m\u001b[24mfoo\u001b[0m"));
            assert.isTrue(regex.ansi().test("foo\u001b[mfoo"));
        });

        it("match ansi code from ls command", () => {
            assert.isTrue(regex.ansi().test("\u001B[00;38;5;244m\u001B[m\u001B[00;38;5;33mfoo\u001B[0m"));
        });

        it("match reset;setfg;setbg;italics;strike;underline sequence in a string", () => {
            assert.isTrue(regex.ansi().test("\u001B[0;33;49;3;9;4mbar\u001B[0m"));
            assert.equal("foo\u001B[0;33;49;3;9;4mbar".match(regex.ansi())[0], "\u001B[0;33;49;3;9;4m");
        });

        it("match clear tabs sequence in a string", () => {
            assert.isTrue(regex.ansi().test("foo\u001B[0gbar"));
            assert.equal("foo\u001B[0gbar".match(regex.ansi())[0], "\u001B[0g");
        });

        it("match clear line from cursor right in a string", () => {
            assert.isTrue(regex.ansi().test("foo\u001B[Kbar"));
            assert.equal("foo\u001B[Kbar".match(regex.ansi())[0], "\u001B[K");
        });

        it("match clear screen in a string", () => {
            assert.isTrue(regex.ansi().test("foo\u001B[2Jbar"));
            assert.equal("foo\u001B[2Jbar".match(regex.ansi())[0], "\u001B[2J");
        });
        
        it.todo('match "change icon name and window title" in string', () => {
            assert.isTrue("\u001B]0;sg@tota:~/git/\u0007\u001B[01;32m[sg@tota\u001B[01;37m misc-tests\u001B[01;32m]$".match(regex.ansi())[0], "\u001B]0;sg@tota:~/git/\u0007");
        });
        
        // testing against extended codes (excluding codes ending in 0-9)
        for (const codeSet in ansiCodes) {
            for (const code in ansiCodes[codeSet]) {
                const codeInfo = ansiCodes[codeSet][code];
                const skip = /[0-9]$/.test(code);
                const skipText = skip ? "[SKIP] " : "";
                const ecode = `\u001b${code}`;

                it(`${skipText + code} -> ${codeInfo[0]}`, () => {
                    if (skip) {
                        return;
                    }

                    const string = `hel${ecode}lo`;

                    assert.isTrue(regex.ansi().test(string));
                    assert.equal(string.match(regex.ansi())[0], ecode);
                    assert.equal(string.replace(regex.ansi(), ""), "hello");
                });

                it(`${skipText + code} should not overconsume`, () => {
                    if (skip) {
                        return;
                    }

                    for (let i = 0; i < consumptionChars.length; i++) {
                        const c = consumptionChars[i];
                        const string = ecode + c;

                        assert.isTrue(regex.ansi().test(string));
                        assert.equal(string.match(regex.ansi())[0], ecode);
                        assert.equal(string.replace(regex.ansi(), ""), c);
                    }
                });
            }
        }
    });
});
