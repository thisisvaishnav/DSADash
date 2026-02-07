import { Router } from 'express';
import { requireAuth } from '../auth/auth.controller';
import {
  handleAcceptFriendRequest,
  handleCreateFriendRequest,
  handleGetFriendRequests,
  handleGetFriends,
  handleRejectFriendRequest,
} from './friend.controller';

const friendRouter = Router();

friendRouter.get('/api/friends', requireAuth, handleGetFriends);
friendRouter.get('/api/friends/requests', requireAuth, handleGetFriendRequests);
friendRouter.post('/api/friends/request', requireAuth, handleCreateFriendRequest);
friendRouter.post('/api/friends/accept', requireAuth, handleAcceptFriendRequest);
friendRouter.post('/api/friends/reject', requireAuth, handleRejectFriendRequest);

export { friendRouter };
