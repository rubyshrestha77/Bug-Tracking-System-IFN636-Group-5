
const CSVReportGenerator = require('./CSVReportGenerator');
const JSONReportGenerator = require('./JSONReportGenerator');

class ReportGeneratorFactory {
    static createGenerator(format) {
        if (typeof format !== 'string' || !format.trim()) {
            throw new Error(
                'Report format is required. Supported formats: csv, json'
            );
        }

        switch (format.trim().toLowerCase()) {
            case 'csv':
                return new CSVReportGenerator();

            case 'json':
                return new JSONReportGenerator();

            default:
                throw new Error(
                    `Unsupported report format: ${format}. Supported formats: csv, json`
                );
        }
    }
}

module.exports = ReportGeneratorFactory;
