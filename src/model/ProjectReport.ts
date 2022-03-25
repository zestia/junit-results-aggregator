import { TestSummary } from './TestSummary';

export interface ProjectReport {
  name: string;

  summary: TestSummary;
  suites: TestSummary[];
}
