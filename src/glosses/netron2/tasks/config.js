export default class ConfigTask extends adone.task.Task {
    run(peer) {
        if (peer === this.manager.peer) {
            return this.manager.options;
        }
    
        return {
            proxyContexts: this.manager.options.proxyContexts
        };    
    }
}
