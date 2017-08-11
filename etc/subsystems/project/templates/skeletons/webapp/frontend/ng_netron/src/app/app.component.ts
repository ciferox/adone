import { Component, OnInit } from '@angular/core';
import { NetronService } from "ng-netron";

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
    title: string = "App";
    systemInfo: string;
    time: Date;

    constructor(private netronService: NetronService) {
    }

    async ngOnInit(): Promise<any> {
        await this.netronService.requestConfig(null);
        this.netronService.connect();
        this.reload();
    }

    async reload(): Promise<any> {
        this.systemInfo = await (await this.interface()).system();
        setInterval(async () => {
            this.time = await (await this.interface()).time();
        }, 1000);
    }

    interface(name = "info") {
        return this.netronService.getInterface(name);
    }
}
