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

    // Cart mutation helpers — keep localStorage in sync
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

    // Empty cart
    if (gioHang.length === 0 && buocHienTai === 'review') {
        return (
            <div className="container py-5 text-center">
                <i className="fas fa-shopping-cart fa-3x text-muted mb-3"></i>
                <h5 className="text-muted">Giỏ hàng trống</h5>
                <Link to="/" className="btn bg-dark text-white mt-3">Tiếp tục mua sắm</Link>
            </div>
        );
    }

    // Step 2: Payment confirmation
    if (buocHienTai === 'payment') {
        return (
            <div className="container py-5">
                <div className="row justify-content-center">
                    <div className="col-md-6 text-center">
                        <div className="card shadow-sm p-4">
                            <i className="fas fa-check-circle fa-4x text-success mb-3"></i>
                            <h4>Đặt hàng thành công!</h4>
                            <p className="text-muted">Mã đơn hàng: <strong>#{donHang?.maDonHang}</strong></p>
                            <p>Tổng tiền: <span className="text-primary fw-bold">{donHang?.tongTien?.toLocaleString()}đ</span></p>
                            <button className="btn btn-dark btn-lg mt-3" onClick={handleVNPay}>
                                Thanh toán VNPAY <i className="fas fa-arrow-right ms-2"></i>
                            </button>
                            <Link to="/" className="btn btn-outline-secondary mt-2">Về trang chủ</Link>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Step 1: Review order
    return (
        <div className="container py-5">
            <h4 className="mb-4">Xác nhận đơn hàng</h4>
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
