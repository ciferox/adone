const { data: { yaml }, is } = adone;

export default new yaml.type.Type("tag:yaml.org,2002:seq", {
    kind: "sequence",
    construct: (data) => !is.null(data) ? data : []
});
