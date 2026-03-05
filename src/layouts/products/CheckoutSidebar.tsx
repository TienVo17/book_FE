import React from 'react';
import { Link } from 'react-router-dom';
import { DiaChiModel } from '../../models/DiaChiModel';
import { KetQuaKiemTraCoupon } from '../../models/CouponModel';

interface Props {
    danhSachDiaChi: DiaChiModel[];
    diaChiDaChon: number | null;
    onChonDiaChi: (id: number) => void;
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
    danhSachDiaChi, diaChiDaChon, onChonDiaChi,
    maCoupon, onChangeCoupon, onApCoupon, couponResult,
    tongTienGoc, soTienGiam, tongThanhToan,
    dangTao, onDatHang,
}) => (
    <div className="col-md-4">
        {/* Address selector */}
        <div className="card shadow-sm mb-3">
            <div className="card-header bg-dark text-white">
                <h6 className="mb-0"><i className="fas fa-map-marker-alt me-2"></i>Địa chỉ giao hàng</h6>
            </div>
            <div className="card-body">
                {danhSachDiaChi.length === 0 ? (
                    <p className="text-muted small mb-0">
                        Chưa có địa chỉ. <Link to="/dia-chi">Thêm địa chỉ</Link>
                    </p>
                ) : (
                    danhSachDiaChi.map(dc => (
                        <div key={dc.maDiaChi} className="form-check mb-2">
                            <input
                                className="form-check-input"
                                type="radio"
                                name="diaChi"
                                id={`dc-${dc.maDiaChi}`}
                                checked={diaChiDaChon === dc.maDiaChi}
                                onChange={() => onChonDiaChi(dc.maDiaChi!)}
                            />
                            <label className="form-check-label small" htmlFor={`dc-${dc.maDiaChi}`}>
                                <strong>{dc.hoTen}</strong> — {dc.soDienThoai}<br />
                                <span className="text-muted">{dc.diaChiDayDu}</span>
                            </label>
                        </div>
                    ))
                )}
            </div>
        </div>

        {/* Coupon input */}
        <div className="card shadow-sm mb-3">
            <div className="card-header bg-dark text-white">
                <h6 className="mb-0"><i className="fas fa-ticket-alt me-2"></i>Mã giảm giá</h6>
            </div>
            <div className="card-body">
                <div className="input-group">
                    <input
                        type="text"
                        className="form-control"
                        placeholder="Nhập mã coupon"
                        value={maCoupon}
                        onChange={e => onChangeCoupon(e.target.value)}
                    />
                    <button className="btn btn-outline-dark" onClick={onApCoupon}>Áp dụng</button>
                </div>
                {couponResult && (
                    <small className={`mt-1 d-block ${couponResult.hopLe ? 'text-success' : 'text-danger'}`}>
                        {couponResult.thongBao}
                    </small>
                )}
            </div>
        </div>

        {/* Order total + confirm button */}
        <div className="card shadow-sm">
            <div className="card-body">
                <div className="d-flex justify-content-between mb-2">
                    <span>Tạm tính:</span>
                    <span>{tongTienGoc.toLocaleString()}đ</span>
                </div>
                {soTienGiam > 0 && (
                    <div className="d-flex justify-content-between mb-2 text-success">
                        <span>Giảm giá:</span>
                        <span>-{soTienGiam.toLocaleString()}đ</span>
                    </div>
                )}
                <hr />
                <div className="d-flex justify-content-between fw-bold h5">
                    <span>Tổng cộng:</span>
                    <span className="text-primary">{tongThanhToan.toLocaleString()}đ</span>
                </div>
                <button
                    className="btn btn-dark w-100 mt-3"
                    onClick={onDatHang}
                    disabled={dangTao}
                >
                    {dangTao ? (
                        <><span className="spinner-border spinner-border-sm me-2"></span>Đang xử lý...</>
                    ) : (
                        <><i className="fas fa-check me-2"></i>Xác nhận đặt hàng</>
                    )}
                </button>
            </div>
        </div>
    </div>
);

export default CheckoutSidebar;
