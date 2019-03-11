adone.app.run({
    async main() {
        await adone.runtime.term.prompt().run({
            type: "list",
            name: "chocolate",
            message: "What's your favorite chocolate?",
            choices: ["Mars", "Oh Henry", "Hershey"]
        });
        await adone.runtime.term.prompt().run({
            type: "list",
            name: "beverage",
            message: "And your favorite beverage?",
            choices: ["Pepsi", "Coke", "7up", "Mountain Dew", "Red Bull"]
        });
    }
});
