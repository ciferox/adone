const {
    realm
} = adone;

@adone.task.task("task2")
export default class Task2 extends realm.BaseTask {
    main() {
        return adone.package.version;
    }
}
