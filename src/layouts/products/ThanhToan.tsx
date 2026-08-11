import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getOneImageOfOneBook } from '../../api/HinhAnhApi';
import { getDanhSachDiaChi } from '../../api/DiaChiApi';
import { kiemTraCoupon } from '../../api/CouponApi';
import { ApiRequestError } from '../../api/Request';
import { DiaChiModel } from '../../models/DiaChiModel';
import { KetQuaKiemTraCoupon } from '../../models/CouponModel';
import CartItemsTable from './CartItemsTable';
import CheckoutSidebar from './CheckoutSidebar';
import {
    CartItem,
    readCart,
    clearCart,
    getCartFingerprint,
    getCartFingerprintForItems,
} from '../../api/CartStorage';
import {
    loadCart,
    readCartForCurrentSession,
    refreshCartAfterCheckout,
    removeCartItem,
    setCartItemQuantity,
    waitForCartMutations,
} from '../../api/CartSession';
import {
    createDonHang,
    createVNPayPaymentUrl,
    CheckoutOrderRequest,
    CheckoutOrderResponse,
    HinhThucGiaoHangResponse,
    getHinhThucGiaoHang,
} from '../../api/DonHangApi';
import {
    ensureIntent,
    startNewIntent,
    clearIntent,
    CheckoutIntentStaleError,
    CheckoutIntent,
    buildCheckoutIntentFingerprint,
} from '../../api/CheckoutIntent';

type SanPhamGioHang = CartItem & { hinhAnh?: string };

function ThanhToan() {
    const [gioHang, setGioHang] = useState<SanPhamGioHang[]>([]);
    const [dangTaiGioHang, setDangTaiGioHang] = useState(true);
    const [loiTaiGioHang, setLoiTaiGioHang] = useState<string | null>(null);
    const [maSachDangCapNhat, setMaSachDangCapNhat] = useState<number | null>(null);
    const cartMutationInFlight = useRef(new Set<number>());
    const cartMutationPromises = useRef(new Set<Promise<void>>());
    const localCartMutationRevision = useRef(0);
    const acceptedLocalCartFingerprint = useRef<string | null>(null);
    const checkoutPreparingRef = useRef(false);
    const renderedCartMutationRevision = localCartMutationRevision.current;
    const [donHang, setDonHang] = useState<CheckoutOrderResponse | null>(null);
    const [danhSachDiaChi, setDanhSachDiaChi] = useState<DiaChiModel[]>([]);
    const [diaChiDaChon, setDiaChiDaChon] = useState<number | null>(null);
    const [phuongThucThanhToan, setPhuongThucThanhToan] = useState<'COD' | 'VNPAY'>('COD');
    const [danhSachHinhThucGiaoHang, setDanhSachHinhThucGiaoHang] = useState<HinhThucGiaoHangResponse[]>([]);
    const [hinhThucGiaoHangDaChon, setHinhThucGiaoHangDaChon] = useState<number | null>(null);
    const [dangTaiHinhThucGiaoHang, setDangTaiHinhThucGiaoHang] = useState(true);
    const [loiHinhThucGiaoHang, setLoiHinhThucGiaoHang] = useState<string | null>(null);
    const [maCoupon, setMaCoupon] = useState('');
    const [couponResult, setCouponResult] = useState<KetQuaKiemTraCoupon | null>(null);
    const [dangTao, setDangTao] = useState(false);
    const [dangTaoLinkThanhToan, setDangTaoLinkThanhToan] = useState(false);
    const [buocHienTai, setBuocHienTai] = useState<'review' | 'payment'>('review');
    const [gioHangDaThayDoi, setGioHangDaThayDoi] = useState(false);
    // Inline, programmatically associated error text. Toasts alone are not an
    // accessible failure channel: they are transient and colour-coded only.
    const [loiDatHang, setLoiDatHang] = useState<{ message: string; traceId?: string } | null>(null);
    const dangGuiRef = useRef(false);
    const imageLoadRevision = useRef(0);
    const couponValidationRevision = useRef(0);
    const navigate = useNavigate();

    const invalidateCoupon = () => {
        couponValidationRevision.current += 1;
        setCouponResult(null);
    };

    const taiHinhThucGiaoHang = async () => {
        setDangTaiHinhThucGiaoHang(true);
        setLoiHinhThucGiaoHang(null);
        try {
            const list = await getHinhThucGiaoHang();
            setDanhSachHinhThucGiaoHang(list);
            setHinhThucGiaoHangDaChon(current =>
                current !== null && list.some(item => item.maHinhThucGiaoHang === current)
                    ? current
                    : null
            );
        } catch (error) {
            setDanhSachHinhThucGiaoHang([]);
            setHinhThucGiaoHangDaChon(null);
            const message = error instanceof Error
                ? error.message
                : 'Không thể tải hình thức giao hàng.';
            setLoiHinhThucGiaoHang(message);
        } finally {
            setDangTaiHinhThucGiaoHang(false);
        }
    };

    useEffect(() => {
        const loadGioHangWithImages = async (items: CartItem[]) => {
            const revision = ++imageLoadRevision.current;
            if (items.length === 0) {
                setGioHang([]);
                return;
            }
            const withImages = await Promise.all(
                items.map(async item => {
                    try {
                        const imgs = await getOneImageOfOneBook(item.maSach);
                        return { ...item, hinhAnh: imgs[0]?.urlHinh || '' };
                    } catch {
                        return item;
                    }
                })
            );
            if (revision === imageLoadRevision.current) {
                setGioHang(withImages);
            }
        };

        setDangTaiGioHang(true);
        setLoiTaiGioHang(null);
        loadCart()
            .then(loadGioHangWithImages)
            .catch(error => {
                const message = error instanceof Error ? error.message : 'Không thể tải giỏ hàng.';
                setLoiTaiGioHang(message);
                toast.error(message);
            })
            .finally(() => setDangTaiGioHang(false));

        // Cross-tab reconciliation: another tab may add/clear items while this
        // review page is open; refresh from storage when that happens.
        const onExternalChange = () => {
            invalidateCoupon();
            void loadGioHangWithImages(readCartForCurrentSession());
        };
        window.addEventListener('storage', onExternalChange);
        window.addEventListener('cartUpdated', onExternalChange);

        void taiHinhThucGiaoHang();

        getDanhSachDiaChi()
            .then(list => {
                setDanhSachDiaChi(list);
                if (list.length > 0) {
                    const macDinh = list.find(item => item.macDinh);
                    setDiaChiDaChon((macDinh || list[0]).maDiaChi || null);
                }
            })
            .catch(error => {
                console.error(error);
                toast.error('Không thể tải danh sách địa chỉ');
            });

        return () => {
            imageLoadRevision.current += 1;
            window.removeEventListener('storage', onExternalChange);
            window.removeEventListener('cartUpdated', onExternalChange);
        };
    }, []);

    const syncLocal = (updated: CartItem[]) => {
        setGioHang(prev => updated.map(item => {
            const match = prev.find(p => p.maSach === item.maSach);
            return match ? { ...item, hinhAnh: match.hinhAnh } : item;
        }));
        // Coupon được backend tính theo subtotal tại lúc kiểm tra. Mọi thay đổi
        // giỏ hàng làm kết quả đó cũ; không hiển thị hay gửi một mức giảm sai.
        invalidateCoupon();
    };

    const mutateCart = (
        maSach: number,
        expectedCart: CartItem[],
        operation: () => Promise<CartItem[]>,
    ) => {
        if (cartMutationInFlight.current.has(maSach)) return;
        cartMutationInFlight.current.add(maSach);
        setMaSachDangCapNhat(maSach);
        let tracked!: Promise<void>;
        tracked = (async () => {
            try {
                const updated = await operation();
                localCartMutationRevision.current += 1;
                acceptedLocalCartFingerprint.current =
                    getCartFingerprintForItems(updated) === getCartFingerprintForItems(expectedCart)
                        ? getCartFingerprintForItems(expectedCart)
                        : null;
                syncLocal(updated);
            } catch (error) {
                toast.error(error instanceof Error ? error.message : 'Không thể cập nhật giỏ hàng.');
            } finally {
                cartMutationInFlight.current.delete(maSach);
                cartMutationPromises.current.delete(tracked);
                setMaSachDangCapNhat(current => current === maSach ? null : current);
            }
        })();
        cartMutationPromises.current.add(tracked);
    };

    const handleIncrease = (maSach: number) => {
        const target = gioHang.find(sp => sp.maSach === maSach);
        if (!target) return;
        const expectedCart = gioHang.map(item =>
            item.maSach === maSach ? { ...item, soLuong: target.soLuong + 1 } : item
        );
        void mutateCart(
            maSach,
            expectedCart,
            () => setCartItemQuantity(maSach, target.soLuong + 1),
        );
    };

    const handleDecrease = (maSach: number) => {
        const target = gioHang.find(sp => sp.maSach === maSach);
        if (!target || target.soLuong <= 1) return;
        const expectedCart = gioHang.map(item =>
            item.maSach === maSach ? { ...item, soLuong: target.soLuong - 1 } : item
        );
        void mutateCart(
            maSach,
            expectedCart,
            () => setCartItemQuantity(maSach, target.soLuong - 1),
        );
    };

    const handleChangeQty = (maSach: number, qty: number) => {
        const expectedCart = gioHang.map(item =>
            item.maSach === maSach ? { ...item, soLuong: qty } : item
        );
        void mutateCart(
            maSach,
            expectedCart,
            () => setCartItemQuantity(maSach, qty),
        );
    };

    const handleRemove = (maSach: number) => {
        const expectedCart = gioHang.filter(item => item.maSach !== maSach);
        void mutateCart(maSach, expectedCart, () => removeCartItem(maSach));
    };

    const tongTienGoc = gioHang.reduce((t, item) => t + item.sachDto.giaBan * item.soLuong, 0);
    const soTienGiam = donHang?.soTienGiam ?? (couponResult?.hopLe ? couponResult.soTienGiam : 0);
    const hinhThucGiaoHang = danhSachHinhThucGiaoHang.find(
        item => item.maHinhThucGiaoHang === hinhThucGiaoHangDaChon
    );
    const phiVanChuyen = donHang?.phiVanChuyen ?? hinhThucGiaoHang?.chiPhiGiaoHang ?? 0;
    const tongSauGiam = couponResult?.hopLe
        ? (couponResult.tongTienSauGiam ?? tongTienGoc - soTienGiam)
        : tongTienGoc - soTienGiam;
    const tongThanhToan = donHang?.tongTien ?? (tongSauGiam + phiVanChuyen);

    const handleApCoupon = async () => {
        if (!maCoupon.trim()) {
            return;
        }
        const validationRevision = ++couponValidationRevision.current;
        const cartFingerprint = getCartFingerprint();
        try {
            const result = await kiemTraCoupon(maCoupon, tongTienGoc);
            if (
                validationRevision !== couponValidationRevision.current ||
                cartFingerprint !== getCartFingerprint()
            ) {
                return;
            }
            setCouponResult(result);
            if (result.hopLe) {
                setMaCoupon(result.maCoupon || maCoupon.trim().toUpperCase());
                toast.success(`Giảm ${result.soTienGiam.toLocaleString()}đ`);
            } else {
                toast.error(result.thongBao);
            }
        } catch {
            if (validationRevision === couponValidationRevision.current) {
                toast.error('Không thể kiểm tra coupon');
            }
        }
    };

    // One failure channel for both sighted and assistive-tech users: the toast
    // stays for parity with the rest of the app, the inline alert is what makes
    // the failure reachable and re-readable.
    const baoLoiDatHang = (message: string, traceId?: string) => {
        setLoiDatHang({ message, traceId });
        toast.error(message);
    };

    const handleDatHang = async () => {
        // Guard both preparation and network submission. Preparation awaits cart
        // mutations, so state-based disabling alone cannot stop two rapid clicks.
        if (checkoutPreparingRef.current || dangGuiRef.current) {
            return;
        }
        if (!diaChiDaChon) {
            baoLoiDatHang('Vui lòng chọn địa chỉ giao hàng');
            return;
        }
        if (gioHang.length === 0) {
            baoLoiDatHang('Giỏ hàng trống');
            return;
        }
        if (hinhThucGiaoHangDaChon === null || !hinhThucGiaoHang) {
            baoLoiDatHang('Vui lòng chọn hình thức giao hàng');
            return;
        }

        checkoutPreparingRef.current = true;
        try {
            await Promise.all(Array.from(cartMutationPromises.current));
            await waitForCartMutations();
        } finally {
            checkoutPreparingRef.current = false;
        }

        const authoritativeCart = readCartForCurrentSession();
        const cartFingerprintHienTai = getCartFingerprintForItems(authoritativeCart);
        const cartFingerprintDaXem = getCartFingerprintForItems(gioHang);
        const localMutationFinishedAfterRender =
            renderedCartMutationRevision !== localCartMutationRevision.current;
        const matchesAcceptedLocalMutation =
            localMutationFinishedAfterRender &&
            acceptedLocalCartFingerprint.current === cartFingerprintHienTai;
        if (
            cartFingerprintDaXem !== cartFingerprintHienTai &&
            !matchesAcceptedLocalMutation
        ) {
            setGioHang(authoritativeCart);
            setGioHangDaThayDoi(true);
            invalidateCoupon();
            baoLoiDatHang('Giỏ hàng vừa thay đổi ở tab khác. Vui lòng kiểm tra lại trước khi đặt hàng.');
            return;
        }
        if (matchesAcceptedLocalMutation) {
            setGioHang(authoritativeCart);
            invalidateCoupon();
        }
        if (authoritativeCart.length === 0) {
            baoLoiDatHang('Giỏ hàng trống');
            return;
        }
        setLoiDatHang(null);

        const checkoutFingerprint = buildCheckoutIntentFingerprint({
            cartFingerprint: cartFingerprintHienTai,
            maDiaChiGiaoHang: diaChiDaChon,
            maHinhThucGiaoHang: hinhThucGiaoHangDaChon,
            phuongThucThanhToan,
            maCoupon: localMutationFinishedAfterRender
                ? undefined
                : couponResult?.hopLe ? (couponResult.maCoupon || maCoupon) : undefined,
        });
        let intent: CheckoutIntent;
        try {
            // Once the user has explicitly acknowledged a stale checkout
            // (cart/address/payment/coupon), generate a new intent instead of
            // reusing a key that represents a materially different request.
            intent = gioHangDaThayDoi
                ? startNewIntent(checkoutFingerprint)
                : ensureIntent(checkoutFingerprint);
        } catch (error) {
            if (error instanceof CheckoutIntentStaleError) {
                setGioHangDaThayDoi(true);
                baoLoiDatHang('Thông tin đặt hàng đã thay đổi kể từ lần thử trước. Vui lòng kiểm tra lại rồi bấm đặt hàng lần nữa.');
                return;
            }
            throw error;
        }
        setGioHangDaThayDoi(false);

        dangGuiRef.current = true;
        setDangTao(true);
        try {
            const payload: CheckoutOrderRequest = {
                items: authoritativeCart.map(item => ({ maSach: item.maSach, soLuong: item.soLuong })),
                maDiaChiGiaoHang: diaChiDaChon,
                maHinhThucGiaoHang: hinhThucGiaoHangDaChon,
                phuongThucThanhToan,
                maCoupon: localMutationFinishedAfterRender
                    ? undefined
                    : couponResult?.hopLe ? (couponResult.maCoupon || maCoupon.trim().toUpperCase()) : undefined,
            };
            const data = await createDonHang(payload, intent.key);
            setDonHang(data);
            if (data.maCoupon) {
                setCouponResult({
                    hopLe: true,
                    soTienGiam: data.soTienGiam,
                    tongTienSauGiam: data.tongTien - data.phiVanChuyen,
                    maCoupon: data.maCoupon,
                    thongBao: `Đã áp dụng mã ${data.maCoupon}`,
                });
                setMaCoupon(data.maCoupon);
            } else {
                setCouponResult(null);
            }
            setBuocHienTai('payment');
            // Backend checkout chỉ xóa các dòng sách đã đặt. Với tài khoản,
            // refresh snapshot authoritative thay vì xóa cache mù; CartSession
            // không ghi đè nếu có mutation mới trong lúc refresh chờ response.
            if (localStorage.getItem('jwt')) {
                try {
                    setGioHang(await refreshCartAfterCheckout());
                } catch {
                    setGioHang(readCartForCurrentSession());
                    toast.info('Đơn hàng đã được tạo. Giỏ hàng sẽ được đồng bộ lại ở lần tải tiếp theo.');
                }
            } else if (getCartFingerprint() === cartFingerprintHienTai) {
                clearCart();
                setGioHang([]);
            } else {
                setGioHang(readCart());
                toast.info('Đơn hàng đã được tạo. Giỏ hàng có thay đổi mới nên được giữ lại.');
            }
            clearIntent();
            if (data.phuongThucThanhToan === 'COD') {
                toast.success('Đặt hàng COD thành công');
            } else {
                toast.success('Đơn hàng đã được tạo, tiếp tục thanh toán VNPay');
            }
        } catch (error) {
            if (error instanceof ApiRequestError && error.status === 409) {
                // Same key, materially different request: the server made no
                // mutation. Surface a clear message and drop the poisoned
                // intent so the next explicit submit gets a fresh key instead
                // of retrying forever against the same conflict.
                clearIntent();
                baoLoiDatHang(
                    error.message || 'Yêu cầu đặt hàng bị xung đột với một yêu cầu trước đó. Vui lòng kiểm tra lại giỏ hàng và thử lại.',
                    error.traceId,
                );
            } else {
                const message = error instanceof Error ? error.message : 'Lỗi khi tạo đơn hàng';
                if (message.toLowerCase().includes('đăng nhập')) {
                    toast.error(message);
                    navigate('/dang-nhap');
                    return;
                }
                // Network failure or lost response: no committed order, so
                // the intent is kept and a retry reuses the same key.
                baoLoiDatHang(message, error instanceof ApiRequestError ? error.traceId : undefined);
            }
        } finally {
            dangGuiRef.current = false;
            setDangTao(false);
        }
    };

    const handleVNPay = async () => {
        if (!donHang?.maDonHang) {
            return;
        }
        setDangTaoLinkThanhToan(true);
        try {
            const response = await createVNPayPaymentUrl(donHang.maDonHang);
            window.location.href = response.paymentUrl;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Không thể tạo liên kết thanh toán';
            baoLoiDatHang(message, error instanceof ApiRequestError ? error.traceId : undefined);
        } finally {
            setDangTaoLinkThanhToan(false);
        }
    };

    const ThongBaoLoi = () => (
        <div aria-live="assertive">
            {loiDatHang && (
                <div
                    role="alert"
                    className="alert alert-danger"
                    style={{ marginBottom: '1rem' }}
                >
                    <i className="fas fa-exclamation-circle me-2" aria-hidden="true"></i>
                    {loiDatHang.message}
                    {loiDatHang.traceId && (
                        <div style={{ fontSize: '0.8rem', marginTop: '0.35rem' }}>
                            Mã tra cứu hỗ trợ: <code>{loiDatHang.traceId}</code>
                        </div>
                    )}
                </div>
            )}
        </div>
    );

    const StepIndicator = () => (
        <div className="checkout-steps animate-fade-in">
            <div className={`checkout-step ${buocHienTai === 'review' ? 'active' : 'completed'}`}>
                <span className="checkout-step-number">
                    {buocHienTai === 'payment' ? <i className="fas fa-check"></i> : '1'}
                </span>
                <span className="checkout-step-label">Xem lại đơn hàng</span>
            </div>
            <div className={`checkout-step-line ${buocHienTai === 'payment' ? 'active' : ''}`}></div>
            <div className={`checkout-step ${buocHienTai === 'payment' ? 'active' : ''}`}>
                <span className="checkout-step-number">2</span>
                <span className="checkout-step-label">Thanh toán</span>
            </div>
        </div>
    );

    if (buocHienTai === 'review' && dangTaiGioHang) {
        return (
            <div className="container py-5 text-center" role="status" aria-live="polite">
                <span className="spinner-border text-primary" aria-hidden="true"></span>
                <p className="mt-3" style={{ color: 'var(--color-text-muted)' }}>
                    Đang tải giỏ hàng…
                </p>
            </div>
        );
    }

    if (buocHienTai === 'review' && loiTaiGioHang) {
        return (
            <div className="container py-5">
                <div className="alert alert-danger text-center" role="alert">
                    <i className="fas fa-exclamation-circle me-2" aria-hidden="true"></i>
                    {loiTaiGioHang}
                    <div className="mt-3">
                        <Link to="/gio-hang" className="btn-modern-outline">
                            Quay lại giỏ hàng
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    if (gioHang.length === 0 && buocHienTai === 'review') {
        return (
            <div className="container py-5">
                <div className="empty-state animate-scale-in">
                    <div className="empty-state-icon">
                        <i className="fas fa-shopping-cart"></i>
                    </div>
                    <h5>Giỏ hàng trống</h5>
                    <p>Bạn chưa có sản phẩm nào trong giỏ hàng</p>
                    <Link to="/" className="btn-modern-primary">
                        <i className="fas fa-arrow-left"></i>
                        Tiếp tục mua sắm
                    </Link>
                </div>
            </div>
        );
    }

    if (buocHienTai === 'payment') {
        const laCod = donHang?.phuongThucThanhToan === 'COD';
        return (
            <div className="container py-5">
                <StepIndicator />
                <ThongBaoLoi />
                <div className="row justify-content-center">
                    <div className="col-md-6">
                        <div className="result-card result-card--success">
                            <i className="fas fa-check-circle result-icon"></i>
                            <h3>{laCod ? 'Đặt hàng COD thành công!' : 'Đơn hàng đã sẵn sàng để thanh toán!'}</h3>
                            <p>
                                Mã đơn hàng: <strong style={{ color: 'var(--color-primary)' }}>#{donHang?.maDonHang}</strong>
                                <br />
                                Hình thức giao hàng: <strong>{donHang?.tenHinhThucGiaoHang}</strong>
                                <br />
                                Phí vận chuyển: <strong>{donHang?.phiVanChuyen === 0 ? 'Miễn phí' : `${donHang?.phiVanChuyen?.toLocaleString('vi-VN')}đ`}</strong>
                                <br />
                                Tổng tiền: <strong style={{ color: 'var(--color-accent)' }}>{donHang?.tongTien?.toLocaleString('vi-VN')}đ</strong>
                                <br />
                                Người nhận: <strong>{donHang?.hoTen}</strong>
                                <br />
                                Địa chỉ: <strong>{donHang?.diaChiNhanHang}</strong>
                            </p>
                            <div className="result-card-actions">
                                {laCod ? (
                                    <>
                                        <Link to="/order" className="btn-modern-accent" style={{ textDecoration: 'none' }}>
                                            <i className="fas fa-receipt"></i>
                                            Xem đơn hàng
                                        </Link>
                                        <Link to="/" className="btn-modern-outline" style={{ textDecoration: 'none' }}>
                                            <i className="fas fa-home"></i>
                                            Về trang chủ
                                        </Link>
                                    </>
                                ) : (
                                    <>
                                        <button className="btn-modern-accent" onClick={handleVNPay} style={{ padding: '0.75rem 2rem' }} disabled={dangTaoLinkThanhToan}>
                                            {dangTaoLinkThanhToan ? 'Đang tạo link thanh toán…' : 'Thanh toán VNPAY'}
                                            <i className="fas fa-arrow-right"></i>
                                        </button>
                                        <Link to="/" className="btn-modern-outline" style={{ textDecoration: 'none' }}>
                                            <i className="fas fa-home"></i>
                                            Về trang chủ
                                        </Link>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="container py-5 animate-fade-in">
            <StepIndicator />
            <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.5rem', marginBottom: '1.5rem' }}>
                <i className="fas fa-clipboard-check me-2" style={{ color: 'var(--color-primary)' }} aria-hidden="true"></i>
                Xác nhận đơn hàng
            </h1>
            <ThongBaoLoi />
            <div className="row">
                <div className="col-md-8">
                    <CartItemsTable
                        gioHang={gioHang}
                        onIncrease={handleIncrease}
                        onDecrease={handleDecrease}
                        onChangeQty={handleChangeQty}
                        onRemove={handleRemove}
                        pendingBookId={maSachDangCapNhat}
                    />
                </div>
                <CheckoutSidebar
                    danhSachDiaChi={danhSachDiaChi}
                    diaChiDaChon={diaChiDaChon}
                    onChonDiaChi={setDiaChiDaChon}
                    phuongThucThanhToan={phuongThucThanhToan}
                    onChonPhuongThucThanhToan={setPhuongThucThanhToan}
                    danhSachHinhThucGiaoHang={danhSachHinhThucGiaoHang}
                    hinhThucGiaoHangDaChon={hinhThucGiaoHangDaChon}
                    onChonHinhThucGiaoHang={setHinhThucGiaoHangDaChon}
                    dangTaiHinhThucGiaoHang={dangTaiHinhThucGiaoHang}
                    loiHinhThucGiaoHang={loiHinhThucGiaoHang}
                    onTaiLaiHinhThucGiaoHang={() => { void taiHinhThucGiaoHang(); }}
                    maCoupon={maCoupon}
                    onChangeCoupon={val => { setMaCoupon(val); invalidateCoupon(); }}
                    onApCoupon={handleApCoupon}
                    couponResult={couponResult}
                    tongTienGoc={tongTienGoc}
                    soTienGiam={soTienGiam}
                    phiVanChuyen={phiVanChuyen}
                    tongThanhToan={tongThanhToan}
                    dangTao={dangTao}
                    onDatHang={handleDatHang}
                />
            </div>
        </div>
    );
}

export default ThanhToan;
