export type SubmissionStatus = 'pending' | 'passed' | 'failed' | 'error';

export type CreateSubmissionInput = {
  matchId: string;
  questionId: number;
  code: string;
  language: string;
};

export type SubmissionResultInput = {
  matchId: string;
  userId: string;
  questionId: number;
  testsPassed: number;
  totalTests: number;
  status?: SubmissionStatus;
};

export type SubmissionListItem = {
  id: string;
  questionId: number;
  status: SubmissionStatus;
  createdAt: string;
};
