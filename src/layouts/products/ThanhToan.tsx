import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getOneImageOfOneBook } from '../../api/HinhAnhApi';
import { getDanhSachDiaChi } from '../../api/DiaChiApi';
import { kiemTraCoupon } from '../../api/CouponApi';
import { authRequest } from '../../api/Request';
import { DiaChiModel } from '../../models/DiaChiModel';
import { KetQuaKiemTraCoupon } from '../../models/CouponModel';
import CartItemsTable from './CartItemsTable';
import CheckoutSidebar from './CheckoutSidebar';

interface SanPhamGioHang {
    maSach: number;
    sachDto: { tenSach: string; giaBan: number; hinhAnh: string };
    soLuong: number;
    hinhAnh?: string;
}

interface CheckoutOrderItem {
    maSach: number;
    soLuong: number;
}

interface CheckoutOrderRequest {
    items: CheckoutOrderItem[];
    maDiaChiGiaoHang: number;
    phuongThucThanhToan: 'COD' | 'VNPAY';
}

interface CheckoutOrderResponse {
    maDonHang: number;
    tongTien: number;
    phuongThucThanhToan: 'COD' | 'VNPAY';
    trangThaiThanhToan: number;
    hoTen: string;
    soDienThoai: string;
    diaChiNhanHang: string;
}

interface VNPayUrlResponse {
    paymentUrl: string;
}

function ThanhToan() {
    const [gioHang, setGioHang] = useState<SanPhamGioHang[]>([]);
    const [donHang, setDonHang] = useState<CheckoutOrderResponse | null>(null);
    const [danhSachDiaChi, setDanhSachDiaChi] = useState<DiaChiModel[]>([]);
    const [diaChiDaChon, setDiaChiDaChon] = useState<number | null>(null);
    const [phuongThucThanhToan, setPhuongThucThanhToan] = useState<'COD' | 'VNPAY'>('COD');
    const [maCoupon, setMaCoupon] = useState('');
    const [couponResult, setCouponResult] = useState<KetQuaKiemTraCoupon | null>(null);
    const [dangTao, setDangTao] = useState(false);
    const [dangTaoLinkThanhToan, setDangTaoLinkThanhToan] = useState(false);
    const [buocHienTai, setBuocHienTai] = useState<'review' | 'payment'>('review');
    const navigate = useNavigate();

    useEffect(() => {
        const loadGioHangWithImages = async () => {
            const raw = localStorage.getItem('gioHang');
            if (!raw) {
                return;
            }
            const parsed: SanPhamGioHang[] = JSON.parse(raw);
            const withImages = await Promise.all(
                parsed.map(async item => {
                    try {
                        const imgs = await getOneImageOfOneBook(item.maSach);
                        return { ...item, hinhAnh: imgs[0]?.urlHinh || '' };
                    } catch {
                        return item;
                    }
                })
            );
            setGioHang(withImages);
        };

        loadGioHangWithImages();
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
    }, []);

    const updateGioHang = (updated: SanPhamGioHang[]) => {
        setGioHang(updated);
        localStorage.setItem('gioHang', JSON.stringify(updated));
    };

    const handleIncrease = (maSach: number) =>
        updateGioHang(gioHang.map(sp => sp.maSach === maSach ? { ...sp, soLuong: sp.soLuong + 1 } : sp));

    const handleDecrease = (maSach: number) =>
        updateGioHang(gioHang.map(sp =>
            sp.maSach === maSach && sp.soLuong > 1 ? { ...sp, soLuong: sp.soLuong - 1 } : sp
        ));

    const handleChangeQty = (maSach: number, qty: number) =>
        updateGioHang(gioHang.map(sp => sp.maSach === maSach ? { ...sp, soLuong: qty } : sp));

    const handleRemove = (maSach: number) => {
        const updated = gioHang.filter(sp => sp.maSach !== maSach);
        updateGioHang(updated);
        window.dispatchEvent(new Event('storage'));
    };

    const tongTienGoc = gioHang.reduce((t, item) => t + item.sachDto.giaBan * item.soLuong, 0);
    const soTienGiam = couponResult?.hopLe ? couponResult.soTienGiam : 0;
    const tongThanhToan = donHang?.tongTien ?? (tongTienGoc - soTienGiam);

    const handleApCoupon = async () => {
        if (!maCoupon.trim()) {
            return;
        }
        try {
            const result = await kiemTraCoupon(maCoupon, tongTienGoc);
            setCouponResult(result);
            if (result.hopLe) {
                toast.success(`Giảm ${result.soTienGiam.toLocaleString()}đ`);
            } else {
                toast.error(result.thongBao);
            }
        } catch {
            toast.error('Không thể kiểm tra coupon');
        }
    };

    const handleDatHang = async () => {
        if (!diaChiDaChon) {
            toast.error('Vui lòng chọn địa chỉ giao hàng');
            return;
        }
        if (gioHang.length === 0) {
            toast.error('Giỏ hàng trống');
            return;
        }

        setDangTao(true);
        try {
            const payload: CheckoutOrderRequest = {
                items: gioHang.map(item => ({ maSach: item.maSach, soLuong: item.soLuong })),
                maDiaChiGiaoHang: diaChiDaChon,
                phuongThucThanhToan,
            };
            const data = await authRequest<CheckoutOrderResponse>('http://localhost:8080/api/don-hang/them', {
                method: 'POST',
                body: JSON.stringify(payload),
            });
            setDonHang(data);
            setBuocHienTai('payment');
            localStorage.removeItem('gioHang');
            setGioHang([]);
            window.dispatchEvent(new Event('storage'));
            window.dispatchEvent(new Event('cartUpdated'));
            if (data.phuongThucThanhToan === 'COD') {
                toast.success('Đặt hàng COD thành công');
            } else {
                toast.success('Đơn hàng đã được tạo, tiếp tục thanh toán VNPay');
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Lỗi khi tạo đơn hàng';
            if (message.toLowerCase().includes('đăng nhập')) {
                toast.error(message);
                navigate('/dang-nhap');
                return;
            }
            toast.error(message);
        } finally {
            setDangTao(false);
        }
    };

    const handleVNPay = async () => {
        if (!donHang?.maDonHang) {
            return;
        }
        setDangTaoLinkThanhToan(true);
        try {
            const response = await authRequest<VNPayUrlResponse>(`http://localhost:8080/api/don-hang/submitOrder?maDonHang=${donHang.maDonHang}`);
            window.location.href = response.paymentUrl;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Không thể tạo liên kết thanh toán';
            toast.error(message);
        } finally {
            setDangTaoLinkThanhToan(false);
        }
    };

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
                <div className="row justify-content-center">
                    <div className="col-md-6">
                        <div className="result-card result-card--success">
                            <i className="fas fa-check-circle result-icon"></i>
                            <h3>{laCod ? 'Đặt hàng COD thành công!' : 'Đơn hàng đã sẵn sàng để thanh toán!'}</h3>
                            <p>
                                Mã đơn hàng: <strong style={{ color: 'var(--color-primary)' }}>#{donHang?.maDonHang}</strong>
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
            <h4 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, marginBottom: '1.5rem' }}>
                <i className="fas fa-clipboard-check me-2" style={{ color: 'var(--color-primary)' }}></i>
                Xác nhận đơn hàng
            </h4>
            <div className="row">
                <div className="col-md-8">
                    <CartItemsTable
                        gioHang={gioHang}
                        onIncrease={handleIncrease}
                        onDecrease={handleDecrease}
                        onChangeQty={handleChangeQty}
                        onRemove={handleRemove}
                    />
                </div>
                <CheckoutSidebar
                    danhSachDiaChi={danhSachDiaChi}
                    diaChiDaChon={diaChiDaChon}
                    onChonDiaChi={setDiaChiDaChon}
                    phuongThucThanhToan={phuongThucThanhToan}
                    onChonPhuongThucThanhToan={setPhuongThucThanhToan}
                    maCoupon={maCoupon}
                    onChangeCoupon={val => { setMaCoupon(val); setCouponResult(null); }}
                    onApCoupon={handleApCoupon}
                    couponResult={couponResult}
                    tongTienGoc={tongTienGoc}
                    soTienGiam={soTienGiam}
                    tongThanhToan={tongThanhToan}
                    dangTao={dangTao}
                    onDatHang={handleDatHang}
                />
            </div>
        </div>
    );
}

export default ThanhToan;
