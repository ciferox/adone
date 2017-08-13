adone.application.run({
    main() {
        adone.terminal.prompt().run([
            {
                type: "checkbox",
                message: "Select toppings",
                name: "toppings",
                choices: [
                    adone.terminal.separator(" = The Meats = "),
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
                    adone.terminal.separator(" = The Cheeses = "),
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
                    adone.terminal.separator(" = The usual ="),
                    {
                        name: "Mushroom"
                    },
                    {
                        name: "Tomato"
                    },
                    adone.terminal.separator(" = The extras = "),
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
