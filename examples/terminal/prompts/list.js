adone.app.run({
    async main() {
        const answers = await adone.runtime.term.prompt().run([
            {
                type: "list",
                name: "theme",
                message: "What do you want to do?",
                choices: [
                    "Order a pizza",
                    "Make a reservation",
                    adone.runtime.term.separator(),
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
        ])
        adone.log(JSON.stringify(answers, null, "  "));
    }
});
