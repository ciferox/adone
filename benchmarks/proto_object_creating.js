class A {
    constructor() {
        this.a = 1;
    }

    h() {
        console.log("hello");
    }
}

const proto = {
    h() {
        console.log("hello");
    }
};


export default {
    "using classes": () => {
        const a = new A();
    },
    "using proto": () => {
        const a = Object.create(proto);
        a.a = 1;
    }
};
