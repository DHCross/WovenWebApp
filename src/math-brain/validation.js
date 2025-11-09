const { validateSubjectLean } = require('../../lib/server/astrology-mathbrain');

/**
 * Validates a subject object for all required fields for lean validation.
 * @param {Object} subject - The subject data to validate.
 * @returns {{isValid: boolean, message: string}}
 */
function validateSubject(subject) {
    return validateSubjectLean(subject);
}

module.exports = {
    validateSubject,
};
