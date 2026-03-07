import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getOneImageOfOneBook } from '../../api/HinhAnhApi';
import { getDanhSachDiaChi } from '../../api/DiaChiApi';
import { kiemTraCoupon } from '../../api/CouponApi';
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

function ThanhToan() {
    const [gioHang, setGioHang] = useState<SanPhamGioHang[]>([]);
    const [donHang, setDonHang] = useState<any>();
    const [danhSachDiaChi, setDanhSachDiaChi] = useState<DiaChiModel[]>([]);
    const [diaChiDaChon, setDiaChiDaChon] = useState<number | null>(null);
    const [maCoupon, setMaCoupon] = useState('');
    const [couponResult, setCouponResult] = useState<KetQuaKiemTraCoupon | null>(null);
    const [dangTao, setDangTao] = useState(false);
    const [buocHienTai, setBuocHienTai] = useState<'review' | 'payment'>('review');
    const navigate = useNavigate();

    useEffect(() => {
        const loadGioHangWithImages = async () => {
            const raw = localStorage.getItem('gioHang');
            if (!raw) return;
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
                if (list.length > 0) setDiaChiDaChon(list[0].maDiaChi!);
            })
            .catch(console.error);
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
    const tongThanhToan = tongTienGoc - soTienGiam;

    const handleApCoupon = async () => {
        if (!maCoupon.trim()) return;
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
        setDangTao(true);
        try {
            const orderItems = gioHang.map(item => ({ maSach: item.maSach, soLuong: item.soLuong }));
            const response = await fetch('http://localhost:8080/api/don-hang/them', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('jwt')}`,
                },
                body: JSON.stringify(orderItems),
            });
            if (response.status === 401) {
                toast.error('Phiên đăng nhập hết hạn');
                navigate('/dang-nhap');
                return;
            }
            const data = await response.json();
            setDonHang(data);
            setBuocHienTai('payment');
            localStorage.removeItem('gioHang');
            window.dispatchEvent(new Event('cartUpdated'));
        } catch {
            toast.error('Lỗi khi tạo đơn hàng');
        } finally {
            setDangTao(false);
        }
    };

    const handleVNPay = () => {
        fetch(`http://localhost:8080/api/don-hang/submitOrder?amount=${donHang.tongTien}&orderInfo=${donHang.maDonHang}`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('jwt')}` },
        })
            .then(res => res.text())
            .then(url => { window.location.href = url; })
            .catch(err => console.error('Lỗi VNPay:', err));
    };

    // Step indicator
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

    // Empty cart
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

    // Step 2: Payment confirmation
    if (buocHienTai === 'payment') {
        return (
            <div className="container py-5">
                <StepIndicator />
                <div className="row justify-content-center">
                    <div className="col-md-6">
                        <div className="result-card result-card--success">
                            <i className="fas fa-check-circle result-icon"></i>
                            <h3>Đặt hàng thành công!</h3>
                            <p>
                                Mã đơn hàng: <strong style={{ color: 'var(--color-primary)' }}>#{donHang?.maDonHang}</strong>
                                <br />
                                Tổng tiền: <strong style={{ color: 'var(--color-accent)' }}>{donHang?.tongTien?.toLocaleString('vi-VN')}đ</strong>
                            </p>
                            <div className="result-card-actions">
                                <button className="btn-modern-accent" onClick={handleVNPay} style={{ padding: '0.75rem 2rem' }}>
                                    Thanh toán VNPAY
                                    <i className="fas fa-arrow-right"></i>
                                </button>
                                <Link to="/" className="btn-modern-outline" style={{ textDecoration: 'none' }}>
                                    <i className="fas fa-home"></i>
                                    Về trang chủ
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Step 1: Review order
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
