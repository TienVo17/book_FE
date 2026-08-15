import React, { useState, useEffect, useCallback, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getOneImageOfOneBook } from "../../api/HinhAnhApi";
import dinhDangSo from "../utils/DinhDangSo";
import AnhSach from "../utils/AnhSach";
import { CartItem } from "../../api/CartStorage";
import {
  loadCart,
  readCartForCurrentSession,
  removeCartItem,
  setCartItemQuantity,
} from "../../api/CartSession";
import { toast } from "react-toastify";
import { useAuthSession } from "../../api/AuthSession";

type SanPhamGioHang = CartItem & { hinhAnh?: string };

type CartAuthIdentity = {
  status: "unknown" | "guest" | "authenticated";
  uid: number | null;
};

function cartMutationKey(auth: CartAuthIdentity, maSach: number): string {
  return `${auth.status}:${auth.uid ?? "none"}:${maSach}`;
}

function GioHang() {
  const auth = useAuthSession();
  const [gioHang, setGioHang] = useState<SanPhamGioHang[]>([]);
  const [dangTaiGioHang, setDangTaiGioHang] = useState(true);
  const [loiTaiGioHang, setLoiTaiGioHang] = useState<string | null>(null);
  const [maSachDangCapNhat, setMaSachDangCapNhat] = useState<number | null>(null);
  const [soLuongNhap, setSoLuongNhap] = useState<Record<number, string>>({});
  const mutationInFlight = useRef(new Set<string>());
  const imageLoadRevision = useRef(0);
  const currentAuth = useRef(auth);
  currentAuth.current = auth;
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

  const reloadCart = useCallback(async () => {
    setDangTaiGioHang(true);
    setLoiTaiGioHang(null);
    try {
      await attachImages(await loadCart());
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không thể tải giỏ hàng.";
      setLoiTaiGioHang(message);
      toast.error(message);
    } finally {
      setDangTaiGioHang(false);
    }
  }, [attachImages]);

  useEffect(() => {
    let active = true;
    setMaSachDangCapNhat(null);
    setSoLuongNhap({});

    if (auth.status === "unknown") {
      return () => {
        active = false;
        imageLoadRevision.current += 1;
      };
    }

    const loadCurrentCart = async () => {
      setDangTaiGioHang(true);
      setLoiTaiGioHang(null);
      try {
        const items = await loadCart();
        if (active) {
          await attachImages(items);
        }
      } catch (error) {
        if (!active) return;
        const message = error instanceof Error ? error.message : "Không thể tải giỏ hàng.";
        setLoiTaiGioHang(message);
        toast.error(message);
      } finally {
        if (active) {
          setDangTaiGioHang(false);
        }
      }
    };

    void loadCurrentCart();
    const onExternalChange = () => {
      void attachImages(readCartForCurrentSession());
    };
    window.addEventListener("storage", onExternalChange);
    window.addEventListener("cartUpdated", onExternalChange);
    return () => {
      active = false;
      imageLoadRevision.current += 1;
      window.removeEventListener("storage", onExternalChange);
      window.removeEventListener("cartUpdated", onExternalChange);
    };
  }, [attachImages, auth.status, auth.uid]);

  const syncLocal = (updated: CartItem[]) => {
    setGioHang((prev) =>
      updated.map((item) => {
        const match = prev.find((p) => p.maSach === item.maSach);
        return match ? { ...item, hinhAnh: match.hinhAnh } : item;
      })
    );
    setSoLuongNhap({});
  };

  const mutateCart = async (
    maSach: number,
    operation: () => Promise<CartItem[]>,
  ) => {
    const expectedAuth = currentAuth.current;
    const mutationKey = cartMutationKey(expectedAuth, maSach);
    if (mutationInFlight.current.has(mutationKey)) return;
    mutationInFlight.current.add(mutationKey);
    setMaSachDangCapNhat(maSach);

    const isCurrentIdentity = () => {
      const latestAuth = currentAuth.current;
      return (
        latestAuth.status === expectedAuth.status &&
        latestAuth.uid === expectedAuth.uid
      );
    };

    try {
      const updated = await operation();
      if (isCurrentIdentity()) {
        syncLocal(updated);
      }
    } catch (error) {
      if (isCurrentIdentity()) {
        setSoLuongNhap({});
        toast.error(error instanceof Error ? error.message : "Không thể cập nhật giỏ hàng.");
      }
    } finally {
      mutationInFlight.current.delete(mutationKey);
      if (isCurrentIdentity()) {
        setMaSachDangCapNhat(current => current === maSach ? null : current);
      }
    }
  };

  const commitQuantity = (item: SanPhamGioHang) => {
    const draft = soLuongNhap[item.maSach];
    if (draft === undefined) return;
    const soLuongMoi = Number.parseInt(draft, 10);
    if (!Number.isInteger(soLuongMoi) || soLuongMoi < 1) {
      setSoLuongNhap(current => {
        const next = { ...current };
        delete next[item.maSach];
        return next;
      });
      return;
    }
    if (soLuongMoi === item.soLuong) {
      setSoLuongNhap(current => {
        const next = { ...current };
        delete next[item.maSach];
        return next;
      });
      return;
    }
    void mutateCart(
      item.maSach,
      () => setCartItemQuantity(item.maSach, soLuongMoi),
    );
  };

  const tongTien = gioHang.reduce((total, item) => total + item.sachDto.giaBan * item.soLuong, 0);

  return (
    <div className="container py-4">
      <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 700, marginBottom: "1.5rem" }}>
        <i className="fas fa-shopping-bag me-2" style={{ color: "var(--color-primary)" }}></i>
        Giỏ hàng
      </h2>

      {dangTaiGioHang ? (
        <div className="text-center py-5" role="status" aria-live="polite">
          <span className="spinner-border text-primary" aria-hidden="true"></span>
          <p className="mt-3" style={{ color: "var(--color-text-muted)" }}>
            Đang tải giỏ hàng…
          </p>
        </div>
      ) : loiTaiGioHang ? (
        <div className="alert alert-danger text-center" role="alert">
          <i className="fas fa-exclamation-circle me-2" aria-hidden="true"></i>
          {loiTaiGioHang}
          <div className="mt-3">
            <button
              type="button"
              className="btn-modern-outline"
              onClick={() => { void reloadCart(); }}
              aria-label="Tải lại giỏ hàng"
            >
              <i className="fas fa-redo" aria-hidden="true"></i>
              Tải lại
            </button>
          </div>
        </div>
      ) : gioHang.length === 0 ? (
        <div className="text-center py-5 animate-fade-in">
          <div style={{
            width: 100, height: 100, borderRadius: "50%",
            background: "var(--color-bg)", display: "inline-flex",
            alignItems: "center", justifyContent: "center", marginBottom: "1.5rem"
          }}>
            <i className="fas fa-shopping-bag" style={{ fontSize: "2.5rem", color: "var(--color-text-muted)" }} aria-hidden="true"></i>
          </div>
          <h5 style={{ color: "var(--color-text-secondary)", marginBottom: "1rem" }}>Giỏ hàng trống</h5>
          <Link to="/" className="btn-modern-primary">
            <i className="fas fa-arrow-left" aria-hidden="true"></i>
            Tiếp tục mua sắm
          </Link>
        </div>
      ) : (
        <div className="row">
          {/* Cart items */}
          <div className="col-lg-8">
            {gioHang.map((item, index) => {
              const dangCapNhat = maSachDangCapNhat === item.maSach;
              return (
                <div
                  className="cart-item d-flex gap-3 align-items-center"
                  key={item.maSach}
                  style={{ animationDelay: `${index * 80}ms` }}
                  aria-busy={dangCapNhat}
                >
                  <AnhSach
                    src={item.hinhAnh || item.sachDto.hinhAnh}
                    alt={item.sachDto.tenSach}
                    className="cart-item-img"
                  />
                  <div className="flex-grow-1 cart-item-info">
                    <h6 style={{ fontFamily: "var(--font-heading)", fontWeight: 600, marginBottom: 4 }}>
                      {item.sachDto.tenSach}
                    </h6>
                    <span style={{ color: "var(--color-accent)", fontWeight: 600 }}>
                      {dinhDangSo(item.sachDto.giaBan)} đ
                    </span>
                  </div>
                  <div className="qty-control">
                    <button
                      type="button"
                      disabled={dangCapNhat || item.soLuong <= 1}
                      aria-label={`Giảm số lượng ${item.sachDto.tenSach}`}
                      onClick={() => {
                        void mutateCart(
                          item.maSach,
                          () => setCartItemQuantity(item.maSach, item.soLuong - 1),
                        );
                      }}
                    >−</button>
                    <input
                      type="number"
                      value={soLuongNhap[item.maSach] ?? String(item.soLuong)}
                      min={1}
                      disabled={dangCapNhat}
                      aria-label={`Số lượng ${item.sachDto.tenSach}`}
                      onChange={(event) => {
                        setSoLuongNhap(current => ({
                          ...current,
                          [item.maSach]: event.target.value,
                        }));
                      }}
                      onBlur={() => commitQuantity(item)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.currentTarget.blur();
                        } else if (event.key === "Escape") {
                          setSoLuongNhap(current => {
                            const next = { ...current };
                            delete next[item.maSach];
                            return next;
                          });
                          event.currentTarget.blur();
                        }
                      }}
                    />
                    <button
                      type="button"
                      disabled={dangCapNhat}
                      aria-label={`Tăng số lượng ${item.sachDto.tenSach}`}
                      onClick={() => {
                        void mutateCart(
                          item.maSach,
                          () => setCartItemQuantity(item.maSach, item.soLuong + 1),
                        );
                      }}
                    >+</button>
                  </div>
                  <div className="text-end cart-item-total" style={{ minWidth: 100 }}>
                    <div style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: "1rem" }}>
                      {dinhDangSo(item.sachDto.giaBan * item.soLuong)} đ
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn-icon cart-item-remove"
                    style={{ color: "var(--color-danger)", borderColor: "var(--color-danger)" }}
                    disabled={dangCapNhat}
                    onClick={() => {
                      void mutateCart(item.maSach, () => removeCartItem(item.maSach));
                    }}
                    aria-label={`Xóa ${item.sachDto.tenSach} khỏi giỏ hàng`}
                  >
                    <i className="fas fa-trash-alt" aria-hidden="true"></i>
                  </button>
                </div>
              );
            })}
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
                  if (auth.status === "authenticated") {
                    navigate("/thanh-toan");
                  } else if (auth.status === "guest") {
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
