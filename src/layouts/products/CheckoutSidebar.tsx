import React from 'react';
import { Link } from 'react-router-dom';
import { DiaChiModel } from '../../models/DiaChiModel';
import { KetQuaKiemTraCoupon } from '../../models/CouponModel';
import { HinhThucGiaoHangResponse } from '../../api/DonHangApi';

interface Props {
    danhSachDiaChi: DiaChiModel[];
    diaChiDaChon: number | null;
    onChonDiaChi: (id: number) => void;
    phuongThucThanhToan: 'COD' | 'VNPAY';
    onChonPhuongThucThanhToan: (value: 'COD' | 'VNPAY') => void;
    danhSachHinhThucGiaoHang: HinhThucGiaoHangResponse[];
    hinhThucGiaoHangDaChon: number | null;
    onChonHinhThucGiaoHang: (id: number) => void;
    dangTaiHinhThucGiaoHang: boolean;
    loiHinhThucGiaoHang: string | null;
    onTaiLaiHinhThucGiaoHang: () => void;
    maCoupon: string;
    onChangeCoupon: (val: string) => void;
    onApCoupon: () => void;
    couponResult: KetQuaKiemTraCoupon | null;
    tongTienGoc: number;
    soTienGiam: number;
    phiVanChuyen: number;
    tongThanhToan: number;
    dangTao: boolean;
    onDatHang: () => void;
}

const CheckoutSidebar: React.FC<Props> = ({
    danhSachDiaChi,
    diaChiDaChon,
    onChonDiaChi,
    phuongThucThanhToan,
    onChonPhuongThucThanhToan,
    danhSachHinhThucGiaoHang,
    hinhThucGiaoHangDaChon,
    onChonHinhThucGiaoHang,
    dangTaiHinhThucGiaoHang,
    loiHinhThucGiaoHang,
    onTaiLaiHinhThucGiaoHang,
    maCoupon,
    onChangeCoupon,
    onApCoupon,
    couponResult,
    tongTienGoc,
    soTienGiam,
    phiVanChuyen,
    tongThanhToan,
    dangTao,
    onDatHang,
}) => (
    <div className="col-md-4">
        <div className="checkout-card animate-slide-in-right">
            <div className="checkout-card-header">
                <h2 className="checkout-card-title" id="checkout-address-heading">
                    <i className="fas fa-map-marker-alt me-2" aria-hidden="true"></i>Địa chỉ giao hàng
                </h2>
            </div>
            <div className="checkout-card-body" role="radiogroup" aria-labelledby="checkout-address-heading">
                {danhSachDiaChi.length === 0 ? (
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.88rem', marginBottom: 0 }}>
                        Chưa có địa chỉ. <Link to="/dia-chi">Thêm địa chỉ</Link>
                    </p>
                ) : (
                    danhSachDiaChi.map(dc => (
                        <div
                            key={dc.maDiaChi}
                            className={`address-radio${diaChiDaChon === dc.maDiaChi ? ' selected' : ''}`}
                            onClick={() => onChonDiaChi(dc.maDiaChi!)}
                        >
                            <input
                                type="radio"
                                name="diaChi"
                                id={`dc-${dc.maDiaChi}`}
                                checked={diaChiDaChon === dc.maDiaChi}
                                onChange={() => onChonDiaChi(dc.maDiaChi!)}
                                style={{ marginTop: '3px', accentColor: 'var(--color-primary)' }}
                            />
                            <label htmlFor={`dc-${dc.maDiaChi}`} style={{ cursor: 'pointer', margin: 0 }}>
                                <strong style={{ fontSize: '0.9rem' }}>{dc.hoTen}</strong>
                                <span style={{ color: 'var(--color-text-secondary)', marginLeft: '8px', fontSize: '0.85rem' }}>
                                    {dc.soDienThoai}
                                </span>
                                <br />
                                <span style={{ color: 'var(--color-text-muted)', fontSize: '0.82rem' }}>
                                    {dc.diaChiDayDu}
                                </span>
                            </label>
                        </div>
                    ))
                )}
                {danhSachDiaChi.length > 0 && diaChiDaChon === null && (
                    <small role="alert" style={{ color: 'var(--color-danger)', display: 'block', marginTop: '8px' }}>
                        Vui lòng chọn một địa chỉ giao hàng.
                    </small>
                )}
            </div>
        </div>

        <div className="checkout-card animate-slide-in-right" style={{ animationDelay: '50ms' }}>
            <div className="checkout-card-header">
                <h2 className="checkout-card-title" id="checkout-delivery-heading">
                    <i className="fas fa-truck me-2" aria-hidden="true"></i>Hình thức giao hàng
                </h2>
            </div>
            <div className="checkout-card-body" role="radiogroup" aria-labelledby="checkout-delivery-heading">
                {dangTaiHinhThucGiaoHang ? (
                    <p role="status" style={{ color: 'var(--color-text-muted)', marginBottom: 0 }}>
                        Đang tải hình thức giao hàng…
                    </p>
                ) : loiHinhThucGiaoHang ? (
                    <div role="alert" aria-label="Lỗi hình thức giao hàng">
                        <p style={{ color: 'var(--color-danger)', marginBottom: '0.5rem' }}>
                            {loiHinhThucGiaoHang}
                        </p>
                        <button type="button" className="btn-modern-outline" onClick={onTaiLaiHinhThucGiaoHang}>
                            Thử tải lại
                        </button>
                    </div>
                ) : (
                    danhSachHinhThucGiaoHang.map(hinhThuc => (
                        <div
                            key={hinhThuc.maHinhThucGiaoHang}
                            className={`address-radio${hinhThucGiaoHangDaChon === hinhThuc.maHinhThucGiaoHang ? ' selected' : ''}`}
                            onClick={() => onChonHinhThucGiaoHang(hinhThuc.maHinhThucGiaoHang)}
                        >
                            <input
                                type="radio"
                                name="hinhThucGiaoHang"
                                id={`delivery-${hinhThuc.maHinhThucGiaoHang}`}
                                checked={hinhThucGiaoHangDaChon === hinhThuc.maHinhThucGiaoHang}
                                onChange={() => onChonHinhThucGiaoHang(hinhThuc.maHinhThucGiaoHang)}
                                style={{ marginTop: '3px', accentColor: 'var(--color-primary)' }}
                            />
                            <label htmlFor={`delivery-${hinhThuc.maHinhThucGiaoHang}`} style={{ cursor: 'pointer', margin: 0, flex: 1 }}>
                                <span style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem' }}>
                                    <strong style={{ fontSize: '0.9rem' }}>{hinhThuc.tenHinhThucGiaoHang}</strong>
                                    <strong style={{ color: hinhThuc.chiPhiGiaoHang === 0 ? 'var(--color-success)' : 'var(--color-primary)', whiteSpace: 'nowrap' }}>
                                        {hinhThuc.chiPhiGiaoHang === 0
                                            ? 'Miễn phí'
                                            : `${hinhThuc.chiPhiGiaoHang.toLocaleString('vi-VN')}đ`}
                                    </strong>
                                </span>
                                {hinhThuc.moTa && (
                                    <span style={{ color: 'var(--color-text-muted)', fontSize: '0.82rem' }}>
                                        {hinhThuc.moTa}
                                    </span>
                                )}
                            </label>
                        </div>
                    ))
                )}
            </div>
        </div>

        <div className="checkout-card animate-slide-in-right" style={{ animationDelay: '100ms' }}>
            <div className="checkout-card-header">
                <h2 className="checkout-card-title" id="checkout-payment-heading">
                    <i className="fas fa-wallet me-2" aria-hidden="true"></i>Phương thức thanh toán
                </h2>
            </div>
            <div className="checkout-card-body" role="radiogroup" aria-labelledby="checkout-payment-heading">
                <div
                    className={`address-radio${phuongThucThanhToan === 'COD' ? ' selected' : ''}`}
                    onClick={() => onChonPhuongThucThanhToan('COD')}
                >
                    <input
                        type="radio"
                        name="phuongThucThanhToan"
                        id="payment-cod"
                        checked={phuongThucThanhToan === 'COD'}
                        onChange={() => onChonPhuongThucThanhToan('COD')}
                        style={{ marginTop: '3px', accentColor: 'var(--color-primary)' }}
                    />
                    <label htmlFor="payment-cod" style={{ cursor: 'pointer', margin: 0 }}>
                        <strong style={{ fontSize: '0.9rem' }}>Thanh toán khi nhận hàng</strong>
                        <br />
                        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.82rem' }}>
                            Xác nhận đơn xong là hoàn tất.
                        </span>
                    </label>
                </div>
                <div
                    className={`address-radio${phuongThucThanhToan === 'VNPAY' ? ' selected' : ''}`}
                    onClick={() => onChonPhuongThucThanhToan('VNPAY')}
                >
                    <input
                        type="radio"
                        name="phuongThucThanhToan"
                        id="payment-vnpay"
                        checked={phuongThucThanhToan === 'VNPAY'}
                        onChange={() => onChonPhuongThucThanhToan('VNPAY')}
                        style={{ marginTop: '3px', accentColor: 'var(--color-primary)' }}
                    />
                    <label htmlFor="payment-vnpay" style={{ cursor: 'pointer', margin: 0 }}>
                        <strong style={{ fontSize: '0.9rem' }}>Thanh toán VNPAY</strong>
                        <br />
                        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.82rem' }}>
                            Tạo đơn trước, thanh toán online sau.
                        </span>
                    </label>
                </div>
            </div>
        </div>

        <div className="checkout-card animate-slide-in-right" style={{ animationDelay: '150ms' }}>
            <div className="checkout-card-header">
                <h2 className="checkout-card-title"><i className="fas fa-ticket-alt me-2" aria-hidden="true"></i>Mã giảm giá</h2>
            </div>
            <div className="checkout-card-body">
                <div style={{ display: 'flex', gap: '8px' }}>
                    <label htmlFor="checkout-coupon" className="visually-hidden">Mã giảm giá</label>
                    <input
                        id="checkout-coupon"
                        type="text"
                        placeholder="Nhập mã coupon…"
                        value={maCoupon}
                        onChange={e => onChangeCoupon(e.target.value)}
                        autoComplete="off"
                        spellCheck={false}
                        aria-describedby="checkout-coupon-feedback"
                        style={{
                            flex: 1,
                            padding: '0.5rem 0.75rem',
                            border: '1.5px solid var(--color-border)',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '0.88rem',
                            transition: 'border-color 150ms ease',
                            outline: 'none',
                        }}
                        onFocus={e => e.target.style.borderColor = 'var(--color-primary)'}
                        onBlur={e => e.target.style.borderColor = 'var(--color-border)'}
                    />
                    <button className="btn-modern-primary" onClick={onApCoupon} style={{ padding: '0.5rem 1rem', whiteSpace: 'nowrap' }}>
                        Áp dụng
                    </button>
                </div>
                <div id="checkout-coupon-feedback">
                    {couponResult && (
                        <small
                            role={couponResult.hopLe ? 'status' : 'alert'}
                            style={{
                                marginTop: '6px',
                                display: 'block',
                                color: couponResult.hopLe ? 'var(--color-success)' : 'var(--color-danger)',
                                fontSize: '0.82rem',
                            }}
                        >
                            <i
                                className={`fas fa-${couponResult.hopLe ? 'check-circle' : 'exclamation-circle'} me-1`}
                                aria-hidden="true"
                            ></i>
                            {couponResult.thongBao}
                        </small>
                    )}
                </div>
            </div>
        </div>

        <div className="cart-summary animate-slide-in-right" style={{ animationDelay: '250ms' }}>
            <h2 className="checkout-card-title" style={{ fontWeight: 700, fontSize: '1.05rem', marginBottom: '1.2rem' }}>
                Tóm tắt đơn hàng
            </h2>
            <div className="d-flex justify-content-between mb-2" style={{ fontSize: '0.93rem' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Tạm tính:</span>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>{tongTienGoc.toLocaleString('vi-VN')}đ</span>
            </div>
            {soTienGiam > 0 && (
                <div className="d-flex justify-content-between mb-2" style={{ fontSize: '0.93rem' }}>
                    <span style={{ color: 'var(--color-success)' }}>Giảm giá:</span>
                    <span style={{ color: 'var(--color-success)', fontVariantNumeric: 'tabular-nums' }}>
                        -{soTienGiam.toLocaleString('vi-VN')}đ
                    </span>
                </div>
            )}
            <div className="d-flex justify-content-between mb-2" style={{ fontSize: '0.93rem' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Phí vận chuyển:</span>
                <span
                    style={{
                        color: phiVanChuyen === 0 ? 'var(--color-success)' : 'var(--color-text-primary)',
                        fontVariantNumeric: 'tabular-nums',
                    }}
                >
                    {hinhThucGiaoHangDaChon === null
                        ? 'Chưa chọn'
                        : phiVanChuyen === 0
                            ? 'Miễn phí'
                            : `${phiVanChuyen.toLocaleString('vi-VN')}đ`}
                </span>
            </div>
            <hr style={{ borderColor: 'var(--color-border)', opacity: 0.5 }} />
            <div className="d-flex justify-content-between mb-2">
                <strong>{hinhThucGiaoHangDaChon === null ? 'Tổng tạm tính:' : 'Tổng thanh toán:'}</strong>
                <span className="detail-price" style={{ fontSize: '1.1rem', fontVariantNumeric: 'tabular-nums' }}>
                    {tongThanhToan.toLocaleString('vi-VN')}đ
                </span>
            </div>
            {hinhThucGiaoHangDaChon === null && !dangTaiHinhThucGiaoHang && !loiHinhThucGiaoHang && (
                <small role="status" style={{ color: 'var(--color-text-muted)', display: 'block', marginBottom: '1rem' }}>
                    Chọn hình thức giao hàng để xem tổng thanh toán chính xác.
                </small>
            )}
            {soTienGiam > 0 && (
                <small style={{ color: 'var(--color-text-muted)', display: 'block', marginBottom: '1rem' }}>
                    Backend sẽ kiểm tra lại coupon khi tạo đơn.
                </small>
            )}
            <button
                type="button"
                className="btn-modern-accent w-100"
                style={{ padding: '0.75rem', justifyContent: 'center' }}
                onClick={onDatHang}
                disabled={
                    dangTao ||
                    danhSachDiaChi.length === 0 ||
                    diaChiDaChon === null ||
                    dangTaiHinhThucGiaoHang ||
                    loiHinhThucGiaoHang !== null ||
                    hinhThucGiaoHangDaChon === null
                }
                aria-busy={dangTao}
            >
                {dangTao ? (
                    <><span className="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Đang xử lý…</>
                ) : (
                    <><i className="fas fa-check me-2" aria-hidden="true"></i>{phuongThucThanhToan === 'COD' ? 'Đặt hàng COD' : 'Tạo đơn & thanh toán'}</>
                )}
            </button>
        </div>
    </div>
);

export default CheckoutSidebar;
