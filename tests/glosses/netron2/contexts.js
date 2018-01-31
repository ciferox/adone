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
        return "aaa";
    }

    @DPublic()
    propA = 1;
}

@DContext()
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
        throw new adone.x.InvalidArgument("Invalid argument");
    }

    @DPublic()
    asyncErrorB() {
        return new Promise(async (resolve, reject) => {
            await adone.promise.delay(1);
            reject(new adone.x.InvalidArgument("Invalid argument"));
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
