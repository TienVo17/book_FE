import { render } from '@testing-library/react';
import WishlistBootstrap from './WishlistBootstrap';
import {
  clearWishlistSession,
  syncWishlistSession,
} from '../../api/WishlistSession';
import {
  getAuthSnapshot,
  subscribeAuthSession,
} from '../../api/AuthSession';

jest.mock('../../api/WishlistSession', () => ({
  clearWishlistSession: jest.fn(),
  syncWishlistSession: jest.fn(),
}));

jest.mock('../../api/AuthSession', () => ({
  getAuthSnapshot: jest.fn(),
  subscribeAuthSession: jest.fn(),
}));

const mockedClearWishlistSession = clearWishlistSession as jest.MockedFunction<typeof clearWishlistSession>;
const mockedSyncWishlistSession = syncWishlistSession as jest.MockedFunction<typeof syncWishlistSession>;
const mockedGetAuthSnapshot = getAuthSnapshot as jest.MockedFunction<typeof getAuthSnapshot>;
const mockedSubscribeAuthSession = subscribeAuthSession as jest.MockedFunction<typeof subscribeAuthSession>;

describe('WishlistBootstrap', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedSyncWishlistSession.mockResolvedValue([]);
    mockedGetAuthSnapshot.mockReturnValue({
      status: 'authenticated',
      uid: 1,
      username: 'customer',
      roles: [],
      capabilities: [],
    });
  });

  it('subscribes to the AuthSession external store without jwt storage or legacy auth-event listeners', () => {
    const unsubscribe = jest.fn();
    mockedSubscribeAuthSession.mockReturnValue(unsubscribe);

    const { unmount } = render(<WishlistBootstrap />);

    expect(mockedSubscribeAuthSession).toHaveBeenCalledTimes(1);
    expect(mockedSyncWishlistSession).toHaveBeenCalledTimes(1);
    expect(mockedClearWishlistSession).not.toHaveBeenCalled();
    unmount();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});
