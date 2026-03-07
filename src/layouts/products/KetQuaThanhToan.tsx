import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

function KetQuaThanhToan() {
    const [trangThai, setTrangThai] = useState<boolean>(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const queryString = window.location.search;

        fetch('http://localhost:8080/api/don-hang/vnpay-payment' + queryString, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${localStorage.getItem('jwt')}`,
            },
        })
            .then(response => response.text())
            .then(data => {
                setTrangThai(data === 'ordersuccess');
            })
            .catch(() => {
                setTrangThai(false);
            })
            .finally(() => {
                setLoading(false);
            });
    }, []);

    if (loading) {
        return (
            <div className="container py-5 text-center">
                <span className="spinner-border text-primary" style={{ width: '3rem', height: '3rem' }}></span>
                <p className="mt-3" style={{ color: 'var(--color-text-muted)' }}>Đang xử lý kết quả thanh toán…</p>
            </div>
        );
    }

    return (
        <div className="container py-5">
            <div className="row justify-content-center">
                <div className="col-md-6 col-lg-5">
                    <div className={`result-card ${trangThai ? 'result-card--success' : 'result-card--error'}`}>
                        <i className={`fas fa-${trangThai ? 'check-circle' : 'times-circle'} result-icon`}></i>
                        <h3>{trangThai ? 'Thanh toán thành công' : 'Thanh toán thất bại'}</h3>
                        <p>
                            {trangThai
                                ? 'Đơn hàng của bạn đã được thanh toán thành công.'
                                : 'Có lỗi xảy ra trong quá trình thanh toán. Vui lòng thử lại.'}
                        </p>
                        <div className="result-card-actions">
                            {trangThai ? (
                                <>
                                    <Link to="/order" className="btn-modern-primary" style={{ textDecoration: 'none' }}>
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
                                    <Link to="/order" className="btn-modern-primary" style={{ textDecoration: 'none' }}>
                                        <i className="fas fa-redo"></i>
                                        Thử lại
                                    </Link>
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

export default KetQuaThanhToan;