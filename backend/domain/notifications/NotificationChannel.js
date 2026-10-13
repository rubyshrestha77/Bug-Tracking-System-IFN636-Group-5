
class NotificationChannel {
    async send(recipientId, message, bugId) {
        throw new Error(`${this.constructor.name} must implement send()`);
    }
}

module.exports = NotificationChannel;