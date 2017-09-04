adone.application.run({
    main() {
        const list = [
            "image01.jpg", "image02.jpg", "image03.jpg", "image04.jpg", "image05.jpg",
            "image06.jpg", "image07.jpg", "image08.jpg", "image09.jpg", "image10.jpg"
        ];
        const bar = adone.runtime.term.progress({
            schema: ":percent eta: :eta downloading :current/:total :file",
            total: list.length
        });

        const iv = setInterval(() => {
            bar.tick({
                file: list[bar.current]
            });

            if (bar.completed) {
                clearInterval(iv);
            }
        }, 500);

    }
});
