export default class GetConfigTask extends adone.task.IsomorphicTask {
    main({ netron }) {
        return netron.options;
    }
}
