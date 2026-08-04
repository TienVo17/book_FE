import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getOneImageOfOneBook } from "../../api/HinhAnhApi";
import dinhDangSo from "../utils/DinhDangSo";
import AnhSach from "../utils/AnhSach";
import { CartItem, readCart, updateQuantity, removeItem } from "../../api/CartStorage";

type SanPhamGioHang = CartItem & { hinhAnh?: string };

function GioHang() {
  const [gioHang, setGioHang] = useState<SanPhamGioHang[]>([]);
  const imageLoadRevision = React.useRef(0);
  const navigate = useNavigate();

  const attachImages = useCallback(async (items: CartItem[]) => {
    const revision = ++imageLoadRevision.current;
    const withImages = await Promise.all(
      items.map(async (item): Promise<SanPhamGioHang> => {
        try {
          const images = await getOneImageOfOneBook(item.maSach);
          return { ...item, hinhAnh: images[0]?.urlHinh || "" };
        } catch (error) {
          return item;
        }
      })
    );
    if (revision === imageLoadRevision.current) {
      setGioHang(withImages);
    }
  }, []);

  useEffect(() => {
    attachImages(readCart());

    // Cross-tab reconciliation: reload (and re-fetch images) when another
    // tab changes the cart. Same-tab mutations update local state directly
    // (see syncLocal) so they don't need to listen to cartUpdated here.
    const onExternalChange = () => attachImages(readCart());
    window.addEventListener("storage", onExternalChange);
    return () => {
      imageLoadRevision.current += 1;
      window.removeEventListener("storage", onExternalChange);
    };
  }, [attachImages]);

  const syncLocal = (updated: CartItem[]) => {
    setGioHang((prev) =>
      updated.map((item) => {
        const match = prev.find((p) => p.maSach === item.maSach);
        return match ? { ...item, hinhAnh: match.hinhAnh } : item;
      })
    );
  };

  const tongTien = gioHang.reduce((total, item) => total + item.sachDto.giaBan * item.soLuong, 0);

  return (
    <div className="container py-4">
      <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 700, marginBottom: "1.5rem" }}>
        <i className="fas fa-shopping-bag me-2" style={{ color: "var(--color-primary)" }}></i>
        Giỏ hàng
      </h2>

      {gioHang.length === 0 ? (
        <div className="text-center py-5 animate-fade-in">
          <div style={{
            width: 100, height: 100, borderRadius: "50%",
            background: "var(--color-bg)", display: "inline-flex",
            alignItems: "center", justifyContent: "center", marginBottom: "1.5rem"
          }}>
            <i className="fas fa-shopping-bag" style={{ fontSize: "2.5rem", color: "var(--color-text-muted)" }}></i>
          </div>
          <h5 style={{ color: "var(--color-text-secondary)", marginBottom: "1rem" }}>Giỏ hàng trống</h5>
          <Link to="/" className="btn-modern-primary">
            <i className="fas fa-arrow-left"></i>
            Tiếp tục mua sắm
          </Link>
        </div>
      ) : (
        <div className="row">
          {/* Cart items */}
          <div className="col-lg-8">
            {gioHang.map((item, index) => (
              <div className="cart-item d-flex gap-3 align-items-center" key={item.maSach} style={{ animationDelay: `${index * 80}ms` }}>
                <AnhSach
                  src={item.hinhAnh || item.sachDto.hinhAnh}
                  alt={item.sachDto.tenSach}
                  className="cart-item-img"
                />
                <div className="flex-grow-1">
                  <h6 style={{ fontFamily: "var(--font-heading)", fontWeight: 600, marginBottom: 4 }}>
                    {item.sachDto.tenSach}
                  </h6>
                  <span style={{ color: "var(--color-accent)", fontWeight: 600 }}>
                    {dinhDangSo(item.sachDto.giaBan)} đ
                  </span>
                </div>
                <div className="qty-control">
                  <button onClick={() => {
                    if (item.soLuong > 1) {
                      syncLocal(updateQuantity(item.maSach, item.soLuong - 1));
                    }
                  }}>-</button>
                  <input
                    type="number"
                    value={item.soLuong}
                    min={1}
                    onChange={(e) => {
                      const soLuongMoi = parseInt(e.target.value);
                      if (!isNaN(soLuongMoi) && soLuongMoi >= 1) {
                        syncLocal(updateQuantity(item.maSach, soLuongMoi));
                      }
                    }}
                  />
                  <button onClick={() => {
                    syncLocal(updateQuantity(item.maSach, item.soLuong + 1));
                  }}>+</button>
                </div>
                <div className="text-end" style={{ minWidth: 100 }}>
                  <div style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: "1rem" }}>
                    {dinhDangSo(item.sachDto.giaBan * item.soLuong)} đ
                  </div>
                </div>
                <button
                  className="btn-icon"
                  style={{ color: "var(--color-danger)", borderColor: "var(--color-danger)" }}
                  onClick={() => syncLocal(removeItem(item.maSach))}
                  aria-label="Xóa sản phẩm"
                >
                  <i className="fas fa-trash-alt"></i>
                </button>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="col-lg-4">
            <div className="cart-summary animate-slide-in-right">
              <h5 style={{ fontFamily: "var(--font-heading)", fontWeight: 700, marginBottom: "1.2rem" }}>
                Tóm tắt đơn hàng
              </h5>
              <div className="d-flex justify-content-between mb-2" style={{ fontSize: "0.93rem" }}>
                <span style={{ color: "var(--color-text-secondary)" }}>Sản phẩm ({gioHang.length})</span>
                <span>{dinhDangSo(tongTien)} đ</span>
              </div>
              <div className="d-flex justify-content-between mb-2" style={{ fontSize: "0.93rem" }}>
                <span style={{ color: "var(--color-text-secondary)" }}>Phí vận chuyển</span>
                <span style={{ color: "var(--color-success)" }}>Miễn phí</span>
              </div>
              <hr style={{ borderColor: "var(--color-border)", opacity: 0.5 }} />
              <div className="d-flex justify-content-between mb-4">
                <strong>Tổng cộng</strong>
                <span className="detail-price" style={{ fontSize: "1.3rem" }}>{dinhDangSo(tongTien)} đ</span>
              </div>
              <button
                className="btn-modern-accent w-100"
                style={{ padding: "0.75rem", justifyContent: "center" }}
                onClick={() => {
                  if (localStorage.getItem("jwt")) {
                    navigate("/thanh-toan");
                  } else {
                    // eslint-disable-next-line no-restricted-globals
                    const result = confirm("Bạn có muốn đăng nhập để thanh toán?");
                    if (result) {
                      localStorage.setItem("nextPay", "true");
                      navigate("/dang-nhap");
                    }
                  }
                }}
              >
                Thanh toán ngay
                <i className="fas fa-arrow-right"></i>
              </button>
              <Link
                to="/"
                className="btn-modern-outline w-100 mt-2"
                style={{ justifyContent: "center", textDecoration: "none" }}
              >
                <i className="fas fa-arrow-left"></i>
                Tiếp tục mua sắm
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default GioHang;
