
import { expect } from 'chai';
import sinon from 'sinon';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const Bug = require('../models/Bug.js');
const { generateReport } = require('../controllers/reportController.js');

describe('BTSG-19: report controller', function () {
    let findStub;
    let req;
    let res;

    beforeEach(function () {
        req = {
            query: {},
            user: { id: 'test-user-123' },
        };

        res = {
            status: sinon.stub(),
            json: sinon.stub(),
            send: sinon.stub(),
            setHeader: sinon.stub(),
        };

        res.status.returns(res);
        res.json.returns(res);
        res.send.returns(res);
        res.setHeader.returns(res);

        findStub = sinon.stub(Bug, 'find');
    });

    afterEach(function () {
        sinon.restore();
    });

    const makeQuery = (bugs) => ({
        populate: sinon.stub().returnsThis(),
        sort: sinon.stub().returns(bugs),
    });

    it('returns HTTP 400 for an unsupported format', async function () {
        req.query.format = 'pdf';

        await generateReport(req, res);

        expect(res.status.calledWith(400)).to.equal(true);
        expect(res.json.calledOnce).to.equal(true);
        expect(findStub.called).to.equal(false);
    });

    it('sets CSV download headers and returns CSV content', async function () {
        req.query.format = 'csv';

        const bugs = [{
            _id: 'bug-1',
            title: 'Example bug',
            description: 'Example description',
            stepsToReproduce: 'Click Save',
            severity: 'Major',
            priority: 'High',
            status: 'Resolved',
            reporter: { name: 'Reporter' },
            assignee: { name: 'Assignee' },
        }];

        findStub.returns(makeQuery(bugs));

        await generateReport(req, res);

        expect(res.status.calledWith(200)).to.equal(true);
        expect(res.setHeader.calledWith(
            'Content-Type',
            'text/csv; charset=utf-8'
        )).to.equal(true);
        expect(res.setHeader.calledWith(
            'Content-Disposition',
            'attachment; filename="bugs-report.csv"'
        )).to.equal(true);
        expect(res.send.firstCall.args[0]).to.include('Example bug');
    });

    it('sets JSON download headers and returns valid JSON', async function () {
        req.query.format = 'json';

        const bugs = [{
            _id: 'bug-1',
            title: 'Example bug',
            description: 'Example description',
            stepsToReproduce: 'Click Save',
            severity: 'Major',
            priority: 'High',
            status: 'Resolved',
            reporter: { name: 'Reporter' },
            assignee: null,
        }];

        findStub.returns(makeQuery(bugs));

        await generateReport(req, res);

        expect(res.status.calledWith(200)).to.equal(true);
        expect(res.setHeader.calledWith(
            'Content-Type',
            'application/json; charset=utf-8'
        )).to.equal(true);
        expect(res.setHeader.calledWith(
            'Content-Disposition',
            'attachment; filename="bugs-report.json"'
        )).to.equal(true);

        const parsed = JSON.parse(res.send.firstCall.args[0]);
        expect(parsed).to.have.lengthOf(1);
        expect(parsed[0].title).to.equal('Example bug');
    });

    it('returns valid empty CSV and JSON reports', async function () {
        for (const format of ['csv', 'json']) {
            req.query.format = format;
            findStub.returns(makeQuery([]));

            await generateReport(req, res);

            expect(res.status.calledWith(200)).to.equal(true);

            const body = res.send.lastCall.args[0];

            if (format === 'csv') {
                expect(body.split('\r\n')).to.have.lengthOf(1);
                expect(body).to.include('title');
            } else {
                expect(JSON.parse(body)).to.deep.equal([]);
            }

            findStub.resetBehavior();
            res.status.resetHistory();
            res.send.resetHistory();
            res.setHeader.resetHistory();
        }
    });
});
