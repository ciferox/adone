const { Stack, LinkedList } = adone.collection;

export default {
    "push 100 elements": {
        stack: () => {
            const s = new Stack();
            for (let i = 0; i < 100; ++i) {
                s.push(i);
            }
        },
        array: () => {
            const s = [];
            for (let i = 0; i < 100; ++i) {
                s.push(i);
            }
        },
        linkedList: () => {
            const s = new LinkedList();
            for (let i = 0; i < 100; ++i) {
                s.push(i);
            }
        }
    },
    "push + pop 100 elements": {
        stack: () => {
            const s = new Stack();
            for (let i = 0; i < 100; ++i) {
                s.push(i);
            }
            for (let i = 0; i < 100; ++i) {
                s.pop();
            }
        },
        array: () => {
            const s = [];
            for (let i = 0; i < 100; ++i) {
                s.push(i);
            }
            for (let i = 0; i < 100; ++i) {
                s.pop();
            }
        },
        linkedList: () => {
            const s = new LinkedList();
            for (let i = 0; i < 100; ++i) {
                s.push(i);
            }
            for (let i = 0; i < 100; ++i) {
                s.pop();
            }
        }
    }
};
