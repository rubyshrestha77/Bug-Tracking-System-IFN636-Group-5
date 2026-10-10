const { BugState } = require('./BugState');

class ResolvedState extends BugState {
    constructor() { super('Resolved'); }

    allowsTransitionTo(target) {
        return target === 'Closed' || target === 'Reopened';
    }

    refusalMessage(target) {
        if (target === 'Deleted') {
            return 'This bug cannot be deleted because work has already begun on it';
        }
        return super.refusalMessage(target);
    }
}

module.exports = ResolvedState;