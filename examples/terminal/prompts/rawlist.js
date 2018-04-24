adone.app.run({
    main() {
        adone.runtime.term.prompt().run([
            {
                type: "rawlist",
                name: "theme",
                message: "What do you want to do?",
                choices: [
                    "Order a pizza",
                    "Make a reservation",
                    adone.runtime.term.separator(),
                    "Ask opening hours",
                    "Talk to the receptionist"
                ]
            },
            {
                type: "rawlist",
                name: "size",
                message: "What size do you need",
                choices: ["Jumbo", "Large", "Standard", "Medium", "Small", "Micro"],
                filter(val) {
                    return val.toLowerCase();
                }
            }
        ]).then((answers) => {
            adone.log(JSON.stringify(answers, null, "  "));
        });
    }
});
