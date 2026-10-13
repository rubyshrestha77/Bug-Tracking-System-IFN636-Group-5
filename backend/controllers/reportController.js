
const Bug = require('../models/Bug');
const ReportGeneratorFactory = require('../domain/reports/ReportGeneratorFactory');

const generateReport = async (req, res) => {
    try {
        const { format } = req.query;

        if (
            typeof format !== 'string' ||
            !['csv', 'json'].includes(format.toLowerCase())
        ) {
            return res.status(400).json({
                message: 'Invalid report format. Use csv or json.'
            });
        }

        const bugs = await Bug.find({})
            .populate('reporter', 'name')
            .populate('assignee', 'name')
            .sort({ createdAt: -1 });

        const generator =
            ReportGeneratorFactory.createGenerator(format);

        const report = generator.generateReport(bugs);

        if (format.toLowerCase() === 'csv') {
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader(
                'Content-Disposition',
                'attachment; filename="bugs-report.csv"'
            );
        } else {
            res.setHeader(
                'Content-Type',
                'application/json; charset=utf-8'
            );
            res.setHeader(
                'Content-Disposition',
                'attachment; filename="bugs-report.json"'
            );
        }

        return res.status(200).send(report);
    } catch (error) {
        console.error('Report generation failed:', error);

        return res.status(500).json({
            message: 'Failed to generate report'
        });
    }
};

module.exports = { generateReport };
