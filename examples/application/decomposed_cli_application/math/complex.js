const {
    error,
    app
} = adone;

const {
    DCliCommand
} = app;

const parseComplexNumber = (str) => {
    if (!str) {
        throw new error.InvalidArgument("Number cannot be empty");
    }
    const res = str.match(/^(-?\d+)((?:\+\d+|-\d+))i$/);
    if (!res) {
        throw new error.InvalidArgument("Numbers must have format a+bi, where a and b are real numbers");
    }
    const [, a, b] = res;
    return [Number(a), Number(b)];
};

const formatComplexNumber = (a, b) => {
    if (b === 0) {
        return `${a}`;
    }
    if (a === 0) {
        return `${b}i`;
    }
    if (b < 0) {
        return `${a} - ${-b}i`;
    }
    return `${a} + ${b}i`;
};

export default class Complex extends app.Subsystem {
    @DCliCommand({
        name: "add",
        description: "Adds two complex numbers",
        arguments: [{
            name: "a",
            type: parseComplexNumber,
            description: "first complex number"
        }, {
            name: "b",
            type: parseComplexNumber,
            description: "second complex number"
        }]
    })
    add(args) {
        const [x0, y0] = args.get("a");
        const [x1, y1] = args.get("b");
        adone.log(formatComplexNumber(x0 + x1, y0 + y1));
    }

    @DCliCommand({
        name: "sub",
        description: "Subtracts two complex numbers",
        arguments: [{
            name: "a",
            type: parseComplexNumber,
            description: "first complex number"
        }, {
            name: "b",
            type: parseComplexNumber,
            description: "second complex number"
        }]
    })
    sub(args) {
        const [x0, y0] = args.get("a");
        const [x1, y1] = args.get("b");
        adone.log(formatComplexNumber(x0 - x1, y0 - y1));
    }

    @DCliCommand({
        name: "mul",
        description: "Multiplies two complex numbers",
        arguments: [{
            name: "a",
            type: parseComplexNumber,
            description: "first complex number"
        }, {
            name: "b",
            type: parseComplexNumber,
            description: "second complex number"
        }]
    })
    mul(args) {
        const [x0, y0] = args.get("a");
        const [x1, y1] = args.get("b");
        adone.log(formatComplexNumber(x0 * x1 - y0 * y1, y0 * x1 + x0 * y1));
    }

    @DCliCommand({
        name: "div",
        description: "Divides two complex numbers",
        arguments: [{
            name: "a",
            type: parseComplexNumber,
            description: "first complex number"
        }, {
            name: "b",
            type: parseComplexNumber,
            description: "second complex number"
        }]
    })
    div(args) {
        const [x0, y0] = args.get("a");
        const [x1, y1] = args.get("b");
        const d = x1 * x1 + y1 * y1;
        if (d === 0) {
            adone.logError("division by zero");
            return 1;
        }
        adone.log(formatComplexNumber((x0 * x1 + y0 * y1) / d, (y1 * x0 - x0 * y1) / d));
    }
}
