import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { DonHangDetail, getDonHangDetail } from '../../api/DonHangApi';
import { ApiRequestError } from '../../api/Request';

const moneyFormatter = new Intl.NumberFormat('vi-VN');
const dateFormatter = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

function formatMoney(value: number): string {
  return `${moneyFormatter.format(value)}đ`;
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : dateFormatter.format(date);
}

function renderPaymentStatus(status: number) {
  if (status === 1) {
    return <span className="status-badge paid">Đã thanh toán</span>;
  }
  if (status === 0) {
    return <span className="status-badge pending">Chưa thanh toán</span>;
  }
  return <span className="status-badge">Không xác định</span>;
}

function renderDeliveryStatus(status: number) {
  if (status === 3) {
    return <span className="status-badge" style={{ background: '#fee2e2', color: '#b91c1c' }}>Đã hủy</span>;
  }
  if (status === 2) {
    return <span className="status-badge delivered">Đã nhận hàng</span>;
  }
  if (status === 1) {
    return <span className="status-badge shipping">Đang giao</span>;
  }
  if (status === 0) {
    return <span className="status-badge pending">Đang xử lý</span>;
  }
  return <span className="status-badge">Không xác định</span>;
}

function ChiTietDonHangUser() {
  const { maDonHang } = useParams<{ maDonHang: string }>();
  const parsedId = Number(maDonHang);
  const validId = Number.isSafeInteger(parsedId) && parsedId > 0;
  const [detail, setDetail] = useState<DonHangDetail | null>(null);
  const [loading, setLoading] = useState(validId);
  const [error, setError] = useState<string | null>(
    validId ? null : 'Mã đơn hàng không hợp lệ.',
  );

  useEffect(() => {
    if (!validId) {
      setDetail(null);
      setLoading(false);
      setError('Mã đơn hàng không hợp lệ.');
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);
    setDetail(null);

    getDonHangDetail(parsedId)
      .then(data => {
        if (active) {
          setDetail(data);
        }
      })
      .catch(requestError => {
        if (!active) {
          return;
        }
        const message = requestError instanceof ApiRequestError
          ? requestError.message
          : 'Không thể tải chi tiết đơn hàng. Vui lòng thử lại sau.';
        setError(message || 'Không thể tải chi tiết đơn hàng.');
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [parsedId, validId]);

  if (loading) {
    return (
      <div className="container py-5 text-center" role="status">
        <span className="spinner-border text-primary" aria-hidden="true"></span>
        <p className="mt-2" style={{ color: 'var(--color-text-muted)' }}>Đang tải chi tiết đơn hàng…</p>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="container py-5">
        <div className="alert alert-danger" role="alert">
          <i className="fas fa-exclamation-circle me-2" aria-hidden="true"></i>
          {error || 'Không tìm thấy chi tiết đơn hàng.'}
        </div>
        <Link to="/order" className="btn btn-outline-primary">
          Quay lại đơn hàng của tôi
        </Link>
      </div>
    );
  }

  const paymentName = detail.tenPhuongThucThanhToan
    || detail.phuongThucThanhToan
    || 'Chưa có thông tin';
  const deliveryName = detail.tenHinhThucGiaoHang || 'Chưa có thông tin';

  return (
    <main className="container py-4 animate-fade-in">
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
        <div>
          <Link to="/order" className="d-inline-block mb-2">← Quay lại đơn hàng của tôi</Link>
          <h1 className="h2 mb-1" style={{ fontFamily: 'var(--font-heading)', fontWeight: 700 }}>
            Chi tiết đơn hàng #{detail.maDonHang}
          </h1>
          <p className="mb-0" style={{ color: 'var(--color-text-muted)' }}>
            Đặt lúc {formatDate(detail.ngayTao)}
          </p>
        </div>
        <div className="d-flex flex-wrap gap-2" aria-label="Trạng thái đơn hàng">
          {renderPaymentStatus(detail.trangThaiThanhToan)}
          {renderDeliveryStatus(detail.trangThaiGiaoHang)}
        </div>
      </div>

      <div className="row g-4 mb-4">
        <section className="col-lg-6" aria-labelledby="receiver-heading">
          <div className="checkout-card h-100">
            <div className="checkout-card-header">
              <h2 id="receiver-heading" className="h6 mb-0">Thông tin nhận hàng</h2>
            </div>
            <div className="checkout-card-body">
              <dl className="row mb-0">
                <dt className="col-sm-4">Người nhận</dt>
                <dd className="col-sm-8">{detail.hoTen || '—'}</dd>
                <dt className="col-sm-4">Số điện thoại</dt>
                <dd className="col-sm-8">{detail.soDienThoai || '—'}</dd>
                <dt className="col-sm-4">Địa chỉ</dt>
                <dd className="col-sm-8 mb-0">{detail.diaChiNhanHang || '—'}</dd>
              </dl>
            </div>
          </div>
        </section>

        <section className="col-lg-6" aria-labelledby="fulfillment-heading">
          <div className="checkout-card h-100">
            <div className="checkout-card-header">
              <h2 id="fulfillment-heading" className="h6 mb-0">Thanh toán và giao hàng</h2>
            </div>
            <div className="checkout-card-body">
              <dl className="row mb-0">
                <dt className="col-sm-5">Thanh toán</dt>
                <dd className="col-sm-7">{paymentName}</dd>
                <dt className="col-sm-5">Giao hàng</dt>
                <dd className="col-sm-7 mb-0">{deliveryName}</dd>
              </dl>
            </div>
          </div>
        </section>
      </div>

      <section aria-labelledby="items-heading" className="mb-4">
        <h2 id="items-heading" className="h4 mb-3">Sản phẩm</h2>
        <div className="order-table-wrapper">
          <div className="table-responsive">
            <table className="order-table">
              <thead>
                <tr>
                  <th scope="col">Sản phẩm</th>
                  <th scope="col" style={{ textAlign: 'right' }}>Đơn giá</th>
                  <th scope="col" style={{ textAlign: 'center' }}>Số lượng</th>
                  <th scope="col" style={{ textAlign: 'right' }}>Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                {detail.danhSachChiTietDonHang.map(item => (
                  <tr key={item.maSach}>
                    <td>
                      <Link to={`/sach/${item.maSach}`} aria-label={`Xem sách ${item.tenSach}`}>
                        {item.tenSach}
                      </Link>
                    </td>
                    <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      {formatMoney(item.giaBan)}
                    </td>
                    <td style={{ textAlign: 'center' }}>{item.soLuong}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                      {formatMoney(item.thanhTien)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="row justify-content-end" aria-labelledby="summary-heading">
        <div className="col-lg-5">
          <div className="checkout-card">
            <div className="checkout-card-header">
              <h2 id="summary-heading" className="h6 mb-0">Tổng thanh toán</h2>
            </div>
            <div className="checkout-card-body">
              <dl className="row mb-0">
                <dt className="col-7 fw-normal">Tiền sản phẩm</dt>
                <dd className="col-5 text-end">{formatMoney(detail.tongTienSanPham)}</dd>
                {detail.soTienGiam > 0 && (
                  <>
                    <dt className="col-7 fw-normal">Giảm giá</dt>
                    <dd className="col-5 text-end text-success">−{formatMoney(detail.soTienGiam)}</dd>
                  </>
                )}
                <dt className="col-7 fw-normal">Phí giao hàng</dt>
                <dd className="col-5 text-end">
                  {detail.chiPhiGiaoHang === 0 ? 'Miễn phí' : formatMoney(detail.chiPhiGiaoHang)}
                </dd>
                {detail.chiPhiThanhToan > 0 && (
                  <>
                    <dt className="col-7 fw-normal">Phí thanh toán</dt>
                    <dd className="col-5 text-end">{formatMoney(detail.chiPhiThanhToan)}</dd>
                  </>
                )}
                <dt className="col-7 pt-3 border-top">Tổng cộng</dt>
                <dd className="col-5 pt-3 border-top text-end fw-bold" style={{ color: 'var(--color-accent)' }}>
                  {formatMoney(detail.tongTien)}
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default ChiTietDonHangUser;
