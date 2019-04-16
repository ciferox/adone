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
