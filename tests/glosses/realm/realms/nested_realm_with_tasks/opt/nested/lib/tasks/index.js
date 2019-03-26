const {
    realm: { BaseTask
    }
} = adone;

class NestedTaskA extends BaseTask {
    main() {
        return "aaa";
    }
}

class NestedTaskB extends BaseTask {
    main() {
        return "bbb";
    }
}

class DummyTask extends BaseTask {
    main() {
        return "nested dummy";
    }
}

adone.lazify({
    nestedA: () => NestedTaskA,
    nestedB: () => NestedTaskB,
    dummy: () => DummyTask
}, exports);
