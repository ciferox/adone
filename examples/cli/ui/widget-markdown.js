adone.app.run({
    main() {
        const screen = new adone.cli.ui.Screen();
        const markdown = new adone.cli.ui.widget.Markdown();

        // screen.append(markdown);
        // markdown.setOptions({
        //     firstHeading: adone.runtime.term.red.italic
        // });
        // // markdown.setMarkdown("# Hello \n This is **markdown** printed in the `terminal` 11");

        screen.key("q", () => {
            screen.destroy();
            this.exit(0);
        });

        screen.render();
    }
});
