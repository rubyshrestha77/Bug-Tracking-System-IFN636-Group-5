const { expect } = require('chai');
const sinon = require('sinon');
const Notification = require('../models/Notification');
const {
  getNotifications, markAsRead, markAllAsRead,
} = require('../controllers/notificationController');
const { mockRes, fakeQuery } = require('./helpers/testUtils');

describe('NotificationController', () => {
  afterEach(() => sinon.restore());

  describe('getNotifications', () => {
    it("should return the logged-in user's latest 50 notifications", async () => {
      const list = [{ message: 'Bug assigned' }];
      const query = fakeQuery(list);
      const findStub = sinon.stub(Notification, 'find').returns(query);
      const res = mockRes();

      await getNotifications({ user: { id: 'u1' } }, res);

      expect(findStub.calledOnceWith({ recipient: 'u1' })).to.be.true;
      expect(query.limit.calledWith(50)).to.be.true;
      expect(res.status.calledWith(200)).to.be.true;
      expect(res.json.calledWith(list)).to.be.true;
    });

    it('should return 500 if the database throws', async () => {
      sinon.stub(Notification, 'find').throws(new Error('DB Error'));
      const res = mockRes();

      await getNotifications({ user: { id: 'u1' } }, res);

      expect(res.status.calledWith(500)).to.be.true;
    });
  });

  describe('markAsRead', () => {
    it('should mark the notification as read', async () => {
      const notification = {
        recipient: { toString: () => 'u1' }, isRead: false, save: sinon.stub().resolves(),
      };
      sinon.stub(Notification, 'findById').resolves(notification);
      const res = mockRes();

      await markAsRead({ params: { id: 'n1' }, user: { id: 'u1' } }, res);

      expect(notification.isRead).to.be.true;
      expect(notification.save.calledOnce).to.be.true;
      expect(res.status.calledWith(200)).to.be.true;
      expect(res.json.calledWith(notification)).to.be.true;
    });

    it('should return 404 if the notification does not exist', async () => {
      sinon.stub(Notification, 'findById').resolves(null);
      const res = mockRes();

      await markAsRead({ params: { id: 'n1' }, user: { id: 'u1' } }, res);

      expect(res.status.calledWith(404)).to.be.true;
      expect(res.json.calledWith({ message: 'Notification not found' })).to.be.true;
    });

    it("should return 403 if the notification belongs to someone else", async () => {
      const notification = {
        recipient: { toString: () => 'other' }, isRead: false, save: sinon.stub().resolves(),
      };
      sinon.stub(Notification, 'findById').resolves(notification);
      const res = mockRes();

      await markAsRead({ params: { id: 'n1' }, user: { id: 'u1' } }, res);

      expect(res.status.calledWith(403)).to.be.true;
      expect(notification.save.called).to.be.false;
    });

    it('should return 404 on a malformed id (CastError)', async () => {
      const err = Object.assign(new Error('Cast failed'), { name: 'CastError' });
      sinon.stub(Notification, 'findById').rejects(err);
      const res = mockRes();

      await markAsRead({ params: { id: 'bad' }, user: { id: 'u1' } }, res);

      expect(res.status.calledWith(404)).to.be.true;
    });

    it('should return 500 on any other error', async () => {
      sinon.stub(Notification, 'findById').throws(new Error('DB Error'));
      const res = mockRes();

      await markAsRead({ params: { id: 'n1' }, user: { id: 'u1' } }, res);

      expect(res.status.calledWith(500)).to.be.true;
    });
  });

  describe('markAllAsRead', () => {
    it('should mark every unread notification of the user as read', async () => {
      const updateStub = sinon.stub(Notification, 'updateMany').resolves({ modifiedCount: 3 });
      const res = mockRes();

      await markAllAsRead({ user: { id: 'u1' } }, res);

      expect(updateStub.calledOnceWith({ recipient: 'u1', isRead: false }, { isRead: true })).to.be.true;
      expect(res.status.calledWith(200)).to.be.true;
      expect(res.json.calledWith({ message: 'All notifications marked as read' })).to.be.true;
    });

    it('should return 500 if the database throws', async () => {
      sinon.stub(Notification, 'updateMany').throws(new Error('DB Error'));
      const res = mockRes();

      await markAllAsRead({ user: { id: 'u1' } }, res);

      expect(res.status.calledWith(500)).to.be.true;
    });
  });
});
