const {
    error,
    is,
    app
} = adone;

const {
    CommandMeta
} = app;

const parseNumber = (str) => {
    if (!is.numeral(str)) {
        throw new error.InvalidArgumentException("Argument must be a real number");
    }
    return Number(str);
};

export default class Complex extends app.Subsystem {
    @CommandMeta({
        name: "add",
        description: "Adds two real numbers",
        arguments: [{
            name: "a",
            type: parseNumber,
            description: "first real number"
        }, {
            name: "b",
            type: parseNumber,
            description: "second real number"
        }]
    })
    add(args) {
        console.log(args.get("a") + args.get("b"));
    }

    @CommandMeta({
        name: "sub",
        description: "Subtracts two real numbers",
        arguments: [{
            name: "a",
            type: parseNumber,
            description: "first real number"
        }, {
            name: "b",
            type: parseNumber,
            description: "second real number"
        }]
    })
    sub(args) {
        console.log(args.get("a") - args.get("b"));
    }

    @CommandMeta({
        name: "mul",
        description: "Multiplies two real numbers",
        arguments: [{
            name: "a",
            type: parseNumber,
            description: "first real number"
        }, {
            name: "b",
            type: parseNumber,
            description: "second real number"
        }]
    })
    mul(args) {
        console.log(args.get("a") * args.get("b"));
    }

    @CommandMeta({
        name: "div",
        description: "Divides two real numbers",
        arguments: [{
            name: "a",
            type: parseNumber,
            description: "first real number"
        }, {
            name: "b",
            type: parseNumber,
            description: "second real number"
        }]
    })
    div(args) {
        const b = args.get("b");
        if (b === 0) {
            adone.logError("division by zero");
            return 1;
        }
        console.log(args.get("a") / b);
    }
}
