const {
    cli,
    text
} = adone;

const states = [
    "Alabama",
    "Alaska",
    "American Samoa",
    "Arizona",
    "Arkansas",
    "California",
    "Colorado",
    "Connecticut",
    "Delaware",
    "District Of Columbia",
    "Federated States Of Micronesia",
    "Florida",
    "Georgia",
    "Guam",
    "Hawaii",
    "Idaho",
    "Illinois",
    "Indiana",
    "Iowa",
    "Kansas",
    "Kentucky",
    "Louisiana",
    "Maine",
    "Marshall Islands",
    "Maryland",
    "Massachusetts",
    "Michigan",
    "Minnesota",
    "Mississippi",
    "Missouri",
    "Montana",
    "Nebraska",
    "Nevada",
    "New Hampshire",
    "New Jersey",
    "New Mexico",
    "New York",
    "North Carolina",
    "North Dakota",
    "Northern Mariana Islands",
    "Ohio",
    "Oklahoma",
    "Oregon",
    "Palau",
    "Pennsylvania",
    "Puerto Rico",
    "Rhode Island",
    "South Carolina",
    "South Dakota",
    "Tennessee",
    "Texas",
    "Utah",
    "Vermont",
    "Virgin Islands",
    "Virginia",
    "Washington",
    "West Virginia",
    "Wisconsin",
    "Wyoming"
];

const foods = [
    "Apple",
    "Orange",
    "Banana",
    "Kiwi",
    "Lichi",
    "Grapefruit"
];

adone.app.run({
    initialize() {
        this.fuzzyStates = new text.Fuzzy(states, {
            threshold: 0.3
        });

        this.fuzzyFoods = new text.Fuzzy(foods, {
            threshold: 0.3
        });
    },
    async main() {
        const answers = await cli.prompt([
            {
                type: "autocomplete",
                name: "fruit",
                suggestOnly: true,
                message: "What is your favorite fruit?",
                source: (answers, input) => {
                    input = input || "";
                    return new Promise((resolve) => {
                        setTimeout(() => {
                            if (input === "") {
                                resolve(foods);
                            } else {
                                resolve(this.fuzzyFoods.search(input).map((indx) => foods[indx]));
                            }
                        }, adone.math.random(30, 500));
                    });
                },
                pageSize: 4,
                validate(val) {
                    return val ? true : "Type something!";
                }
            }, {
                type: "autocomplete",
                name: "state",
                message: "Select a state to travel from",
                source: (answers, input) => {
                    input = input || "";
                    return new Promise((resolve) => {
                        setTimeout(() => {
                            if (input === "") {
                                resolve(states);
                            } else {
                                resolve(this.fuzzyStates.search(input).map((indx) => states[indx]));
                            }
                        }, adone.math.random(30, 500));
                    });
                }
            }
        ]);
        console.log(JSON.stringify(answers, null, 2));
    }
});
