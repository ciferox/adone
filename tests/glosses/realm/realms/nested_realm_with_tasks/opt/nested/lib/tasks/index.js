const {
    task: { task },
    realm: { BaseTask }
} = adone;

@task("nestedA")
export class NestedTaskA extends BaseTask {
    main() {
        return "aaa";
    }
}

@task("nestedB")
export class NestedTaskB extends BaseTask {
    main() {
        return "bbb";
    }
}

@task("dummy")
export class DummyTask extends BaseTask {
    main() {
        return "nested dummy";
    }
}

