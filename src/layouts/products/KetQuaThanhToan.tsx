import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getVNPayCallbackResult } from '../../api/DonHangApi';
import { refreshCartAfterCheckout } from '../../api/CartSession';
import { bootstrapAuth, getAuthSnapshot } from '../../api/AuthSession';

type PaymentResult = 'loading' | 'success' | 'cancelled-paid' | 'failure';

function KetQuaThanhToan() {
    const [result, setResult] = useState<PaymentResult>('loading');

    useEffect(() => {
        const queryString = window.location.search;

        getVNPayCallbackResult(queryString)
            .then(async data => {
                if (data === 'ordercancelledpaid') {
                    setResult('cancelled-paid');
                    return;
                }

                const success = data === 'ordersuccess';
                setResult(success ? 'success' : 'failure');
                if (success) {
                    try {
                        // A terminal root session needs no extra round trip. Only
                        // a browser return arriving during bootstrap retries the
                        // session check; callback query parameters are never auth.
                        if (getAuthSnapshot().status === 'unknown') {
                            await bootstrapAuth();
                        }
                        if (getAuthSnapshot().status === 'authenticated') {
                            await refreshCartAfterCheckout();
                        }
                    } catch {
                        // Payment status is already committed. A later cart access
                        // can retry hydration after an unavailable auth service.
                    }
                }
            })
            .catch(() => {
                setResult('failure');
            });
    }, []);

    if (result === 'loading') {
        return (
            <div className="container py-5 text-center">
                <span className="spinner-border text-primary" style={{ width: '3rem', height: '3rem' }}></span>
                <p className="mt-3" style={{ color: 'var(--color-text-muted)' }}>Đang xử lý kết quả thanh toán…</p>
            </div>
        );
    }

    const success = result === 'success';
    const cancelledPaid = result === 'cancelled-paid';
    const heading = success
        ? 'Thanh toán thành công'
        : cancelledPaid
            ? 'Đã nhận thanh toán, nhưng đơn hàng đã hủy'
            : 'Thanh toán thất bại';

    return (
        <div className="container py-5">
            <div className="row justify-content-center">
                <div className="col-md-6 col-lg-5">
                    <div className={`result-card ${success ? 'result-card--success' : 'result-card--error'}`}>
                        <i className={`fas fa-${success ? 'check-circle' : cancelledPaid ? 'exclamation-circle' : 'times-circle'} result-icon`}></i>
                        <h3>{heading}</h3>
                        {cancelledPaid ? (
                            <>
                                <p>VNPay đã xác nhận thanh toán, nhưng đơn hàng đã bị hủy trước đó.</p>
                                <p>Vui lòng liên hệ hỗ trợ để được kiểm tra và hướng dẫn xử lý khoản tiền này.</p>
                            </>
                        ) : (
                            <p>
                                {success
                                    ? 'Đơn hàng của bạn đã được thanh toán thành công.'
                                    : 'Có lỗi xảy ra trong quá trình thanh toán. Vui lòng thử lại.'}
                            </p>
                        )}
                        <div className="result-card-actions">
                            <Link to="/order" className="btn-modern-primary" style={{ textDecoration: 'none' }}>
                                <i className="fas fa-receipt"></i>
                                {success ? 'Xem đơn hàng' : 'Kiểm tra đơn hàng'}
                            </Link>
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

export default KetQuaThanhToan;