import { getApiMessage } from './Request';

const FALLBACK = 'Đã có lỗi xảy ra, vui lòng thử lại.';

describe('getApiMessage', () => {
  it('hiển thị message an toàn từ hợp đồng ApiError', () => {
    expect(
      getApiMessage(
        { status: 400, code: 'VALIDATION_ERROR', message: 'Số lượng phải lớn hơn 0.' },
        FALLBACK,
      ),
    ).toBe('Số lượng phải lớn hơn 0.');
  });

  it('chấp nhận chuỗi thuần ngắn gọn', () => {
    expect(getApiMessage('Tên đăng nhập đã tồn tại.', FALLBACK)).toBe('Tên đăng nhập đã tồn tại.');
  });

  it('không hiển thị stack trace', () => {
    const stackTrace = [
      'java.lang.NullPointerException: Cannot invoke method',
      '\tat com.example.book_be.donhang.service.OrderServiceImpl.saveOrUpdate(OrderServiceImpl.java:120)',
      '\tat org.springframework.web.servlet.DispatcherServlet.doDispatch(DispatcherServlet.java:1072)',
    ].join('\n');

    expect(getApiMessage(stackTrace, FALLBACK)).toBe(FALLBACK);
    expect(getApiMessage({ message: stackTrace }, FALLBACK)).toBe(FALLBACK);
  });

  it('không hiển thị chi tiết SQL hoặc kết nối cơ sở dữ liệu', () => {
    expect(getApiMessage({ message: 'SQLSTATE[23000]: Integrity constraint violation' }, FALLBACK))
      .toBe(FALLBACK);
    expect(getApiMessage({ message: 'jdbc:mysql://db-internal:3306/web_ban_sach' }, FALLBACK))
      .toBe(FALLBACK);
    expect(getApiMessage({ message: 'SELECT * FROM nguoi_dung WHERE ma_nguoi_dung = 1' }, FALLBACK))
      .toBe(FALLBACK);
  });

  it('không hiển thị thông báo quá dài', () => {
    expect(getApiMessage({ message: 'a'.repeat(201) }, FALLBACK)).toBe(FALLBACK);
    expect(getApiMessage({ message: 'a'.repeat(200) }, FALLBACK)).toBe('a'.repeat(200));
  });

  /**
   * Truoc day ham nay duyet moi gia tri chuoi trong response, nen mot truong debug bat ky
   * cung co the bi in ra man hinh nguoi dung.
   */
  it('bỏ qua các trường khác ngoài message trong hợp đồng', () => {
    expect(
      getApiMessage(
        { status: 500, path: '/api/don-hang/them', debugDetail: 'Chi tiết nội bộ không nên lộ' },
        FALLBACK,
      ),
    ).toBe(FALLBACK);
  });

  it('dùng fallback khi thiếu message hoặc rỗng', () => {
    expect(getApiMessage(null, FALLBACK)).toBe(FALLBACK);
    expect(getApiMessage({}, FALLBACK)).toBe(FALLBACK);
    expect(getApiMessage({ message: '   ' }, FALLBACK)).toBe(FALLBACK);
    expect(getApiMessage('', FALLBACK)).toBe(FALLBACK);
  });
});
