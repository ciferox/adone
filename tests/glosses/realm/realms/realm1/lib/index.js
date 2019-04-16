const {
    task: { task },
    realm
} = adone;

@task("task1")
export class Task1 extends realm.BaseTask {
    main() {
        return "ok";
    }
}

@task("task2")
export class Task2 extends realm.BaseTask {
    main() {
        return adone.package.version;
    }
}
