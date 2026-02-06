import prisma from "./index";
import { MatchStatus } from "@prisma/client";

const questions = [
  {
    category: "Arrays",
    difficulty: "Easy",
    question: "Two Sum",
    testcases: [
      { input: { nums: [2, 7, 11, 15], target: 9 }, expected: [0, 1] },
      { input: { nums: [3, 2, 4], target: 6 }, expected: [1, 2] },
    ],
  },
  {
    category: "Arrays",
    difficulty: "Medium",
    question: "3Sum",
    testcases: [
      { input: { nums: [-1, 0, 1, 2, -1, -4] }, expected: [[-1, -1, 2], [-1, 0, 1]] },
      { input: { nums: [0, 1, 1] }, expected: [] },
    ],
  },
  {
    category: "Strings",
    difficulty: "Easy",
    question: "Valid Parentheses",
    testcases: [
      { input: { s: "()" }, expected: true },
      { input: { s: "()[]{}" }, expected: true },
      { input: { s: "(]" }, expected: false },
    ],
  },
  {
    category: "Linked Lists",
    difficulty: "Easy",
    question: "Reverse Linked List",
    testcases: [
      { input: { head: [1, 2, 3, 4, 5] }, expected: [5, 4, 3, 2, 1] },
      { input: { head: [1, 2] }, expected: [2, 1] },
    ],
  },
  {
    category: "Trees",
    difficulty: "Easy",
    question: "Invert Binary Tree",
    testcases: [
      { input: { root: [4, 2, 7, 1, 3, 6, 9] }, expected: [4, 7, 2, 9, 6, 3, 1] },
    ],
  },
  {
    category: "Dynamic Programming",
    difficulty: "Medium",
    question: "Longest Increasing Subsequence",
    testcases: [
      { input: { nums: [10, 9, 2, 5, 3, 7, 101, 18] }, expected: 4 },
      { input: { nums: [0, 1, 0, 3, 2, 3] }, expected: 4 },
    ],
  },
  {
    category: "Graphs",
    difficulty: "Medium",
    question: "Number of Islands",
    testcases: [
      {
        input: {
          grid: [
            ["1", "1", "0", "0", "0"],
            ["1", "1", "0", "0", "0"],
            ["0", "0", "1", "0", "0"],
            ["0", "0", "0", "1", "1"],
          ],
        },
        expected: 3,
      },
    ],
  },
  {
    category: "Sorting",
    difficulty: "Medium",
    question: "Merge Intervals",
    testcases: [
      { input: { intervals: [[1, 3], [2, 6], [8, 10], [15, 18]] }, expected: [[1, 6], [8, 10], [15, 18]] },
    ],
  },
  {
    category: "Stacks",
    difficulty: "Hard",
    question: "Largest Rectangle in Histogram",
    testcases: [
      { input: { heights: [2, 1, 5, 6, 2, 3] }, expected: 10 },
      { input: { heights: [2, 4] }, expected: 4 },
    ],
  },
  {
    category: "Dynamic Programming",
    difficulty: "Hard",
    question: "Edit Distance",
    testcases: [
      { input: { word1: "horse", word2: "ros" }, expected: 3 },
      { input: { word1: "intention", word2: "execution" }, expected: 5 },
    ],
  },
];

const seedDatabase = async () => {
  try {
    console.log("🌱 Starting database seed...");

    // Clear existing data in order (respect foreign keys)
    await prisma.submission.deleteMany();
    await prisma.matchQuestion.deleteMany();
    await prisma.matchParticipant.deleteMany();
    await prisma.match.deleteMany();
    await prisma.leaderboardEntry.deleteMany();
    await prisma.session.deleteMany();
    await prisma.account.deleteMany();
    await prisma.question.deleteMany();
    await prisma.user.deleteMany();

    console.log("✅ Cleared existing data");

    // Seed questions
    const createdQuestions = await Promise.all(
      questions.map((q) =>
        prisma.question.create({ data: q })
      )
    );
    console.log(`✅ Created ${createdQuestions.length} questions`);

    // Create demo users
    const user1 = await prisma.user.create({
      data: {
        name: "Alice",
        email: "alice@example.com",
        rating: 1350,
      },
    });

    const user2 = await prisma.user.create({
      data: {
        name: "Bob",
        email: "bob@example.com",
        rating: 1250,
      },
    });

    console.log("✅ Created 2 demo users");

    // Create leaderboard entries
    await prisma.leaderboardEntry.createMany({
      data: [
        { userId: user1.id, rank: 1, rating: 1350, wins: 5, losses: 2, totalMatches: 7, winStreak: 3 },
        { userId: user2.id, rank: 2, rating: 1250, wins: 3, losses: 4, totalMatches: 7, winStreak: 0 },
      ],
    });
    console.log("✅ Created leaderboard entries");

    // Create a sample match
    const match = await prisma.match.create({
      data: {
        status: MatchStatus.FINISHED,
        winnerId: user1.id,
        startedAt: new Date(Date.now() - 30 * 60 * 1000), // 30 min ago
        endedAt: new Date(),
      },
    });

    // Add participants
    await prisma.matchParticipant.createMany({
      data: [
        { matchId: match.id, userId: user1.id, ratingChange: 25 },
        { matchId: match.id, userId: user2.id, ratingChange: -25 },
      ],
    });

    // Add questions to match
    await prisma.matchQuestion.createMany({
      data: createdQuestions.slice(0, 3).map((q, i) => ({
        matchId: match.id,
        questionId: q.id,
        order: i + 1,
      })),
    });

    // Add submissions
    await prisma.submission.createMany({
      data: [
        {
          userId: user1.id,
          questionId: createdQuestions[0]!.id,
          matchId: match.id,
          code: "function twoSum(nums, target) { /* solution */ }",
          status: "ACCEPTED",
        },
        {
          userId: user2.id,
          questionId: createdQuestions[0]!.id,
          matchId: match.id,
          code: "function twoSum(nums, target) { /* attempt */ }",
          status: "WRONG_ANSWER",
        },
      ],
    });

    console.log("✅ Created sample match with submissions");
    console.log("🎉 Database seeded successfully!");
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
};

seedDatabase();
