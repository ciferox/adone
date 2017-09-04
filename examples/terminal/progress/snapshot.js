adone.application.run({
    main() {
        console.log();
        console.log();
        console.log();
        console.log();
        console.log();

        const tokens = "{underline}{magenta-fg}:current{/}/{italic}{green-fg}:total{/} {bold}{yellow-fg}:percent{/} {italic}{blue-fg}:elapsed{/} {italic}{cyan-fg}:eta{/}";

        const bar0 = adone.runtime.term.progress({
            schema: "    [:bar] :current/:total :percent :elapsed :eta",
            width: 70,
            current: 0
        });

        const bar1 = adone.runtime.term.progress({
            schema: "    [:bar] :current/:total :percent :elapsed :eta",
            width: 70,
            current: 10
        });

        const bar2 = adone.runtime.term.progress({
            schema: "    {white-fg}[{/}{brightgreen-fg}:filled{/}{brightyellow-fg}:blank{/}{white-fg}]{/} {red-fg}:current{/}/{gray-fg}:total{/} {green-fg}:percent{/} :elapsed :eta",
            width: 70,
            current: 20
        });

        const bar3 = adone.runtime.term.progress({
            schema: "    [:bar] :current/:total :percent :elapsed :eta",
            width: 70,
            current: 30
        });

        const bar4 = adone.runtime.term.progress({
            schema: "    [:bar] :current/:total :percent :elapsed :eta",
            width: 70,
            current: 40
        });

        const bar5 = adone.runtime.term.progress({
            schema: "    {white-fg}[{/}:filled:blank] :current/:total :percent :elapsed :eta",
            width: 70,
            current: 50
        });


        let index = 0;
        const steps = [0.1, 0.15, 0.2, 0.25,
            0.1,
            0.3, 0.35, 0.4, 0.45,
            0.2,
            0.5, 0.55, 0.6, 0.65,
            0.3,
            0.3, 0.35, 0.4, 0.45,
            0.4,
            0.7, 0.75, 0.8, 0.85,
            0.4,
            0.9, 0.95, 0.8, 0.85,
            0.7,
            0.8, 1.0];

        let backward = false;
        let forward = false;

        var timer = setInterval(() => {

            let color = "";
            const current = bar4.current;

            if (current < 60) {
                color = "red";
            } else if (current < 70) {
                color = "magenta";
            } else if (current < 80) {
                color = "yellow";
            } else if (current < 90) {
                color = "blue";
            } else if (current < 100) {
                color = "green";
            }

            const schema = `    {white-fg}[{/}{${color}-fg}:filled{/}{gray-fg}:blank{/}{white-fg}] {/}${tokens}`;

            bar4.setSchema(schema);

            bar0.tick();

            //bar1.tick();

            if (index >= steps.length) {
            } else {
                bar1.update(steps[index++]);
            }


            bar2.tick();

            if (!forward) {
                bar3.tick();
                if (bar3.current >= 50) {
                    forward = true;
                }
            } else if (!backward) {
                bar3.tick(-1);
                if (bar3.current <= 10) {
                    backward = true;
                }
            } else {
                bar3.tick();
            }


            bar4.tick();
            bar5.tick();

            if (bar0.completed
                && bar1.completed
                && bar2.completed
                && bar3.completed
                && bar4.completed
                && bar5.completed) {
                clearInterval(timer);
                console.log();
                console.log();
                console.log();
                console.log();
                console.log();
            }

        }, 50);


        console.log();
        console.log();
        console.log();
        console.log();
        console.log();
    }
});
