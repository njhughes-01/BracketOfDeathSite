import { sanitizeString, parseYearFilter } from '../../utils/sanitization';

describe('Sanitization Utils', () => {
    describe('sanitizeString', () => {
        it('escapes html tags', () => {
            expect(sanitizeString('<script>alert(1)</script>hello')).toBe('&lt;script&gt;alert(1)&lt;/script&gt;hello');
        });

        it('trims whitespace', () => {
            expect(sanitizeString('  hello  ')).toBe('hello');
        });
    });

    describe('parseYearFilter', () => {
        it('parses single year', () => {
            const result = parseYearFilter('2025');
            expect(result.years).toEqual([2025]);
            expect(result.ranges).toEqual([]);
        });

        it('parses comma separated years', () => {
            const result = parseYearFilter('2023, 2025');
            expect(result.years).toEqual([2023, 2025]);
        });

        it('explodes small ranges into years', () => {
            const result = parseYearFilter('2020-2022');
            expect(result.years).toEqual([2020, 2021, 2022]);
            expect(result.ranges).toEqual([]);
        });

        it('keeps large ranges as ranges', () => {
            // Logic in util says <= 5 explodes. 2010-2020 is 11 years -> range
            const result = parseYearFilter('2010-2020');
            expect(result.years).toEqual([]);
            expect(result.ranges).toEqual([{ start: 2010, end: 2020 }]);
        });

        it('handles mixed content', () => {
            const result = parseYearFilter('2025, 2010-2012');
            expect(result.years).toEqual([2010, 2011, 2012, 2025]);
        });

        it('ignores invalid years', () => {
            const result = parseYearFilter('1999, 2200, abc');
            expect(result.years).toEqual([]);
        });
    });
});
