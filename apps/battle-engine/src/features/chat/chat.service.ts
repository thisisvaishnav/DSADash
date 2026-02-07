import { db } from '../../core/database/db.client';
import type { ChatMessageItem } from './chat.types';

const mapMessage = (message: {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  createdAt: Date;
}): ChatMessageItem => ({
  id: message.id,
  senderId: message.senderId,
  receiverId: message.receiverId,
  content: message.content,
  createdAt: message.createdAt.toISOString(),
});

export const sendMessage = async (
  senderId: string,
  receiverId: string,
  content: string,
): Promise<ChatMessageItem> => {
  const message = await db.message.create({
    data: { senderId, receiverId, content },
  });

  return mapMessage(message);
};

export const getConversation = async (
  userId: string,
  otherUserId: string,
  page: number,
  limit: number,
): Promise<ChatMessageItem[]> => {
  const skip = (page - 1) * limit;
  const messages = await db.message.findMany({
    where: {
      OR: [
        { senderId: userId, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: userId },
      ],
    },
    orderBy: { createdAt: 'desc' },
    skip,
    take: limit,
  });

  return messages.map(mapMessage);
};
