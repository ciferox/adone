import adone from "adone";
const { system } = adone.metrics;
const { Type, Contextable, Description } = adone.netron.decorator;

@Contextable
@Description("System metrics")
export class System {
    @Description("Returns operating system description")
    @Type(Object)
    getOSInfo() {
        return {
            manufacturer: system.manufacturer,
            family: system.family,
            version: system.version,
            codeName: system.codeName,
            buildNumber: system.buildNumber,
            full: system.toString()
        };        
    }
    
    @Description("Returns list of processes")
    @Type(Array)
    getProcesses() {
        return system.getProcesses();
    }

    @Description("Returns process information by PID")
    @Type(Object)
    getProcess(pid) {
        return system.getProcess(pid);
    }

    @Description("Returns number processes currently running")
    @Type(Number)
    getProcessCount() {
        return system.getProcessCount();
    }

    @Description("Returns number threads currently running")
    @Type(Number)
    getThreadCount() {
        return system.getThreadCount();
    }
}
