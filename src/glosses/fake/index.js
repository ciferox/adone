const {
    is
} = adone;

const localeFallback = "en";
let seedValue;
let locale;

export const setLocale = (loc) => {
    locale = loc;
};

export const getLocale = () => locale;

const __ = adone.lazify({
    iban: "./iban",
    fake: "./fake",
    helpers: "./helpers",
    unique: "./unique",
    locales: "./locales",
    random: "./random",
    name: "./name",
    address: "./address",
    company: "./company",
    finance: "./finance",
    image: "./image",
    lorem: "./lorem",
    hacker: "./hacker",
    internet: "./internet",
    database: "./database",
    phone: "./phone_number",
    date: "./date",
    commerce: "./commerce",
    system: "./system",
    definitions: () => {
        const _definitions = {
            name: ["first_name", "last_name", "prefix", "suffix", "gender", "title", "male_first_name", "female_first_name", "male_middle_name", "female_middle_name", "male_last_name", "female_last_name"],
            address: ["city_prefix", "city_suffix", "street_suffix", "county", "country", "country_code", "state", "state_abbr", "street_prefix", "postcode", "direction", "direction_abbr"],
            company: ["adjective", "noun", "descriptor", "bs_adjective", "bs_noun", "bs_verb", "suffix"],
            lorem: ["words"],
            hacker: ["abbreviation", "adjective", "noun", "verb", "ingverb", "phrase"],
            phone_number: ["formats"],
            finance: ["account_type", "transaction_type", "currency", "iban", "credit_card"],
            internet: ["avatar_uri", "domain_suffix", "free_email", "example_email", "password"],
            commerce: ["color", "department", "product_name", "price", "categories"],
            database: ["collation", "column", "engine", "type"],
            system: ["mimeTypes"],
            date: ["month", "weekday"],
            title: "",
            separator: ""
        };

        const definitions = {};

        // Create a Getter for all definitions.foo.bar properties
        Object.keys(_definitions).forEach((d) => {
            if (is.undefined(definitions[d])) {
                definitions[d] = {};
            }

            if (is.string(_definitions[d])) {
                definitions[d] = _definitions[d];
                return;
            }

            _definitions[d].forEach((p) => {
                Object.defineProperty(definitions[d], p, {
                    get() {
                        if (is.undefined(__.locales[locale][d]) || is.undefined(__.locales[locale][d][p])) {
                            // certain localization sets contain less data then others.
                            // in the case of a missing definition, use the default localeFallback to substitute the missing set data
                            // throw new Error('unknown property ' + d + p)
                            return __.locales[localeFallback][d][p];
                        }
                        // return localized data
                        return __.locales[locale][d][p];
                    }
                });
            });
        });

        return definitions;
    }
}, adone.asNamespace(exports), require);

export const seed = (value) => {
    seedValue = value;
    if (value) {
        if (is.array(value) && value.length) {
            __.random.mersenne.seed_array(value);
        } else {
            __.random.mersenne.seed(value);
        }
    }
};
