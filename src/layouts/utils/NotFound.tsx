import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { applySeoMeta } from './SeoMeta';

/**
 * Client-side not-found screen.
 *
 * Note: the SPA is served with a history fallback, so the HTTP status for an
 * unknown browser route is still 200 from the origin. This is UX, not an
 * origin-level 404; the limitation is documented in the deployment docs.
 */
export default function NotFound(): JSX.Element {
  useEffect(() => {
    applySeoMeta({ title: 'Không tìm thấy trang', noindex: true });
  }, []);

  return (
    <div className="container py-5">
      <div className="empty-state animate-scale-in">
        <div className="empty-state-icon">
          <i className="fas fa-compass" aria-hidden="true"></i>
        </div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Không tìm thấy trang</h1>
        <p style={{ color: 'var(--color-text-secondary)' }}>
          Đường dẫn bạn mở không tồn tại hoặc đã được thay đổi.
        </p>
        <Link to="/" className="btn-modern-primary" style={{ textDecoration: 'none' }}>
          <i className="fas fa-arrow-left" aria-hidden="true"></i>
          Về trang chủ
        </Link>
      </div>
    </div>
  );
}
