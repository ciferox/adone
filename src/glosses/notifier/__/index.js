const { lazify } = adone;

lazify({
    util: "./util"
}, exports, require);

export const notifiers = lazify({
    WindowsBalloon: "./notifiers/balloon",
    WindowsToaster: "./notifiers/toaster",
    Growl: "./notifiers/growl",
    NotificationCenter: "./notifiers/notification_center",
    NotifySend: "./notifiers/notify_send"
}, null, require);

