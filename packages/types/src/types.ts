export interface IMatch {
    matchId: string;
    opponentId: string;
    questions: IQuestion[];
    startedAt: Date;
    duration: number;
  }
  
  export interface IQuestion {
    id: number;
    category: string;
    difficulty: string;
    question: string;
    testcases: any;
  }
  
  export interface ISubmission {
    userId: string;
    matchId: string;
    questionId: number;
    code: string;
  }
  
  export interface IMatchResult {
    matchId: string;
    winnerId: string;
    participants: Array<{
      userId: string;
      ratingChange: number;
    }>;
  }