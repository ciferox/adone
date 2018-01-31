function sum1(a, b) {
    return a + b;
}

const sum2 = function (a, b) {
    return a + b;
};

const sum3 = (a, b) => {
    return a + b;
};

class A {
    constructor() {
        this.wrap1 = (...args) => this.sum(...args);
        this.wrap2 = (...args) => this.sum.apply(this, args);
    }
    sum(a, b) {
        return a + b;
    }
}

const a = new A();

export default {
    "sum1(a, b)"() {
        return sum1(1, 2);
    },
    "sum1.apply(null, args)"() {
        return sum1.apply(a, [1, 2]);
    },
    "sum2(a, b)"() {
        return sum2(1, 2);
    },
    "sum2.apply(null, args)"() {
        return sum2.apply(a, [1, 2]);
    },
    "sum3(a, b)"() {
        return sum3(1, 2);
    },
    "sum3.apply(null, args)"() {
        return sum3.apply(a, [1, 2]);
    },
    "obj.sum(a, b)"() {
        return a.sum(1, 2);
    },
    "obj.sum.apply(obj, args)"() {
        return a.sum.apply(a, [1, 2]);
    },
    "Reflect.apply(obj.sum, obj, args)"() {
        return Reflect.apply(a.sum, a, [1, 2]);
    },
    "obj.wrap1(...args)"() {
        return a.wrap1(1, 2);
    },
    "obj.wrap2(...args)"() {
        return a.wrap2(1, 2);
    }
};
