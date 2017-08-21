const {
    fs,
    std: { path },
    fast
} = adone;

export default {
    name: "{{ name }}",
    description: "",
    version: "0.0.0",
    author: "",
    project: {
        type: "{{ type }}",
        structure: {
            {{ bin }}
            {{ lib }}
        }
    }
};
