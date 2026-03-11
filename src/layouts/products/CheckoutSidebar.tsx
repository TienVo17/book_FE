import React from 'react';
import { Link } from 'react-router-dom';
import { DiaChiModel } from '../../models/DiaChiModel';
import { KetQuaKiemTraCoupon } from '../../models/CouponModel';

interface Props {
    danhSachDiaChi: DiaChiModel[];
    diaChiDaChon: number | null;
    onChonDiaChi: (id: number) => void;
    phuongThucThanhToan: 'COD' | 'VNPAY';
    onChonPhuongThucThanhToan: (value: 'COD' | 'VNPAY') => void;
    maCoupon: string;
    onChangeCoupon: (val: string) => void;
    onApCoupon: () => void;
    couponResult: KetQuaKiemTraCoupon | null;
    tongTienGoc: number;
    soTienGiam: number;
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
    maCoupon,
    onChangeCoupon,
    onApCoupon,
    couponResult,
    tongTienGoc,
    soTienGiam,
    tongThanhToan,
    dangTao,
    onDatHang,
}) => (
    <div className="col-md-4">
        <div className="checkout-card animate-slide-in-right">
            <div className="checkout-card-header">
                <h6><i className="fas fa-map-marker-alt me-2"></i>Địa chỉ giao hàng</h6>
            </div>
            <div className="checkout-card-body">
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
                    <small style={{ color: 'var(--color-danger)', display: 'block', marginTop: '8px' }}>
                        Vui lòng chọn một địa chỉ giao hàng.
                    </small>
                )}
            </div>
        </div>

        <div className="checkout-card animate-slide-in-right" style={{ animationDelay: '50ms' }}>
            <div className="checkout-card-header">
                <h6><i className="fas fa-wallet me-2"></i>Phương thức thanh toán</h6>
            </div>
            <div className="checkout-card-body">
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

        <div className="checkout-card animate-slide-in-right" style={{ animationDelay: '100ms' }}>
            <div className="checkout-card-header">
                <h6><i className="fas fa-ticket-alt me-2"></i>Mã giảm giá</h6>
            </div>
            <div className="checkout-card-body">
                <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                        type="text"
                        placeholder="Nhập mã coupon…"
                        value={maCoupon}
                        onChange={e => onChangeCoupon(e.target.value)}
                        autoComplete="off"
                        spellCheck={false}
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
                {couponResult && (
                    <small
                        style={{
                            marginTop: '6px',
                            display: 'block',
                            color: couponResult.hopLe ? 'var(--color-success)' : 'var(--color-danger)',
                            fontSize: '0.82rem',
                        }}
                    >
                        <i className={`fas fa-${couponResult.hopLe ? 'check-circle' : 'exclamation-circle'} me-1`}></i>
                        {couponResult.thongBao}
                    </small>
                )}
            </div>
        </div>

        <div className="cart-summary animate-slide-in-right" style={{ animationDelay: '200ms' }}>
            <h5 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, marginBottom: '1.2rem' }}>
                Tóm tắt đơn hàng
            </h5>
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
                <span style={{ color: 'var(--color-success)' }}>Miễn phí</span>
            </div>
            <hr style={{ borderColor: 'var(--color-border)', opacity: 0.5 }} />
            <div className="d-flex justify-content-between mb-2">
                <strong>Tổng backend:</strong>
                <span className="detail-price" style={{ fontSize: '1.1rem', fontVariantNumeric: 'tabular-nums' }}>
                    {tongThanhToan.toLocaleString('vi-VN')}đ
                </span>
            </div>
            {soTienGiam > 0 && (
                <small style={{ color: 'var(--color-text-muted)', display: 'block', marginBottom: '1rem' }}>
                    Coupon chỉ hiển thị tạm ở UI. Backend vẫn chốt tiền cuối cùng.
                </small>
            )}
            <button
                className="btn-modern-accent w-100"
                style={{ padding: '0.75rem', justifyContent: 'center' }}
                onClick={onDatHang}
                disabled={dangTao || danhSachDiaChi.length === 0 || diaChiDaChon === null}
            >
                {dangTao ? (
                    <><span className="spinner-border spinner-border-sm me-2"></span>Đang xử lý…</>
                ) : (
                    <><i className="fas fa-check me-2"></i>{phuongThucThanhToan === 'COD' ? 'Đặt hàng COD' : 'Tạo đơn & thanh toán'}</>
                )}
            </button>
        </div>
    </div>
);

export default CheckoutSidebar;
