adone.app.run({
    async main() {
        const answers = await adone.runtime.cli.prompt([
            {
                type: "checkbox",
                message: "Select toppings",
                name: "toppings",
                choices: [
                    adone.runtime.cli.separator(" = The Meats = "),
                    {
                        name: "Pepperoni"
                    },
                    {
                        name: "Ham"
                    },
                    {
                        name: "Ground Meat"
                    },
                    {
                        name: "Bacon"
                    },
                    adone.runtime.cli.separator(" = The Cheeses = "),
                    {
                        name: "Mozzarella",
                        checked: true
                    },
                    {
                        name: "Cheddar"
                    },
                    {
                        name: "Parmesan"
                    },
                    adone.runtime.cli.separator(" = The usual ="),
                    {
                        name: "Mushroom"
                    },
                    {
                        name: "Tomato"
                    },
                    adone.runtime.cli.separator(" = The extras = "),
                    {
                        name: "Pineapple"
                    },
                    {
                        name: "Olives",
                        disabled: "out of stock"
                    },
                    {
                        name: "Extra cheese"
                    }
                ],
                validate(answer) {
                    if (answer.length < 1) {
                        return "You must choose at least one topping.";
                    }
                    return true;
                }
            }
        ]);
        console.log(JSON.stringify(answers, null, "  "));
    }
});
