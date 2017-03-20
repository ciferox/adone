const { vendor: { lodash: _ } } = adone;
const fuzzy = require("fuzzy");

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

const searchStates = (answers, input) => {
    input = input || "";
    return new Promise((resolve) => {
        setTimeout(() => {
            const fuzzyResult = fuzzy.filter(input, states);
            resolve(fuzzyResult.map((el) => {
                return el.original;
            }));
        }, adone.math.random(30, 500));
    });
};

adone.terminal.prompt([
    {
        type: "autocomplete",
        name: "from",
        suggestOnly: true,
        message: "Select a state to travel from, you can type any value",
        source: searchStates,
        pageSize: 4,
        validate(val) {
            return val
                ? true
                : "Type something!";
        }
    }, {
        type: "autocomplete",
        name: "to",
        message: "Select a state to travel to, select one from the list.",
        source: searchStates
    }
], (answers) => {
    console.log(JSON.stringify(answers, null, 2));
});
