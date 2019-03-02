describe("terminal", "esc", () => {
    const {
        is,
        terminal: {
            esc
        }
    } = adone;

    describe("ansi styles", () => {
        it("return ANSI escape codes", () => {
            assert.equal(esc.green.open, "\u001B[32m");
            assert.equal(esc.bgGreen.open, "\u001B[42m");
            assert.equal(esc.green.close, "\u001B[39m");
            assert.equal(esc.gray.open, esc.grey.open);
        });

        it("group related codes into categories", () => {
            assert.equal(esc.color.magenta, esc.magenta);
            assert.equal(esc.bgColor.bgYellow, esc.bgYellow);
            assert.equal(esc.modifier.bold, esc.bold);
        });

        it("should make groups not be enumerable", () => {
            assert.isTrue(!is.undefined(Object.getOwnPropertyDescriptor(esc, "modifier")));
            assert.isTrue(!Object.keys(esc).includes("modifier"));
        });


        it("groups should not be enumerable", () => {
            assert.isTrue(!is.undefined(Object.getOwnPropertyDescriptor(esc, "modifier")));
            assert.isTrue(!Object.keys(esc).includes("modifier"));
        });

        it("all color types are always available", () => {
            const ansi = esc.color.ansi;
            const ansi256 = esc.color.ansi256;
            const ansi16m = esc.color.ansi16m;

            assert.ok(ansi);
            assert.ok(ansi.ansi);
            assert.ok(ansi.ansi256);

            assert.ok(ansi256);
            assert.ok(ansi256.ansi);
            assert.ok(ansi256.ansi256);

            assert.ok(ansi16m);
            assert.ok(ansi16m.ansi);
            assert.ok(ansi16m.ansi256);

            // There are no such things as ansi16m source colors
            assert.notOk(ansi.ansi16m);
            assert.notOk(ansi256.ansi16m);
            assert.notOk(ansi16m.ansi16m);
        });

        it("support conversion to ansi (16 colors)", () => {
            assert.equal(esc.color.ansi.rgb(255, 255, 255), "\u001B[97m");
            assert.equal(esc.color.ansi.hsl(140, 100, 50), "\u001B[92m");
            assert.equal(esc.color.ansi.hex("#990099"), "\u001B[35m");
            assert.equal(esc.color.ansi.hex("#FF00FF"), "\u001B[95m");

            assert.equal(esc.bgColor.ansi.rgb(255, 255, 255), "\u001B[107m");
            assert.equal(esc.bgColor.ansi.hsl(140, 100, 50), "\u001B[102m");
            assert.equal(esc.bgColor.ansi.hex("#990099"), "\u001B[45m");
            assert.equal(esc.bgColor.ansi.hex("#FF00FF"), "\u001B[105m");
        });

        it("support conversion to ansi (256 colors)", () => {
            assert.equal(esc.color.ansi256.rgb(255, 255, 255), "\u001B[38;5;231m");
            assert.equal(esc.color.ansi256.hsl(140, 100, 50), "\u001B[38;5;48m");
            assert.equal(esc.color.ansi256.hex("#990099"), "\u001B[38;5;127m");
            assert.equal(esc.color.ansi256.hex("#FF00FF"), "\u001B[38;5;201m");

            assert.equal(esc.bgColor.ansi256.rgb(255, 255, 255), "\u001B[48;5;231m");
            assert.equal(esc.bgColor.ansi256.hsl(140, 100, 50), "\u001B[48;5;48m");
            assert.equal(esc.bgColor.ansi256.hex("#990099"), "\u001B[48;5;127m");
            assert.equal(esc.bgColor.ansi256.hex("#FF00FF"), "\u001B[48;5;201m");
        });

        it("support conversion to ansi (16 million colors)", () => {
            assert.equal(esc.color.ansi16m.rgb(255, 255, 255), "\u001B[38;2;255;255;255m");
            assert.equal(esc.color.ansi16m.hsl(140, 100, 50), "\u001B[38;2;0;255;85m");
            assert.equal(esc.color.ansi16m.hex("#990099"), "\u001B[38;2;153;0;153m");
            assert.equal(esc.color.ansi16m.hex("#FF00FF"), "\u001B[38;2;255;0;255m");

            assert.equal(esc.bgColor.ansi16m.rgb(255, 255, 255), "\u001B[48;2;255;255;255m");
            assert.equal(esc.bgColor.ansi16m.hsl(140, 100, 50), "\u001B[48;2;0;255;85m");
            assert.equal(esc.bgColor.ansi16m.hex("#990099"), "\u001B[48;2;153;0;153m");
            assert.equal(esc.bgColor.ansi16m.hex("#FF00FF"), "\u001B[48;2;255;0;255m");
        });

        it("16/256/16m color close escapes", () => {
            assert.equal(esc.color.close, "\u001B[39m");
            assert.equal(esc.bgColor.close, "\u001B[49m");
        });

        it("export raw ANSI escape codes", () => {
            assert.equal(esc.codes.get(0), 0);
            assert.equal(esc.codes.get(1), 22);
            assert.equal(esc.codes.get(91), 39);
            assert.equal(esc.codes.get(40), 49);
            assert.equal(esc.codes.get(100), 49);
        });

        it("rgb -> truecolor is stubbed", () => {
            assert.equal(esc.color.ansi16m.rgb(123, 45, 67), "\u001B[38;2;123;45;67m");
        });
    });
});
