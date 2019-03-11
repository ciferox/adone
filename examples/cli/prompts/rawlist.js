adone.app.run({
    async main() {
        const answers = await adone.cli.prompt([
            {
                type: "rawlist",
                name: "theme",
                message: "What do you want to do?",
                choices: [
                    "Order a pizza",
                    "Make a reservation",
                    adone.cli.separator(),
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
        ]);
        console.log(JSON.stringify(answers, null, "  "));
    }
});
