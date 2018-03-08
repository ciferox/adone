// export class Command extends adone.shell.Base {
//     constructor() {
//         super("whoami");
//     }

//     _execute() {
//         let user;
//         if (adone.std.os.platform() === "win32") {
//             user = process.env.USERNAME.toLowerCase();
//             const domain = process.env.USERDOMAIN.toLowerCase();
//             return `${domain}/${user}`;
//         }
//         return process.env.USER;
//     }
// }
