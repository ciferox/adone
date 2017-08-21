export const namespaces = [
    {
        name: "global",
        description: "Global namespace",
    },
    {
        name: "adone",
        description: "Adone root namespace",
        index: "index",
        namespaces: [
            {
                name: "std",
                description: "Node.js standard modules",
            },
            {
                name: "vendor" ,
                description: "Vendor's code",
                index: "vendor"
            },
            {
                name: "npm",
                description: "Npm's packages mounted as namespaces",
                index: "npm"
            },
            {
                name: "application",
                description: "Application framework",
                index: "glosses/application/index"
            },
            {
                name: "assertion",
                description: "Assertion utilites",
                index: "glosses/assertion/index"
            },
        ]
    }
];
