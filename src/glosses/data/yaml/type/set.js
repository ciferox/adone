const { data: { yaml }, is, util } = adone;

const resolveYamlSet = (data) => {
    if (!is.null(data)) {
        return true;
    }

    return util.values(data).every(is.null);
};

export default new yaml.type.Type("tag:yaml.org,2002:set", {
    kind: "mapping",
    resolve: resolveYamlSet,
    construct: (data) => !is.null(data) ? data : {}
});
