const { expect } = require('chai');
const BugStateFactory = require('../domain/states/BugStateFactory');
const { BugState } = require('../domain/states/BugState');

// status  [statuses it may move to]
const ALLOWED = {
  'New':         ['Assigned', 'Deleted'],
  'Assigned':    ['In Progress'],
  'In Progress': ['Resolved'],
  'Resolved':    ['Closed', 'Reopened'],
  'Reopened':    ['In Progress'],
  'Closed':      [],
};
const ALL_TARGETS = ['New', 'Assigned', 'In Progress', 'Resolved', 'Closed', 'Reopened', 'Deleted'];

describe('Bug lifecycle (State pattern)', () => {

  describe('BugStateFactory', () => {
    Object.keys(ALLOWED).forEach((status) => {
      it(`should create the state for "${status}"`, () => {
        expect(BugStateFactory.create(status).status).to.equal(status);
      });
    });

    it('should throw for an unknown status', () => {
      expect(() => BugStateFactory.create('Archived')).to.throw('Unknown bug status: Archived');
    });
  });

  describe('allowed transitions', () => {
    Object.entries(ALLOWED).forEach(([status, allowed]) => {
      const state = BugStateFactory.create(status);

      allowed.forEach((target) => {
        it(`should allow ${status} -> ${target}`, () => {
          expect(state.allowsTransitionTo(target)).to.be.true;
        });
      });

      ALL_TARGETS.filter((target) => !allowed.includes(target)).forEach((target) => {
        it(`should refuse ${status} -> ${target}`, () => {
          expect(state.allowsTransitionTo(target)).to.be.false;
        });
      });
    });
  });

  describe('who may perform a transition', () => {
    const state = new BugState('New');
    const developer = { id: 'dev1', role: 'developer' };
    const reporterUser = { id: 'rep1', role: 'reporter' };
    const bug = { assignee: 'dev1', reporter: 'rep1' };

    it('should let only a developer assign', () => {
      expect(state.isAuthorisedFor('Assigned', developer, bug)).to.be.true;
      expect(state.isAuthorisedFor('Assigned', reporterUser, bug)).to.be.false;
    });

    ['In Progress', 'Resolved'].forEach((target) => {
      it(`should let only the assignee move a bug to ${target}`, () => {
        expect(state.isAuthorisedFor(target, developer, bug)).to.be.true;
        expect(state.isAuthorisedFor(target, { id: 'dev2', role: 'developer' }, bug)).to.be.false;
      });
    });

    ['Closed', 'Reopened', 'Deleted'].forEach((target) => {
      it(`should let only the reporter move a bug to ${target}`, () => {
        expect(state.isAuthorisedFor(target, reporterUser, bug)).to.be.true;
        expect(state.isAuthorisedFor(target, developer, bug)).to.be.false;
      });
    });

    it('should refuse everyone when the bug has no assignee yet', () => {
      expect(state.isAuthorisedFor('In Progress', developer, { assignee: null, reporter: 'rep1' })).to.be.false;
    });

    it('should refuse an unknown target status', () => {
      expect(state.isAuthorisedFor('Teleported', developer, bug)).to.be.false;
    });
  });

  describe('messages', () => {
    it('should give a clear permission message', () => {
      const state = BugStateFactory.create('New');
      expect(state.permissionMessage('Assigned')).to.equal('Only a developer can assign this bug');
    });

    it('should fall back to a generic permission message', () => {
      expect(BugStateFactory.create('New').permissionMessage('Teleported'))
        .to.equal('You are not permitted to perform this action on this bug');
    });

    it('should explain which move was refused', () => {
      expect(BugStateFactory.create('New').refusalMessage('Resolved'))
        .to.equal('A bug with status New cannot be moved to Resolved');
    });

    ['Assigned', 'In Progress', 'Resolved', 'Reopened'].forEach((status) => {
      it(`should explain that a ${status} bug cannot be deleted`, () => {
        expect(BugStateFactory.create(status).refusalMessage('Deleted'))
          .to.equal('This bug cannot be deleted because work has already begun on it');
      });
    });

    it('should explain that a Closed bug can no longer be changed', () => {
      expect(BugStateFactory.create('Closed').refusalMessage('Reopened'))
        .to.equal('This bug is closed and can no longer be changed');
    });
  });
});
