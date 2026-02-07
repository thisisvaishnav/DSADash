export type FriendRequestStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED';

export type FriendRequestItem = {
  id: string;
  requesterId: string;
  requesterName: string;
  addresseeId: string;
  addresseeName: string;
  status: FriendRequestStatus;
  createdAt: string;
};

export type FriendItem = {
  userId: string;
  name: string;
  image: string | null;
  rating: number;
  since: string;
};
