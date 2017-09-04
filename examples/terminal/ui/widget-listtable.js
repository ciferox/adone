adone.application.run({
    main() {
        const screen = new adone.terminal.ui.Screen({
            dump: `${__dirname}/logs/listtable.log`,
            autoPadding: false,
            fullUnicode: true,
            warnings: true
        });

        const DU = "杜";
        const JUAN = "鹃";

        /*
        var box = blessed.box({
          parent: screen,
          top: 'center',
          left: 'center',
          data: null,
          border: 'line',
          align: 'center',
          tags: true,
          keys: true,
          width: '90%',
          height: '80%',
          style: {
            bg: 'red'
          }
        });
        */

        const table = new adone.terminal.ui.widget.ListTable({
            //parent: screen,
            top: "center",
            left: "center",
            data: null,
            border: "line",
            align: "center",
            tags: true,
            keys: true,
            //width: '80%',
            width: "shrink",
            height: "70%",
            vi: true,
            mouse: true,
            style: {
                border: {
                    fg: "red"
                },
                header: {
                    fg: "blue",
                    bold: true
                },
                cell: {
                    fg: "magenta",
                    selected: {
                        bg: "blue"
                    }
                }
            }
        });

        const data1 = [
            ["Animals", "Foods", "Times"],
            ["Elephant", "Apple", "1:00am"],
            ["Bird", "Orange", "2:15pm"],
            ["T-Rex", "Taco", "8:45am"],
            ["Mouse", "Cheese", "9:05am"]
        ];

        data1[1][0] = `{red-fg}${data1[1][0]}{/red-fg}`;
        data1[2][0] += ` (${DU}${JUAN})`;

        const data2 = [
            ["Animals", "Foods", "Times", "Numbers"],
            ["Elephant", "Apple", "1:00am", "One"],
            ["Bird", "Orange", "2:15pm", "Two"],
            ["T-Rex", "Taco", "8:45am", "Three"],
            ["Mouse", "Cheese", "9:05am", "Four"]
        ];

        data2[1][0] = `{red-fg}${data2[1][0]}{/red-fg}`;
        data2[2][0] += ` (${DU}${JUAN})`;

        screen.key("q", () => {
            screen.destroy();
            this.exit(0);
        });

        table.focus();

        table.setData(data2);

        screen.append(table);

        setTimeout(() => {
            table.setData(data1);
            screen.render();
        }, 3000);

        screen.render();
    }
});
