// import adone from "adone";

adone.terminal.prompt([
    {
        type: "checkbox",
        message: "Select toppings",
        name: "toppings",
        choices: [
            new adone.cui.Separator(" = The Meats = "),
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
            new adone.cui.Separator(" = The Cheeses = "),
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
            new adone.cui.Separator(" = The usual ="),
            {
                name: "Mushroom"
            },
            {
                name: "Tomato"
            },
            new adone.cui.Separator(" = The extras = "),
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
    console.log(JSON.stringify(answers, null, "  "));
});
