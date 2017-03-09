export const schemas = {
    group: {
        name: {
            type: "string",
            unique: true,
            required: true
        },
        description: {
            type: "string",
            default: ""
        },
        contexts: {
            type: "array",
            required: true
        }
    },
    user: {
        name: {
            type: "string",
            required: true,
            register: true
        },
        group: {
            type: "string",
            required: true
        },
        description: {
            type: "string",
            default: ""
        },
        status: {
            type: "enum",
            default: "Disabled",
            values: [
                "Disabled",
                "Enabled",
                "Unconfirmed"
            ]
        },
        email: {
            type: "email",
            unique: true,
            required: true,
            login: true,
            register: true
        },
        password: {
            type: "password",
            required: true,
            login: true,
            register: true,
            options: {
                type: "hash",
                minLength: 5,
                maxLength: null,
                required: {
                    lcLetters: null,
                    ucLetters: null,
                    numbers: 0,
                    specials: 0
                }
            }
        }
    }
};

export const userGroup = {
    name: "User",
    description: "Default group for users",
    contexts: [
        "auth"
    ]
};

export const adminGroup = {
    name: "Admin",
    description: "Default group for admins",
    contexts: []
};
