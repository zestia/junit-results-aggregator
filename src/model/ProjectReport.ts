import { TestSummary } from './TestSummary.js';

export interface ProjectReport {
  name: string;

  summary: TestSummary;
  suites: TestSummary[];
}
