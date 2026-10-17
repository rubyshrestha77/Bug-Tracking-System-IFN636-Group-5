
import { expect } from 'chai';
import { createRequire } from 'node:module';
import { performance } from 'node:perf_hooks';

const require = createRequire(import.meta.url);

const CSVReportGenerator = require('../domain/reports/CSVReportGenerator.js');
const JSONReportGenerator = require('../domain/reports/JSONReportGenerator.js');

const createSampleBugs = () =>
    Array.from({ length: 500 }, (_, i) => ({
        _id: `bug-${i + 1}`,
        title: `Sample bug ${i + 1}`,
        description: `Description for sample bug ${i + 1}`,
        stepsToReproduce: 'Open the application, then click Save.',
        severity: 'Medium',
        priority: 'P2',
        status: 'Resolved',
        reporter: { name: 'Test Reporter' },
        assignee: { name: 'Test Assignee' },
        resolutionNote: 'Fixed',
        reopenReason: '',
        createdAt: new Date('2026-01-01T00:00:00Z'),
        updatedAt: new Date('2026-01-02T00:00:00Z'),
        resolvedAt: new Date('2026-01-02T00:00:00Z'),
        verifiedAt: null,
    }));

describe('BTSG-68: export performance', function () {
    this.timeout(5000);

    it('generates a valid CSV for 500 bugs in under 3 seconds', function () {
        const bugs = createSampleBugs();
        const generator = new CSVReportGenerator();

        const start = performance.now();
        const csv = generator.generateReport(bugs);
        const elapsedMs = performance.now() - start;

        expect(csv.split('\r\n')).to.have.lengthOf(501);
        expect(csv).to.include('title');
        expect(csv).to.include('Sample bug 500');

        console.log(`500-record CSV generation: ${elapsedMs.toFixed(2)} ms`);
        expect(elapsedMs).to.be.below(3000);
    });

    it('generates valid JSON for 500 bugs in under 3 seconds', function () {
        const bugs = createSampleBugs();
        const generator = new JSONReportGenerator();

        const start = performance.now();
        const json = generator.generateReport(bugs);
        const elapsedMs = performance.now() - start;

        const parsed = JSON.parse(json);

        expect(parsed).to.have.lengthOf(500);
        expect(parsed[0].title).to.equal('Sample bug 1');
        expect(parsed[499].title).to.equal('Sample bug 500');

        console.log(`500-record JSON generation: ${elapsedMs.toFixed(2)} ms`);
        expect(elapsedMs).to.be.below(3000);
    });
});
