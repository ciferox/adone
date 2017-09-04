adone.application.run({
    main() {
        const fs = adone.std.fs;

        // {open}xxxx{close} xxxx xxxx xxxx xxxx xxxx xxxx xxxx xxxx xxxx xxxx xxxx
        // xxxx xxxx xxxx xxxx xxxx xxxx xxxx xxxx xxxx {red-bg}xxxx xxxx xxxx{/red-bg}

        const screen = new adone.terminal.ui.Screen({
            dump: `${__dirname}/logs/nowrap.log`,
            warnings: true
        });

        const box = new adone.terminal.ui.widget.Element({
            parent: screen,
            width: 60,
            wrap: false,
            tags: true,
            content: fs.readFileSync(__filename, "utf8")
            //content: '{red-bg}' + blessed.escape('{{{{{}{bold}x{/bold}}') + '{/red-bg}'
            //  + '\nescaped: {green-fg}{escape}{{{}{{a{bold}b{/bold}c{/escape}{/green-fg}'
        });

        box.focus();

        screen.key("q", () => {
            return screen.destroy();
        });

        screen.render();
    }
});
