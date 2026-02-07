# DSA Dash

A real-time competitive DSA (Data Structures & Algorithms) battle platform where users are matched against opponents to solve coding problems head-to-head.

## Tech Stack

- **Frontend**: Next.js, React, TypeScript, TailwindCSS
- **Backend**: Express, Socket.IO, Better Auth
- **Database**: PostgreSQL (Neon) + Prisma ORM
- **Queue/Cache**: Redis
- **Monorepo**: TurboRepo + pnpm workspaces

## Project Structure

```
DSADash/
├── apps/
│   ├── web/                        # Next.js frontend
│   ├── battle-engine/              # Express + Socket.IO backend
│   │   └── src/
│   │       ├── config/             # Configuration
│   │       │   ├── env.config.ts   # Zod-validated environment variables
│   │       │   ├── cors.config.ts  # CORS settings
│   │       │   └── socket.config.ts# Socket.IO config
│   │       ├── core/               # Core infrastructure
│   │       │   ├── socket/
│   │       │   │   ├── socket.manager.ts   # Socket.IO singleton manager
│   │       │   │   └── socket.types.ts     # Typed Socket.IO events
│   │       │   ├── database/
│   │       │   │   └── db.client.ts        # Prisma client wrapper
│   │       │   └── queue/
│   │       │       └── redis.client.ts     # Redis client wrapper
│   │       └── index.ts
│   └── worker/                     # Background job worker
├── packages/
│   ├── db/                         # Prisma schema + client
│   │   ├── prisma/
│   │   │   └── schema.prisma       # Database schema
│   │   └── src/
│   │       ├── index.ts            # Prisma client singleton
│   │       └── seed.ts             # Database seeder
│   ├── types/                      # Shared TypeScript types
│   ├── queue/                      # Queue management
│   ├── ui/                         # Shared UI components
│   ├── eslint-config/              # ESLint configuration
│   └── typescript-config/          # Shared tsconfig presets
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

## Database Schema

| Model              | Purpose                                    |
| ------------------- | ------------------------------------------ |
| `User`              | Auth, profile, ELO rating (default 1200)   |
| `Account`           | OAuth provider accounts (Google, GitHub)    |
| `Session`           | Token-based session management             |
| `Verification`      | Email/token verification                   |
| `Question`          | DSA problems with category + test cases    |
| `Match`             | Competitive match (WAITING/RUNNING/FINISHED) |
| `MatchParticipant`  | Links users to matches + rating changes    |
| `MatchQuestion`     | Ordered questions assigned to a match      |
| `Submission`        | User code submissions per match            |
| `FriendRequest`     | Friend request system (PENDING/ACCEPTED/REJECTED) |
| `Friend`            | Established friendships                    |
| `Message`           | Direct messages between users              |
| `Feedback`          | User feedback                              |
| `LeaderboardEntry`  | Rankings, wins/losses, streaks             |

## Socket Events

### Client to Server

| Event                | Payload                                     |
| -------------------- | ------------------------------------------- |
| `match:join-queue`   | `{ userId }`                                |
| `match:leave-queue`  | `{ userId }`                                |
| `match:submit-code`  | `{ matchId, questionId, code, language }`   |
| `match:ready`        | `{ matchId, userId }`                       |
| `chat:send-message`  | `{ receiverId, content }`                   |

### Server to Client

| Event                     | Payload                                          |
| ------------------------- | ------------------------------------------------ |
| `match:found`             | `{ matchId, opponent, questions }`               |
| `match:started`           | `{ matchId, startedAt }`                         |
| `match:submission-result` | `{ questionId, status, testsPassed, totalTests }` |
| `match:opponent-progress` | `{ questionId, solved }`                         |
| `match:timer-update`      | `{ matchId, remainingSeconds }`                  |
| `match:ended`             | `{ matchId, winnerId, ratingChanges }`           |

## Getting Started

### Prerequisites

- Node.js >= 18
- pnpm >= 9
- PostgreSQL (or Neon account)
- Redis

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/DSADash.git
cd DSADash

# Install dependencies
pnpm install
```

### Environment Variables

Create a `.env` file in `packages/db/`:

```env
DATABASE_URL="postgresql://user:password@host:port/database?sslmode=require"
```

Create a `.env` file in `apps/battle-engine/` (or root):

```env
NODE_ENV=development
SERVER_PORT=4000
DATABASE_URL=postgresql://user:password@host:port/database?sslmode=require
REDIS_URL=redis://localhost:6379
BETTER_AUTH_SECRET=your-secret-key
BETTER_AUTH_URL=http://localhost:4000
CLIENT_URL=http://localhost:3000
MATCH_DURATION_MINUTES=15
MATCH_QUESTIONS_COUNT=5
```

### Database Setup

```bash
cd packages/db

# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate dev

# (Optional) Seed the database
pnpm db:seed

# (Optional) Open Prisma Studio
npx prisma studio
```

### Development

```bash
# Run all apps
pnpm dev

# Run specific app
pnpm dev --filter=web
pnpm dev --filter=battle-engine
```

### Build

```bash
# Build all apps and packages
pnpm build

# Build a specific app
pnpm build --filter=web
```

## Scripts

| Command            | Description                        |
| ------------------ | ---------------------------------- |
| `pnpm dev`         | Start all apps in development mode |
| `pnpm build`       | Build all apps and packages        |
| `pnpm lint`        | Lint all packages                  |
| `pnpm format`      | Format code with Prettier          |
| `pnpm check-types` | Run TypeScript type checking       |

### Database Scripts (in `packages/db`)

| Command             | Description                      |
| ------------------- | -------------------------------- |
| `pnpm db:generate`  | Generate Prisma Client           |
| `pnpm db:push`      | Push schema to database (dev)    |
| `pnpm db:migrate`   | Run database migrations          |
| `pnpm db:studio`    | Open Prisma Studio GUI           |
| `pnpm db:seed`      | Seed database with sample data   |

## License

MIT
