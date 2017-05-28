const { terminal, vendor: { lodash: _ } } = adone;

adone.run({
    main() {
        const fromRange = (start, end, fn) => {
            _.range(start, end).forEach(fn);
            terminal.print("{default}\n");
        };

        terminal.print("{bold}\n=== 256 colors register test ===\n\n{/}");
        fromRange(0, 256, (i) => {
            if (!(i % 70)) {
                terminal.print("{normal}\n");
            }
            terminal.print("{=%u-fg}*", i);
        });

        fromRange(0, 256, (i) => {
            if (!(i % 70)) {
                terminal.print("{normal}\n");
            }
            terminal.print("{=%u-bg} ", i);
        });

        terminal.print("{bold}\n=== 256 colors 26 shades of gray test ===\n\n{/}");
        fromRange(0, 26, (i) => {
            terminal.print("{~%u-fg}*", i * 255 / 25);
        });

        fromRange(0, 26, (i) => {
            terminal.print("{~%u-bg} ", i * 255 / 25);
        });

        terminal.print("{bold}\n=== 256 colors RGB 6x6x6 color cube test ===\n\n{/}");

        fromRange(0, 6, (g) => {
            fromRange(0, 6, (r) => {
                for (let b = 0; b <= 5; b++) {
                    terminal.print("{#%02x%02x%02x-fg}*", r * 255 / 5, g * 255 / 5, b * 255 / 5);
                }
                terminal.print(" ");
            });
        });

        fromRange(0, 6, (g) => {
            fromRange(0, 6, (r) => {
                for (let b = 0; b <= 5; b++) {
                    terminal.print("{#%02x%02x%02x-bg}  ", r * 255 / 5, g * 255 / 5, b * 255 / 5);
                }
                terminal.print(" ");
            });
        });

        terminal.print("{default}\n");
        terminal.print("Reset...\n");
    }
});
