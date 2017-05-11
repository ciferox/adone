adone.run({
    main() {
        const bar = adone.terminal.progress({
            clean: true,
            schema: " [:bar] \n:current/:total \n:percent \n:elapsed :eta",
            callback() {
                console.log(123);
            }
        });

        const iv = setInterval(() => {
            bar.tick();
            console.log(new Date());

            if (bar.completed) {
                clearInterval(iv);
                bar.destroy();
                console.log("completed");
                this.exit(0);
            }

        }, 10);
    }
});

