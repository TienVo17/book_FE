import React, { useEffect } from "react";
import { NavLink, useParams } from "react-router-dom";
import { DANH_SACH_CHINH_SACH, timChinhSach } from "./noiDungChinhSach";

/**
 * Một component cho cả 8 trang chính sách, nội dung lấy theo slug.
 *
 * Tám component gần như giống hệt nhau chỉ khác chữ là tám chỗ để bố cục lệch nhau dần.
 * Ở đây bố cục nằm một chỗ, nội dung nằm trong `noiDungChinhSach.ts`, nên sửa văn bản
 * không phải đụng vào JSX.
 */
const ChinhSachPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const trang = timChinhSach(slug);

  // Đi từ chính sách này sang chính sách khác qua thanh bên mà giữ nguyên vị trí cuộn thì
  // người đọc rơi vào giữa một văn bản khác hẳn.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);

  if (!trang) {
    return (
      <div className="container py-5">
        <div className="text-center py-5">
          <i
            className="fas fa-file-circle-question"
            style={{ fontSize: "3rem", color: "var(--color-text-muted)", marginBottom: "1rem", display: "block" }}
          />
          <h5 style={{ color: "var(--color-text-secondary)" }}>Không tìm thấy trang chính sách này.</h5>
          <NavLink to="/" className="btn-modern-outline-primary mt-3 d-inline-block">
            Về trang chủ
          </NavLink>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-5">
      <div className="section-header">
        <h2>{trang.tieuDe}</h2>
      </div>
      <p style={{ color: "var(--color-text-secondary)", marginTop: "-0.5rem" }}>{trang.moTa}</p>

      <div className="row g-4 mt-1">
        <div className="col-lg-8">
          <div className="detail-section">
            {trang.muc.map((muc) => (
              <section key={muc.tieuDe} className="mb-4">
                <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "1.05rem", fontWeight: 700 }}>
                  {muc.tieuDe}
                </h3>
                {muc.doan.map((doan, i) => (
                  <p key={i} style={{ fontSize: "0.94rem", lineHeight: 1.9, marginBottom: "0.6rem" }}>
                    {doan}
                  </p>
                ))}
              </section>
            ))}
          </div>
        </div>

        <div className="col-lg-4">
          <nav className="detail-section" aria-label="Các trang chính sách khác">
            <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "1rem", fontWeight: 700 }}>
              Chính sách khác
            </h3>
            <ul className="list-unstyled mb-0">
              {DANH_SACH_CHINH_SACH.filter((muc) => muc.slug !== trang.slug).map((muc) => (
                <li key={muc.slug} className="mb-2">
                  <NavLink to={`/chinh-sach/${muc.slug}`}>{muc.tieuDe}</NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
    </div>
  );
};

export default ChinhSachPage;
