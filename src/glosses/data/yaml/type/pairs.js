const { data: { yaml }, is, util } = adone;

const resolveYamlPairs = (data) => {
    if (is.null(data)) {
        return true;
    }

    for (const pair of data) {
        if (!is.object(pair)) {
            return false;
        }
        if (util.keys(pair).length !== 1) {
            return false;
        }
    }

    return true;
};

export default new yaml.type.Type("tag:yaml.org,2002:pairs", {
    kind: "sequence",
    resolve: resolveYamlPairs,
    construct: (data) => is.null(data) ? [] : data.map((pair) => util.entries(pair)[0])
});
