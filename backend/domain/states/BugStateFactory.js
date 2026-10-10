const NewState = require('./NewState');
const AssignedState = require('./AssignedState');
const InProgressState = require('./InProgressState');
const ResolvedState = require('./ResolvedState');
const ReopenedState = require('./ReopenedState');
const ClosedState = require('./ClosedState');

const registry = {
    'New': NewState,
    'Assigned': AssignedState,
    'In Progress': InProgressState,
    'Resolved': ResolvedState,
    'Reopened': ReopenedState,
    'Closed': ClosedState
};

class BugStateFactory {
    static create(status) {
        const StateClass = registry[status];
        if (!StateClass) throw new Error(`Unknown bug status: ${status}`);
        return new StateClass();
    }
}

module.exports = BugStateFactory;