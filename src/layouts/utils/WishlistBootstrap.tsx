import { useEffect } from 'react';
import {
  clearWishlistSession,
  syncWishlistSession,
} from '../../api/WishlistSession';
import {
  getAuthSnapshot,
  subscribeAuthSession,
} from '../../api/AuthSession';

const WishlistBootstrap: React.FC = () => {
  useEffect(() => {
    const syncAuthSession = () => {
      const auth = getAuthSnapshot();
      if (auth.status === 'unknown') return;
      if (auth.status === 'guest') {
        clearWishlistSession();
        return;
      }
      void syncWishlistSession().catch(() => undefined);
    };

    syncAuthSession();
    return subscribeAuthSession(syncAuthSession);
  }, []);

  return null;
};

export default WishlistBootstrap;
