const { BugState } = require('./BugState');

class ReopenedState extends BugState {
    constructor() { super('Reopened'); }

    allowsTransitionTo(target) {
        return target === 'In Progress';
    }

    refusalMessage(target) {
        if (target === 'Deleted') {
            return 'This bug cannot be deleted because work has already begun on it';
        }
        return super.refusalMessage(target);
    }
}

module.exports = ReopenedState;