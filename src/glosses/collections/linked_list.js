

const empty = Symbol.for("linkedlist:empty");

class Node {
    constructor(prev = null, next = null, value = empty) {
        this.next = next;
        this.prev = prev;
        this.value = value;
    }
}

export default class LinkedList {
    constructor(size) {
        if (!size) {
            size = 16;
            this.autoresize = true;
        }

        this.head = new Node;

        let cursor = this.head;
        for (let i = 0; i < size - 1; ++i) {
            cursor = cursor.next = new Node(cursor);
        }
        this.tail = cursor;
        this.tail.next = this.head;
        this.head.prev = this.tail;
        this.tail = this.head.prev;
        this.length = 0;
        this.maxLength = size;
    }

    get full() {
        return this.length === this.maxLength;
    }

    get empty() {
        return this.length === 0;
    }

    /**
     * изменить размер списка
     * 
     * @param {any} newLength
     * @returns
     * 
     * @memberOf LinkedList
     */
    resize(newLength) {
        if (newLength === this.maxLength) {
            return;
        }
        if (newLength < this.maxLength) {
            if (newLength > this.length) {
                let cursor = this.tail;
                for (let i = 0, n = newLength - this.length; i < n; ++i) {
                    cursor = cursor.next;
                }
                cursor.next = this.head;
                this.head.prev = cursor;
                this.tail = cursor;
            } else if (newLength < this.length) {
                let cursor = this.tail;
                for (let i = 0, n = this.length - newLength; i < n; ++i) {
                    cursor = cursor.prev;
                }
                cursor.next = this.head;
                this.head.prev = cursor;
                this.length = newLength;
            } else {
                this.tail.next = this.head;
                this.head.prev = this.tail;
            }
        } else if (newLength > this.maxLength) {
            let cursor = this.head.prev;
            for (let i = 0, n = newLength - this.maxLength; i < n; ++i) {
                cursor = cursor.next = new Node(cursor);
            }
            cursor.next = this.head;
            this.head.prev = cursor;
        }
        this.maxLength = newLength;
    }

    /**
     * добавить элемент в конец списка
     * 
     * @param {any} value
     * @returns
     * 
     * @memberOf LinkedList
     */
    push(value) {
        if (this.full) {
            if (this.autoresize) {
                this.resize(this.maxLength * 2);
            } else {
                throw new adone.x.Exception("Full");
            }
        }
        this.tail = this.tail.next;
        this.tail.value = value;
        ++this.length;

        return this.tail;
    }

    /**
     * забрать элемент из конца списка
     * 
     * @returns
     * 
     * @memberOf LinkedList
     */
    pop() {
        if (this.empty) {
            return;
        }
        const value = this.tail.value;
        this.tail.value = empty;
        this.tail = this.tail.prev;
        --this.length;
        return value;
    }

    /**
     * забрать элемент из начала списка
     * 
     * @returns
     * 
     * @memberOf LinkedList
     */
    shift() {
        if (this.empty) {
            return;
        }
        const value = this.head.value;
        this.head.value = empty;
        this.head = this.head.next;
        --this.length;
        return value;
    }

    /**
     * добавить элемент в начало списка
     * 
     * @param {any} value
     * @returns
     * 
     * @memberOf LinkedList
     */
    unshift(value) {
        if (this.full) {
            if (this.autoresize) {
                this.resize(this.maxLength * 2);
            } else {
                throw new adone.x.Exception("Full");
            }
        }
        this.head = this.head.prev;
        this.head.value = value;
        ++this.length;
        return this.head;
    }

    /**
     * передвинуть узел в конец списка
     * 
     * @param {any} node
     * @returns
     * 
     * @memberOf LinkedList
     */
    pushNode(node) {
        if (node === this.tail) {
            return;
        }
        if (node === this.head) {
            this.head = this.head.next;
        }
        node.next.prev = node.prev;
        node.prev.next = node.next;

        node.next = this.tail.next;
        this.tail.next.prev = node;

        node.prev = this.tail;
        this.tail.next = node;
    }

    /**
     * передвинуть узел в начало списка
     * 
     * @param {any} node
     * @returns
     * 
     * @memberOf LinkedList
     */
    unshiftNode(node) {
        if (node === this.head) {
            return;
        }
        if (node === this.tail) {
            this.tail = this.tail.prev;
        }
        node.next.prev = node.prev;
        node.prev.next = node.next;

        node.prev = this.head.prev;
        this.head.prev.next = node;

        node.next = this.head;
        this.head.prev = node;

        this.head = node;
    }

    /**
     * удалить узел из списка
     * 
     * @param {any} node
     * @returns
     * 
     * @memberOf LinkedList
     */
    removeNode(node) {
        if (node === this.tail) {
            this.tail.value = empty;
            this.tail = this.tail.prev;
            --this.length;
            return;
        }
        node.value = empty;
        this.pushNode(node);
        --this.length;
    }

    /**
     * очистить список
     * 
     * @param {boolean} [strong=false] затереть все элементы
     * 
     * @memberOf LinkedList
     */
    clear(strong = false) {
        if (strong) {
            for (let i = 0, n = this.length, cursor = this.head; i < n; ++i, cursor = cursor.next) {
                cursor.value = empty;
            }
        }
        this.length = 0;
        this.tail = this.head.prev;
    }

    toArray() {
        const f = [];
        for (let i = 0, cursor = this.head, n = this.length; i < n; ++i, cursor = cursor.next) {
            f.push(cursor.value);
        }
        return f;
    }


    get front() {
        if (this.length === 0) {
            throw new adone.x.Exception("Empty");
        }
        return this.head.value;
    }

    get back() {
        if (this.length === 0) {
            throw new adone.x.Exception("Empty");
        }
        return this.tail.value;
    }

    [Symbol.iterator]() {
        let cursor = this.head;
        let i = 0;
        return {
            next: () => {
                if (i++ >= this.length) {
                    return { done: true };
                }
                const value = cursor.value;
                cursor = cursor.next;
                return { value, done: false };
            }
        };
    }

    nextNode(node) {
        if (!node) {
            return this.empty ? null : this.head;
        }
        if (node !== this.tail) {
            return node.next;
        }
        return null;
    }
}
