import { getThongKe } from './AdminApi';

jest.mock('./AuthSession', () => ({
  __esModule: true,
  captureAuthenticatedRequest: () => ({ accessToken: 'test-access-token', revision: 1 }),
  isCurrentAuthCapture: () => true,
  refreshForRequest: () => Promise.resolve(false),
  invalidateAuthCapture: () => false,
}));

function mockThongKe(body: unknown): void {
  global.fetch = jest.fn().mockResolvedValue(
    new Response(JSON.stringify(body), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  );
}

/**
 * Response thật của `GET /api/admin/thong-ke`, chép đúng tên trường từ
 * `ThongKeServiceImpl`. Đây là thứ khiến bản trước hỏng: màn hình đọc
 * `tongDoanhThu`/`topSachBanChay`, còn backend chưa bao giờ gửi hai tên đó.
 */
const RESPONSE_BACKEND = {
  totalOrders: 42,
  totalRevenue: 12_500_000,
  todayOrders: 3,
  todayRevenue: 450_000,
  totalUsers: 17,
  pendingOrders: 5,
  topBanChay: [
    { maSach: 7, tenSach: 'Nhà Giả Kim', tongBan: 31 },
    { maSach: 9, tenSach: 'Đắc Nhân Tâm', tongBan: 12 },
  ],
};

describe('AdminApi.getThongKe', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    localStorage.clear();
    global.fetch = originalFetch;
  });

  it('ánh xạ đúng từng tên trường của backend sang model dashboard', async () => {
    mockThongKe(RESPONSE_BACKEND);

    const thongKe = await getThongKe();

    expect(thongKe).toEqual({
      tongDonHang: 42,
      tongDoanhThu: 12_500_000,
      donHangHomNay: 3,
      doanhThuHomNay: 450_000,
      tongNguoiDung: 17,
      donChoXuLy: 5,
      topSachBanChay: [
        { maSach: 7, tenSach: 'Nhà Giả Kim', soLuongBan: 31 },
        { maSach: 9, tenSach: 'Đắc Nhân Tâm', soLuongBan: 12 },
      ],
    });
  });

  /** `SUM` của JPA trả null khi chưa có đơn nào; màn hình cần 0, không phải NaN. */
  it('coi doanh thu null là 0 thay vì để lọt undefined vào giao diện', async () => {
    mockThongKe({ ...RESPONSE_BACKEND, totalRevenue: null, todayRevenue: null });

    const thongKe = await getThongKe();

    expect(thongKe.tongDoanhThu).toBe(0);
    expect(thongKe.doanhThuHomNay).toBe(0);
    expect(thongKe.tongDonHang).toBe(42);
  });

  it('bỏ qua dòng top bán chạy không có tên sách thay vì render ô trống', async () => {
    mockThongKe({
      ...RESPONSE_BACKEND,
      topBanChay: [{ maSach: 7, tongBan: 31 }, null, { maSach: 9, tenSach: 'Số Đỏ', tongBan: 4 }],
    });

    const thongKe = await getThongKe();

    expect(thongKe.topSachBanChay).toEqual([
      { maSach: 9, tenSach: 'Số Đỏ', soLuongBan: 4 },
    ]);
  });

  /**
   * Chốt lại chính lỗi cũ: nếu ai đó ép kiểu thẳng response, mọi trường sẽ là
   * `undefined` và dashboard hiện 0đ trong khi hệ thống có doanh thu thật.
   */
  it('không bao giờ trả undefined cho một ô số của dashboard', async () => {
    mockThongKe({});

    const thongKe = await getThongKe();

    expect(Object.values(thongKe).every((giaTri) => giaTri !== undefined)).toBe(true);
    expect(thongKe.topSachBanChay).toEqual([]);
  });
});
