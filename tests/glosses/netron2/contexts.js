const {
    netron2: { DContext, DPublic }
} = adone;

@DContext()
export class Simple {
    @DPublic()
    simple() {
        return 888;
    }
}

@DContext()
export class A {
    @DPublic()
    methodA() {
        return this.propA;
    }

    @DPublic()
    propA = "aaa";
}

@DContext({
    description: "class b extends a"
})
export class B extends A {
    constructor() {
        super();
        this.val = "bbb";
    }
    @DPublic()
    methodB() {
        return this.val;
    }

    @DPublic()
    echoB(...args) {
        return args;
    }

    @DPublic()
    syncErrorB() {
        throw new adone.exception.InvalidArgument("Invalid argument");
    }

    @DPublic()
    asyncErrorB() {
        return new Promise(async (resolve, reject) => {
            await adone.promise.delay(1);
            reject(new adone.exception.InvalidArgument("Invalid argument"));
        });
    }

    @DPublic()
    asyncB() {
        return new Promise(async (resolve) => {
            await adone.promise.delay(1);
            resolve("ok");
        });
    }

    @DPublic()
    propB = 2;

    @DPublic({
        readonly: true
    })
    rpropB = 777;
}


@DContext()
export class C extends B {
    @DPublic()
    methodC() {
        return "ccc";
    }

    @DPublic()
    propC = 3;
}

export const commonTypes = [
    {
        name: "string",
        value: "adone"
    },
    {
        name: "integer",
        value: 7887
    },
    {
        name: "double",
        value: 78.87
    },
    {
        name: "date",
        value: new Date()
    },
    {
        name: "boolean",
        value: true
    },
    {
        name: "null",
        value: null
    },
    {
        name: "undefined",
        value: undefined
    },
    // {
    //     name: "regexp",
    //     value: /adone/
    // },
    {
        name: "array1",
        value: [1, 2, 3]
    },
    {
        name: "array2",
        value: ["3", "2", "1"]
    },
    {
        name: "array3",
        value: [true, 1, "adone", new Date()]
    },
    {
        name: "object1",
        value: {
            a: 1
        }
    },
    {
        name: "object2",
        value: {
            a: "adone",
            b: {
                c: [1, {
                    // e: /adone/,
                    d: 98.99
                }, new Date()]
            }
        }
    }
];

@DContext()
export class CommonTypes { }

for (const ct of commonTypes) {
    CommonTypes.prototype[`_${ct.name}`] = ct.value;
    adone.meta.reflect.defineMetadata(adone.netron2.PUBLIC_ANNOTATION, {}, CommonTypes.prototype, `_${ct.name}`);

    CommonTypes.prototype[ct.name] = function () {
        return this[`_${ct.name}`];
    };
    adone.meta.reflect.defineMetadata(adone.netron2.PUBLIC_ANNOTATION, {}, CommonTypes.prototype, ct.name);
}
