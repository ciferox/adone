adone.app.run({
    async main() {
        const answers = await adone.runtime.term.prompt().run([
            {
                type: "checkbox",
                message: "Select toppings",
                name: "toppings",
                choices: [
                    adone.runtime.term.separator(" = The Meats = "),
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
                    adone.runtime.term.separator(" = The Cheeses = "),
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
                    adone.runtime.term.separator(" = The usual ="),
                    {
                        name: "Mushroom"
                    },
                    {
                        name: "Tomato"
                    },
                    adone.runtime.term.separator(" = The extras = "),
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
        adone.log(JSON.stringify(answers, null, "  "));
    }
});
