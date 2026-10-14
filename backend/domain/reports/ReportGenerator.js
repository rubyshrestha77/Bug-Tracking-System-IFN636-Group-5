
class ReportGenerator {
    constructor() {
        if (new.target === ReportGenerator) {
            throw new Error(
                'ReportGenerator is an abstract class and cannot be instantiated directly'
            );
        }
    }

    generateReport(bugs) {
        throw new Error(
            'generateReport() must be implemented by a subclass'
        );
    }
}

module.exports = ReportGenerator;
