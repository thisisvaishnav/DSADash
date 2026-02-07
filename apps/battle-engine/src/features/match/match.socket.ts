import { TypedSocket } from '../../core/socket/socket.types';
import { emitToUser } from '../../core/socket/socket.manager';
import {
  joinQueueSchema,
  leaveQueueSchema,
  submitCodeSchema,
  readySchema,
} from './match.validator';
import {
  addToQueue,
  removeFromQueue,
  findMatch,
  removePairFromQueue,
  isInQueue,
  getQueuePosition,
} from './matchmaker.service';
import {
  createMatch,
  markPlayerReady,
  recordSubmission,
  getActiveMatchByUser,
} from './match.service';

// ─── Register Match Socket Handlers ─────────────────────────────────
// Call this inside io.on('connection', ...) for each connected socket
export const registerMatchHandlers = (socket: TypedSocket): void => {
  const { userId, userName, userRating } = socket.data;

  // ── Join Matchmaking Queue ─────────────────────────────────────────
  socket.on('match:join-queue', async (data) => {
    try {
      const parsed = joinQueueSchema.safeParse(data);
      if (!parsed.success) {
        socket.emit('error', { message: 'Invalid join-queue payload', code: 'VALIDATION_ERROR' });
        return;
      }

      // Prevent joining queue if already in a match
      const existingMatch = getActiveMatchByUser(userId);
      if (existingMatch) {
        socket.emit('error', { message: 'Already in an active match', code: 'ALREADY_IN_MATCH' });
        return;
      }

      // Prevent double-queueing
      const alreadyInQueue = await isInQueue(userId);
      if (alreadyInQueue) {
        socket.emit('error', { message: 'Already in queue', code: 'ALREADY_IN_QUEUE' });
        return;
      }

      // Add to queue
      await addToQueue({
        userId,
        userName,
        rating: userRating,
        joinedAt: Date.now(),
      });

      console.log(`🔍 ${userName} joined matchmaking queue`);

      // Send initial queue position
      const position = await getQueuePosition(userId);
      emitToUser(userId, 'match:queue-status', { position, estimatedWait: 30 });

      // Try to find an immediate match
      const opponent = await findMatch(userId);
      if (opponent) {
        // Remove both from queue
        await removePairFromQueue(userId, opponent.userId);

        // Create the match
        await createMatch(
          { userId, userName, rating: userRating },
          { userId: opponent.userId, userName: opponent.userName, rating: opponent.rating },
        );

        console.log(`⚔️ Match created: ${userName} vs ${opponent.userName}`);
      }
    } catch (err) {
      console.error('Error in match:join-queue:', err);
      socket.emit('error', { message: 'Failed to join queue', code: 'INTERNAL_ERROR' });
    }
  });

  // ── Leave Matchmaking Queue ────────────────────────────────────────
  socket.on('match:leave-queue', async (data) => {
    try {
      const parsed = leaveQueueSchema.safeParse(data);
      if (!parsed.success) {
        socket.emit('error', { message: 'Invalid leave-queue payload', code: 'VALIDATION_ERROR' });
        return;
      }

      await removeFromQueue(userId);
      console.log(`🚪 ${userName} left matchmaking queue`);
    } catch (err) {
      console.error('Error in match:leave-queue:', err);
      socket.emit('error', { message: 'Failed to leave queue', code: 'INTERNAL_ERROR' });
    }
  });

  // ── Player Ready ──────────────────────────────────────────────────
  socket.on('match:ready', async (data) => {
    try {
      const parsed = readySchema.safeParse(data);
      if (!parsed.success) {
        socket.emit('error', { message: 'Invalid ready payload', code: 'VALIDATION_ERROR' });
        return;
      }

      const success = markPlayerReady(parsed.data.matchId, userId);
      if (!success) {
        socket.emit('error', { message: 'Cannot mark ready', code: 'INVALID_STATE' });
      }
    } catch (err) {
      console.error('Error in match:ready:', err);
      socket.emit('error', { message: 'Failed to mark ready', code: 'INTERNAL_ERROR' });
    }
  });

  // ── Submit Code ───────────────────────────────────────────────────
  socket.on('match:submit-code', async (data) => {
    try {
      const parsed = submitCodeSchema.safeParse(data);
      if (!parsed.success) {
        socket.emit('error', { message: 'Invalid submission payload', code: 'VALIDATION_ERROR' });
        return;
      }

      const { matchId, questionId, code, language } = parsed.data;
      await recordSubmission(matchId, userId, questionId, code, language);
    } catch (err) {
      console.error('Error in match:submit-code:', err);
      socket.emit('error', { message: 'Failed to submit code', code: 'INTERNAL_ERROR' });
    }
  });

  // ── Cleanup on Disconnect ─────────────────────────────────────────
  socket.on('disconnect', async () => {
    // Remove from queue if still queued
    const inQueue = await isInQueue(userId).catch(() => false);
    if (inQueue) {
      await removeFromQueue(userId).catch(() => {});
      console.log(`🚪 ${userName} removed from queue (disconnected)`);
    }
  });
};
