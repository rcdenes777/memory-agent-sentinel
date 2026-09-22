import { extractIntTag, extractIntOrUnknownTag, extractStringTag, extractYesNoTag, scanForForbiddenTerms } from '../runner/grading';

describe('grading — exact-phrase protocol extraction', () => {
  it('extracts a string tag', () => {
    expect(extractStringTag('some text\nDECISION_X: console logging blocks the loop\nmore text', 'DECISION_X')).toBe(
      'console logging blocks the loop'
    );
  });

  it('returns MISSING for an absent tag rather than guessing', () => {
    expect(extractStringTag('no tags here', 'DECISION_X')).toBe('MISSING');
  });

  it('extracts an integer tag with surrounding words', () => {
    expect(extractIntTag('ROTATION_SIZE_MB: 8 megabytes, per staging headroom', 'ROTATION_SIZE_MB')).toBe(8);
  });

  it('treats a literal UNKNOWN as MISSING for extractIntOrUnknownTag, not 0', () => {
    expect(extractIntOrUnknownTag('ROTATION_SIZE_MB: UNKNOWN', 'ROTATION_SIZE_MB')).toBe('MISSING');
  });

  it('parses YES/NO case-insensitively', () => {
    expect(extractYesNoTag('STALE_CONFIRMED: YES', 'STALE_CONFIRMED')).toBe(true);
    expect(extractYesNoTag('STALE_CONFIRMED: no', 'STALE_CONFIRMED')).toBe(false);
  });

  it('treats an unparsable YES/NO value as MISSING, never as a default', () => {
    expect(extractYesNoTag('STALE_CONFIRMED: maybe', 'STALE_CONFIRMED')).toBe('MISSING');
  });

  it('detects forbidden cross-fixture terms', () => {
    const result = scanForForbiddenTerms('This project uses file-based logging with rotation.', ['file-based logging', 'ISSUE-042']);
    expect(result.leaked).toBe(true);
    expect(result.matchedTerms).toContain('file-based logging');
  });

  it('reports no leak when no forbidden terms are present', () => {
    const result = scanForForbiddenTerms('This project has a connection pool issue.', ['file-based logging', 'ISSUE-042']);
    expect(result.leaked).toBe(false);
  });
});
