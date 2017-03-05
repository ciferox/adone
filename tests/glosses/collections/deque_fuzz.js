require("../../../lib/glosses/collections/deque");
const prng = require("./prng");

exports.fuzzDeque = fuzzDeque;
function fuzzDeque(Deque) {
    for (let biasWeight = .3; biasWeight < .8; biasWeight += .2) {
        for (let maxAddLength = 1; maxAddLength < 5; maxAddLength += 3) {
            for (let seed = 0; seed < 10; seed++) {
                const plan = makePlan(100, seed, biasWeight, maxAddLength);
                execute(Deque, plan.ops);
            }
        }
    }
}

exports.makePlan = makePlan;
function makePlan(length, seed, biasWeight, maxAddLength) {
    maxAddLength = maxAddLength || 1;
    const random = prng(seed);
    const ops = [];
    while (ops.length < length) {
        const bias = ops.length / length;
        const choice1 = random() * (1 - biasWeight) + bias * biasWeight;
        const choice2 = random();
        if (choice1 < 1 / (maxAddLength + 1)) {
            if (choice2 < .5) {
                ops.push(["push", makeRandomArray(1 + ~~(random() * maxAddLength - .5))]);
            } else {
                ops.push(["unshift", makeRandomArray(1 + ~~(random() * maxAddLength - .5))]);
            }
        } else {
            if (choice2 < .5) {
                ops.push(["shift", []]);
            } else {
                ops.push(["pop", []]);
            }
        }
    }
    return {
        seed: seed,
        length: length,
        biasWeight: biasWeight,
        maxAddLength: maxAddLength,
        ops: ops
    };
}

function makeRandomArray(length) {
    const array = [];
    for (let index = 0; index < length; index++) {
        array.push(~~(Math.random() * 100));
    }
    return array;
}

exports.execute = execute;
function execute(Collection, ops) {
    const oracle = [];
    const actual = new Collection();
    ops.forEach(function (op) {
        executeOp(oracle, op);
        executeOp(actual, op);
        if (typeof expect === "function") {
            expect(actual.toArray()).to.be.eql(oracle);
        } else if (!actual.toArray().equals(oracle)) {
            console.log(actual.front, actual.toArray(), oracle);
            throw new Error("Did not match after " + stringifyOp(op));
        }
    });
}

exports.executeOp = executeOp;
function executeOp(collection, op) {
    collection[op[0]].apply(collection, op[1]);
}

exports.stringify = stringify;
function stringify(ops) {
    return ops.map(stringifyOp).join(" ");
}

exports.stringifyOp = stringifyOp;
function stringifyOp(op) {
    return op[0] + "(" + op[1].join(", ") + ")";
}

