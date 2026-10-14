
const ReportGenerator = require('./ReportGenerator');

class JSONReportGenerator extends ReportGenerator {
    generateReport(bugs) {
        if (!Array.isArray(bugs)) {
            throw new TypeError('Bugs must be an array');
        }

        const reportData = bugs.map((bug) => {
            const record =
                typeof bug.toObject === 'function'
                    ? bug.toObject()
                    : bug;

            return {
                id: record._id?.toString() || record.id || '',
                title: record.title,
                description: record.description,
                stepsToReproduce: record.stepsToReproduce,
                severity: record.severity,
                priority: record.priority,
                status: record.status,
                reporter: record.reporter ?? null,
                assignee: record.assignee ?? null,
                resolutionNote: record.resolutionNote ?? null,
                reopenReason: record.reopenReason ?? null,
                createdAt: record.createdAt ?? null,
                updatedAt: record.updatedAt ?? null,
                resolvedAt: record.resolvedAt ?? null,
                verifiedAt: record.verifiedAt ?? null
            };
        });

        return JSON.stringify(reportData, null, 2);
    }
}

module.exports = JSONReportGenerator;
