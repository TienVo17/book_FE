import { useEffect } from 'react';
import {
  clearWishlistSession,
  syncWishlistSession,
} from '../../api/WishlistSession';
import { AUTH_SESSION_CHANGED_EVENT } from '../../api/SessionCleanup';

const WishlistBootstrap: React.FC = () => {
  useEffect(() => {
    const syncStoredSession = () => {
      if (!localStorage.getItem('jwt')) {
        clearWishlistSession();
        return;
      }
      void syncWishlistSession().catch(() => undefined);
    };
    const syncExternalSession = (event: StorageEvent) => {
      if (event.key === 'jwt' || event.key === null) {
        syncStoredSession();
      }
    };

    syncStoredSession();
    window.addEventListener(AUTH_SESSION_CHANGED_EVENT, syncStoredSession);
    window.addEventListener('storage', syncExternalSession);
    return () => {
      window.removeEventListener(AUTH_SESSION_CHANGED_EVENT, syncStoredSession);
      window.removeEventListener('storage', syncExternalSession);
    };
  }, []);

  return null;
};

export default WishlistBootstrap;
