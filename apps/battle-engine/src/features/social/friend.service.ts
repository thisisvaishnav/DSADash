import { db } from '../../core/database/db.client';
import type { FriendItem, FriendRequestItem } from './friend.types';

type ServiceResult<T> = { success: true; data: T } | { success: false; error: string };

const normalizePair = (userIdA: string, userIdB: string) => {
  if (userIdA < userIdB) return { userAId: userIdA, userBId: userIdB };
  return { userAId: userIdB, userBId: userIdA };
};

const mapRequest = (request: {
  id: string;
  requesterId: string;
  addresseeId: string;
  status: string;
  createdAt: Date;
  requester: { name: string };
  addressee: { name: string };
}): FriendRequestItem => ({
  id: request.id,
  requesterId: request.requesterId,
  requesterName: request.requester.name,
  addresseeId: request.addresseeId,
  addresseeName: request.addressee.name,
  status: request.status as FriendRequestItem['status'],
  createdAt: request.createdAt.toISOString(),
});

export const createFriendRequest = async (
  requesterId: string,
  addresseeId: string,
): Promise<ServiceResult<FriendRequestItem>> => {
  if (requesterId === addresseeId) {
    return { success: false, error: 'Cannot send friend request to yourself' };
  }

  const { userAId, userBId } = normalizePair(requesterId, addresseeId);
  const existingFriend = await db.friend.findUnique({
    where: { userAId_userBId: { userAId, userBId } },
  });

  if (existingFriend) {
    return { success: false, error: 'Already friends' };
  }

  const pendingRequest = await db.friendRequest.findFirst({
    where: {
      status: 'PENDING',
      OR: [
        { requesterId, addresseeId },
        { requesterId: addresseeId, addresseeId: requesterId },
      ],
    },
  });

  if (pendingRequest) {
    return { success: false, error: 'Friend request already pending' };
  }

  const request = await db.friendRequest.create({
    data: { requesterId, addresseeId },
    include: { requester: { select: { name: true } }, addressee: { select: { name: true } } },
  });

  return { success: true, data: mapRequest(request) };
};

export const acceptFriendRequest = async (
  requestId: string,
  userId: string,
): Promise<ServiceResult<FriendItem>> => {
  const request = await db.friendRequest.findUnique({
    where: { id: requestId },
    include: { requester: { select: { id: true, name: true, image: true, rating: true } } },
  });

  if (!request) {
    return { success: false, error: 'Request not found' };
  }

  if (request.addresseeId !== userId) {
    return { success: false, error: 'Not authorized to accept this request' };
  }

  if (request.status !== 'PENDING') {
    return { success: false, error: 'Request already handled' };
  }

  const { userAId, userBId } = normalizePair(request.requesterId, request.addresseeId);

  await db.friendRequest.update({
    where: { id: requestId },
    data: { status: 'ACCEPTED' },
  });

  await db.friend.upsert({
    where: { userAId_userBId: { userAId, userBId } },
    create: { userAId, userBId },
    update: {},
  });

  return {
    success: true,
    data: {
      userId: request.requester.id,
      name: request.requester.name,
      image: request.requester.image,
      rating: request.requester.rating,
      since: new Date().toISOString(),
    },
  };
};

export const rejectFriendRequest = async (
  requestId: string,
  userId: string,
): Promise<ServiceResult<{ id: string; status: string }>> => {
  const request = await db.friendRequest.findUnique({ where: { id: requestId } });

  if (!request) {
    return { success: false, error: 'Request not found' };
  }

  if (request.addresseeId !== userId) {
    return { success: false, error: 'Not authorized to reject this request' };
  }

  if (request.status !== 'PENDING') {
    return { success: false, error: 'Request already handled' };
  }

  const updated = await db.friendRequest.update({
    where: { id: requestId },
    data: { status: 'REJECTED' },
  });

  return { success: true, data: { id: updated.id, status: updated.status } };
};

export const getFriendRequests = async (userId: string): Promise<FriendRequestItem[]> => {
  const requests = await db.friendRequest.findMany({
    where: {
      OR: [{ requesterId: userId }, { addresseeId: userId }],
    },
    orderBy: { createdAt: 'desc' },
    include: { requester: { select: { name: true } }, addressee: { select: { name: true } } },
  });

  return requests.map(mapRequest);
};

export const getFriends = async (userId: string): Promise<FriendItem[]> => {
  const friendships = await db.friend.findMany({
    where: {
      OR: [{ userAId: userId }, { userBId: userId }],
    },
    include: {
      userA: { select: { id: true, name: true, image: true, rating: true } },
      userB: { select: { id: true, name: true, image: true, rating: true } },
    },
  });

  return friendships.map((friendship) => {
    const friendUser = friendship.userAId === userId ? friendship.userB : friendship.userA;
    return {
      userId: friendUser.id,
      name: friendUser.name,
      image: friendUser.image,
      rating: friendUser.rating,
      since: friendship.createdAt.toISOString(),
    };
  });
};
