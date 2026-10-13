const { BugState } = require('./BugState');

class AssignedState extends BugState {
    constructor() { super('Assigned'); }

    allowsTransitionTo(target) {
        return target === 'In Progress';
    }

    refusalMessage(target) {
        return target === 'Deleted'
            ? 'This bug cannot be deleted because work has already begun on it'
            : super.refusalMessage(target);
    }
}

module.exports = AssignedState;