export interface TestSummary {
  startTime: Date;
  duration: number;

  /** Total number of tests. */
  tests: number;
  passed: number;
  failed: number;
  skipped: number;
}
