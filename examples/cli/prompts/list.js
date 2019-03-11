adone.app.run({
    async main() {
        const answers = await adone.runtime.cli.prompt([
            {
                type: "list",
                name: "theme",
                message: "What do you want to do?",
                choices: [
                    "Order a pizza",
                    "Make a reservation",
                    adone.runtime.cli.separator(),
                    "Ask for opening hours",
                    {
                        name: "Contact support",
                        disabled: "Unavailable at this time"
                    },
                    "Talk to the receptionist"
                ]
            },
            {
                type: "list",
                name: "size",
                message: "What size do you need?",
                choices: ["Jumbo", "Large", "Standard", "Medium", "Small", "Micro"],
                filter(val) {
                    return val.toLowerCase();
                }
            }
        ]);
        console.log(JSON.stringify(answers, null, "  "));
    }
});
