const { std: { path } } = adone;

export default {
    project: {
        name: "{{ name }}",
        structure: {
            {{ bin }}
            {{ lib }}
        }
    }
};
