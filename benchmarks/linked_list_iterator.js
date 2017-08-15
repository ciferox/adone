const { collection: { LinkedList } } = adone;

class GeneratorIteratorLinkedList extends LinkedList {
    *[Symbol.iterator]() {
        let cursor = this.head;
        for (let i = 0; i < this.length; ++i) {
            yield cursor.value;
            cursor = cursor.next;
        }
    }
}

const a = new LinkedList(1000);
const b = new GeneratorIteratorLinkedList(1000);

for (let i = 0; i < 1000; ++i) {
    a.push(i);
    b.push(i);
}

export default {
    "for-of": () => {
        for (const i of a) {
            i;
        }
    },
    generator: () => {
        for (const i of b) {
            i;
        }
    },
    "by hands": () => {
        let node = a.head;
        for (let i = 0; i < a.length; ++i) {
            const value = node.value;
            value;
            node = node.next;
        }
    },
    forEach: () => {
        a.forEach((value) => {
            value;
        });
    }
};
