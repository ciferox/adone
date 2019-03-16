const {
    realm: { BaseTask
    }
} = adone;

class NestedTaskA extends BaseTask {
    run() {
        return "aaa";
    }
}

class NestedTaskB extends BaseTask {
    run() {
        return "bbb";
    }
}

class DummyTask extends BaseTask {
    run() {
        return "nested dummy";
    }
}

adone.lazify({
    nestedA: () => NestedTaskA,
    nestedB: () => NestedTaskB,
    dummy: () => DummyTask
}, exports);
