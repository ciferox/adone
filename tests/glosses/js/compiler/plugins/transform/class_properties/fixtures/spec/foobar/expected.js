class Child extends Parent {
    constructor() {
        super();
        Object.defineProperty(this, "scopedFunctionWithThis", {
            enumerable: true,
            writable: true,
            value: () => {
                this.name = {};
            }
        });
    }

}
