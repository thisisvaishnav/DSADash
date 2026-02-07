import { Router } from 'express';
import { requireAuth } from '../auth/auth.controller';
import { handleGetConversation, handleSendMessage } from './chat.controller';

const chatRouter = Router();

chatRouter.get('/api/chat/:userId', requireAuth, handleGetConversation);
chatRouter.post('/api/chat/:userId', requireAuth, handleSendMessage);

export { chatRouter };
