const { data: { yaml }, is } = adone;

export default new yaml.type.Type("tag:yaml.org,2002:map", {
    kind: "mapping",
    construct: (data) => !is.null(data) ? data : {}
});
