const { data: { yaml }, is } = adone;

const resolveYamlBoolean = (data) => {
    if (is.null(data)) {
        return false;
    }

    const max = data.length;

    return (max === 4 && (data === "true" || data === "True" || data === "TRUE")) ||
           (max === 5 && (data === "false" || data === "False" || data === "FALSE"));
};

const constructYamlBoolean = (data) => {
    return data === "true" || data === "True" || data === "TRUE";
};

export default new yaml.type.Type("tag:yaml.org,2002:bool", {
    kind: "scalar",
    resolve: resolveYamlBoolean,
    construct: constructYamlBoolean,
    predicate: is.boolean,
    represent: {
        lowercase(object) {
            return object ? "true" : "false";
        },
        uppercase(object) {
            return object ? "TRUE" : "FALSE";
        },
        camelcase(object) {
            return object ? "True" : "False";
        }
    },
    defaultStyle: "lowercase"
});
