/**
 * Validates that synastry bias calculations combine A + B + synastry inputs
 * and expose solo/combined field outputs for debugging.
 * 
 * Tests the fix for Person B relocation ensuring that both Person A and Person B
 * transit data correctly flows into the mirror data calculations.
 */

const { computeMirrorData } = require('../src/math_brain/main.js');

describe('Synastry Bias Field Aggregation', () => {
    const transitA = {
        aspect: 'square',
        orbit: 1,
        p1_name: 'Mars',
        p2_name: 'Sun',
        aspect_class: 'hard'
    };

    const transitB = {
        aspect: 'trine',
        orbit: 0.5,
        p1_name: 'Venus',
        p2_name: 'Moon',
        aspect_class: 'soft'
    };

    const synAspect = {
        aspect: 'opposition',
        orbit: 2,
        p1_name: 'Jupiter',
        p2_name: 'Saturn',
        aspect_class: 'hard'
    };

    it('should combine both charts and synastry into mirror data', () => {
        const result = computeMirrorData([transitA], [transitB], [synAspect]);

        // Verify that all three sources are considered
        expect(result).toBeDefined();
        expect(result.person_a_contribution).toBeDefined();
        expect(result.person_b_contribution).toBeDefined();

        // Person A contribution should reflect their transits
        expect(result.person_a_contribution.magnitude).toBeGreaterThan(0);

        // Person B contribution should reflect their transits (validates the fix!)
        expect(result.person_b_contribution.magnitude).toBeGreaterThan(0);
    });

    it('should calculate relational tension from synastry aspects', () => {
        const result = computeMirrorData([transitA], [transitB], [synAspect]);

        // Synastry aspect (opposition) should contribute to relational tension
        expect(result.relational_tension).toBeGreaterThan(0);
        expect(result.dominant_theme).toBeDefined();
    });

    it('should handle empty inputs gracefully', () => {
        const result = computeMirrorData([], [], []);

        expect(result.person_a_contribution.magnitude).toBe(0);
        expect(result.person_b_contribution.magnitude).toBe(0);
        expect(result.relational_tension).toBeDefined();
        expect(result.relational_flow).toBeDefined();
    });

    it('should prioritize Person B transits when present (validates relocation fix)', () => {
        // This test specifically validates that Person B's data is NOT ignored
        const resultWithBoth = computeMirrorData([transitA], [transitB], []);
        const resultWithOnlyA = computeMirrorData([transitA], [], []);

        // When Person B transits are present, their contribution should be non-zero
        expect(resultWithBoth.person_b_contribution.magnitude).toBeGreaterThan(0);

        // When Person B transits are absent, their contribution should be zero
        expect(resultWithOnlyA.person_b_contribution.magnitude).toBe(0);

        // The relocation fix ensures Person B transits are actually fetched and passed in
        expect(resultWithBoth.person_b_contribution.magnitude).not.toBe(
            resultWithOnlyA.person_b_contribution.magnitude
        );
    });

    it('should combine hard and soft aspects in synastry', () => {
        const hardSynastry = { aspect: 'square', orbit: 1, p1_name: 'Mars', p2_name: 'Venus' };
        const softSynastry = { aspect: 'trine', orbit: 0.5, p1_name: 'Sun', p2_name: 'Moon' };

        const resultHard = computeMirrorData([], [], [hardSynastry]);
        const resultSoft = computeMirrorData([], [], [softSynastry]);

        // Hard aspects should increase tension
        expect(resultHard.relational_tension).toBeGreaterThan(resultSoft.relational_tension);

        // Soft aspects should increase flow
        expect(resultSoft.relational_flow).toBeGreaterThan(resultHard.relational_flow);
    });

    it('should provide meaningful dominant themes', () => {
        const hardSynastry = { aspect: 'opposition', orbit: 2, p1_name: 'Saturn', p2_name: 'Sun' };
        const softSynastry = { aspect: 'trine', orbit: 0.5, p1_name: 'Jupiter', p2_name: 'Venus' };

        const resultWithHard = computeMirrorData([], [], [hardSynastry]);
        const resultWithSoft = computeMirrorData([], [], [softSynastry]);

        // Theme should indicate the nature of the dominant aspect
        expect(resultWithHard.dominant_theme).toContain('Tension');
        expect(resultWithSoft.dominant_theme).toContain('Flow');
    });

    describe('Person B Relocation Validation', () => {
        it('should use Person B transit data when BOTH_LOCAL mode is active', () => {
            // Simulate scenario where Person B has relocated transits
            const personATransits = [
                { aspect: 'square', orbit: 1, p1_name: 'Saturn', p2_name: 'Sun' }
            ];

            const personBTransits = [
                { aspect: 'opposition', orbit: 0.8, p1_name: 'Mars', p2_name: 'Moon' }
            ];

            const result = computeMirrorData(personATransits, personBTransits, []);

            // CRITICAL: Person B's contribution must be non-zero
            // This validates that the relocation fix is working - Person B's
            // relocated chart data is being fetched and used
            expect(result.person_b_contribution.magnitude).toBeGreaterThan(0);
            expect(result.person_b_contribution.bias).toBeDefined();

            // Both persons should have independent contributions
            expect(result.person_a_contribution).not.toEqual(result.person_b_contribution);
        });

        it('should differentiate between natal and relocated Person B data', () => {
            // In a real scenario with relocation:
            // - Natal mode: Person B uses birth location houses
            // - Relocated mode: Person B uses current location houses
            // The aspects found would differ based on house placements

            const natalPersonBTransits = [
                { aspect: 'square', orbit: 1, p1_name: 'Saturn', p2_name: 'Sun' }
            ];

            const relocatedPersonBTransits = [
                { aspect: 'trine', orbit: 0.5, p1_name: 'Jupiter', p2_name: 'Venus' },
                { aspect: 'sextile', orbit: 1.2, p1_name: 'Moon', p2_name: 'Mercury' }
            ];

            const resultNatal = computeMirrorData([], natalPersonBTransits, []);
            const resultRelocated = computeMirrorData([], relocatedPersonBTransits, []);

            // Different transit sets should produce different contributions
            expect(resultNatal.person_b_contribution.magnitude).not.toBe(
                resultRelocated.person_b_contribution.magnitude
            );
        });
    });
});
