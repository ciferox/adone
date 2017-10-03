const DoubleEndedQueue = require("double-ended-queue");
const { Queue } = adone.collection;

export default {
    "push 100 elements": {
        queue: () => {
            const q = new Queue();
            for (let i = 0; i < 100; ++i) {
                q.push(1);
            }
        },
        array: () => {
            const q = [];
            for (let i = 0; i < 100; ++i) {
                q.push(i);
            }
        },
        DoubleEndedQueue: () => {
            const q = new DoubleEndedQueue();
            for (let i = 0; i < 100; ++i) {
                q.push(i);
            }
        }
    },
    "push + pop 100 elements": {
        queue: () => {
            const q = new Queue();
            for (let i = 0; i < 100; ++i) {
                q.push(1);
            }
            for (let i = 0; i < 100; ++i) {
                q.pop();
            }
        },
        array: () => {
            const q = [];
            for (let i = 0; i < 100; ++i) {
                q.push(i);
            }
            for (let i = 0; i < 100; ++i) {
                q.shift();
            }
        },
        DoubleEndedQueue: () => {
            const q = new DoubleEndedQueue();
            for (let i = 0; i < 100; ++i) {
                q.push(i);
            }
            for (let i = 0; i < 100; ++i) {
                q.shift();
            }
        }
    }
};
