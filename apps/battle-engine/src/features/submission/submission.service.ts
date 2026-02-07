import { db } from '../../core/database/db.client';
import { markQuestionSolved } from '../match/match.service';
import type {
  CreateSubmissionInput,
  SubmissionListItem,
  SubmissionResultInput,
  SubmissionStatus,
} from './submission.types';

const resolveStatus = (
  testsPassed: number,
  totalTests: number,
  status?: SubmissionStatus,
): SubmissionStatus => {
  if (status) return status;
  if (totalTests <= 0) return 'error';
  return testsPassed === totalTests ? 'passed' : 'failed';
};

export const createSubmission = async (
  userId: string,
  input: CreateSubmissionInput,
) => {
  return db.submission.create({
    data: {
      userId,
      questionId: input.questionId,
      matchId: input.matchId,
      code: input.code,
      status: 'pending',
    },
  });
};

export const getUserSubmissions = async (
  userId: string,
  page: number,
  limit: number,
): Promise<SubmissionListItem[]> => {
  const skip = (page - 1) * limit;
  const submissions = await db.submission.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    skip,
    take: limit,
    select: { id: true, questionId: true, status: true, createdAt: true },
  });

  return submissions.map((submission) => ({
    id: submission.id,
    questionId: submission.questionId,
    status: submission.status as SubmissionStatus,
    createdAt: submission.createdAt.toISOString(),
  }));
};

export const getMatchSubmissions = async (
  matchId: string,
): Promise<SubmissionListItem[]> => {
  const submissions = await db.submission.findMany({
    where: { matchId },
    orderBy: { createdAt: 'desc' },
    select: { id: true, questionId: true, status: true, createdAt: true },
  });

  return submissions.map((submission) => ({
    id: submission.id,
    questionId: submission.questionId,
    status: submission.status as SubmissionStatus,
    createdAt: submission.createdAt.toISOString(),
  }));
};

export const applySubmissionResult = async (input: SubmissionResultInput) => {
  const status = resolveStatus(input.testsPassed, input.totalTests, input.status);

  const submission = await db.submission.findFirst({
    where: {
      userId: input.userId,
      matchId: input.matchId,
      questionId: input.questionId,
      status: 'pending',
    },
    orderBy: { createdAt: 'desc' },
    select: { id: true },
  });

  if (!submission) return null;

  await db.submission.update({
    where: { id: submission.id },
    data: { status },
  });

  markQuestionSolved(
    input.matchId,
    input.userId,
    input.questionId,
    input.testsPassed,
    input.totalTests,
  );

  return { submissionId: submission.id, status };
};
