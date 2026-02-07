import { z } from 'zod';
import { TypedSocket } from '../../core/socket/socket.types';
import { emitToUser } from '../../core/socket/socket.manager';
import { sendMessage } from './chat.service';

const sendMessageSchema = z.object({
  receiverId: z.string().min(1, 'receiverId is required'),
  content: z.string().min(1, 'content is required'),
});

const typingSchema = z.object({
  receiverId: z.string().min(1, 'receiverId is required'),
});

export const registerChatHandlers = (socket: TypedSocket): void => {
  const { userId } = socket.data;

  socket.on('chat:send-message', async (data) => {
    try {
      const parsed = sendMessageSchema.safeParse(data);
      if (!parsed.success) {
        socket.emit('error', { message: 'Invalid message payload', code: 'VALIDATION_ERROR' });
        return;
      }

      const message = await sendMessage(userId, parsed.data.receiverId, parsed.data.content);
      emitToUser(parsed.data.receiverId, 'chat:new-message', {
        id: message.id,
        senderId: message.senderId,
        content: message.content,
        createdAt: message.createdAt,
      });
      emitToUser(userId, 'chat:new-message', {
        id: message.id,
        senderId: message.senderId,
        content: message.content,
        createdAt: message.createdAt,
      });
    } catch (err) {
      console.error('Error in chat:send-message:', err);
      socket.emit('error', { message: 'Failed to send message', code: 'INTERNAL_ERROR' });
    }
  });

  socket.on('chat:typing', (data) => {
    const parsed = typingSchema.safeParse(data);
    if (!parsed.success) {
      socket.emit('error', { message: 'Invalid typing payload', code: 'VALIDATION_ERROR' });
      return;
    }
    emitToUser(parsed.data.receiverId, 'chat:user-typing', { userId });
  });

  socket.on('chat:stop-typing', (data) => {
    const parsed = typingSchema.safeParse(data);
    if (!parsed.success) {
      socket.emit('error', { message: 'Invalid stop-typing payload', code: 'VALIDATION_ERROR' });
      return;
    }
    emitToUser(parsed.data.receiverId, 'chat:user-stop-typing', { userId });
  });
};
