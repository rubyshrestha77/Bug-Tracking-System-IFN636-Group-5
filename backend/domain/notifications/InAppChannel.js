const NotificationChannel = require('./NotificationChannel');
const Notification = require('../../models/Notification');

class InAppChannel extends NotificationChannel {
    async send(recipientId, message, bugId) {
        return Notification.create({
            recipient: recipientId,
            message,
            bug: bugId
        });
    }
}

module.exports = InAppChannel;