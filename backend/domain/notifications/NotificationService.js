const InAppChannel = require('./InAppChannel');
const { EVENTS } = require('../events/BugEventPublisher');

const RULES = {
    [EVENTS.ASSIGN]: {
        recipient: (event) => event.reporterId,
        message: (event) => `"${event.bugTitle}" has been picked up by a developer`,
        skipSelf: true
    },
    [EVENTS.RESOLVE]: {
        recipient: (event) => event.reporterId,
        message: (event) => `"${event.bugTitle}" has been resolved and is ready to verify`,
        skipSelf: true
    },
    [EVENTS.REOPEN]: {
        recipient: (event) => event.assigneeId,
        message: (event) => `"${event.bugTitle}" has been reopened`,
        skipSelf: true
    },
    [EVENTS.VERIFY]: {
        recipient: (event) => event.assigneeId,
        message: (event) => `"${event.bugTitle}" has been verified and closed`,
        skipSelf: true
    }
};

class NotificationService {
    constructor(channel = new InAppChannel()) {
        this.channel = channel;
    }

    async update(event) {
        const rule = RULES[event.type];
        if (!rule) return;                      

        const recipientId = rule.recipient(event);
        if (!recipientId) return;              
        if (rule.skipSelf && recipientId.toString() === event.actorId.toString()) {
            return;                            
        }

        await this.channel.send(recipientId, rule.message(event), event.bugId);
    }
}

module.exports = NotificationService;