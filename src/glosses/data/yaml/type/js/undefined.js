const { data: { yaml }, is, truly } = adone;

export default new yaml.type.Type("tag:yaml.org,2002:js/undefined", {
    kind: "scalar",
    resolve: truly,
    construct: () => undefined,
    predicate: is.undefined,
    represent: () => ""
});
