const { data: { yaml }, is } = adone;

const resolveYamlNull = (data) => {
    if (is.null(data)) {
        return true;
    }

    const max = data.length;

    return (max === 1 && data === "~") ||
           (max === 4 && (data === "null" || data === "Null" || data === "NULL"));
};

module.exports = new yaml.type.Type("tag:yaml.org,2002:null", {
    kind: "scalar",
    resolve: resolveYamlNull,
    construct: () => null,
    predicate: is.null,
    represent: {
        canonical: () => "~",
        lowercase: () => "null",
        uppercase: () => "NULL",
        camelcase: () => "Null"
    },
    defaultStyle: "lowercase"
});
