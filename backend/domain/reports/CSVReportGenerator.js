
const ReportGenerator = require('./ReportGenerator');

class CSVReportGenerator extends ReportGenerator {
    generateReport(bugs) {
        if (!Array.isArray(bugs)) {
            throw new TypeError('Bugs must be an array');
        }

        const columns = [
            'id',
            'title',
            'description',
            'stepsToReproduce',
            'severity',
            'priority',
            'status',
            'reporter',
            'assignee',
            'resolutionNote',
            'reopenReason',
            'createdAt',
            'updatedAt',
            'resolvedAt',
            'verifiedAt'
        ];

        const escapeCSV = (value) => {
            if (value === null || value === undefined) {
                return '';
            }

            const text = String(value);

            if (/[",\r\n]/.test(text)) {
                return `"${text.replace(/"/g, '""')}"`;
            }

            return text;
        };

        const getUserName = (user) => {
            if (!user) return '';

            if (typeof user === 'object') {
                return user.name || user._id?.toString() || '';
            }

            return user.toString();
        };

        const getValue = (bug, column) => {
            switch (column) {
                case 'id':
                    return bug._id?.toString() || bug.id || '';
                case 'reporter':
                case 'assignee':
                    return getUserName(bug[column]);
                case 'createdAt':
                case 'updatedAt':
                case 'resolvedAt':
                case 'verifiedAt':
                    return bug[column]
                        ? new Date(bug[column]).toISOString()
                        : '';
                default:
                    return bug[column] ?? '';
            }
        };

        const header = columns.join(',');

        const rows = bugs.map((bug) =>
            columns
                .map((column) => escapeCSV(getValue(bug, column)))
                .join(',')
        );

        return [header, ...rows].join('\r\n');
    }
}

module.exports = CSVReportGenerator;
