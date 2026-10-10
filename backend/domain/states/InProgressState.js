const { BugState } = require('./BugState');

class InProgressState extends BugState {
    constructor() { super('In Progress'); }

    allowsTransitionTo(target) {
        return target === 'Resolved';
    }

    refusalMessage(target) {
        if (target === 'Deleted') {
            return 'This bug cannot be deleted because work has already begun on it';
        }
        return super.refusalMessage(target);
    }
}

module.exports = InProgressState;