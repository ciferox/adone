adone.run({
    main() {
        adone.terminal.prompt().run([
            {
                type: "checkbox",
                message: "Select toppings",
                name: "toppings",
                choices: [
                    new adone.terminal.Separator(" = The Meats = "),
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
                    new adone.terminal.Separator(" = The Cheeses = "),
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
                    new adone.terminal.Separator(" = The usual ="),
                    {
                        name: "Mushroom"
                    },
                    {
                        name: "Tomato"
                    },
                    new adone.terminal.Separator(" = The extras = "),
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
        ]).then((answers) => {
            adone.log(JSON.stringify(answers, null, "  "));
        });
    }
});
