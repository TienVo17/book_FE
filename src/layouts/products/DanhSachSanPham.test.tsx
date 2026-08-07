import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import DanhSachSanPham from "./DanhSachSanPham";
import { getAllBook, getSachBanChay } from "../../api/SachApi";

jest.mock("../../api/SachApi", () => ({
  getAllBook: jest.fn(),
  findByBook: jest.fn(),
  getSachBanChay: jest.fn(),
}));

// SachProps tải ảnh riêng qua HinhAnhApi; không phải trọng tâm của test này.
jest.mock("./components/SachProps", () => ({
  __esModule: true,
  default: ({ sach }: { sach: { maSach: number; tenSach?: string } }) => (
    <div data-testid={`sach-${sach.maSach}`}>{sach.tenSach}</div>
  ),
}));

const mockedGetAllBook = getAllBook as jest.MockedFunction<typeof getAllBook>;
const mockedGetSachBanChay = getSachBanChay as jest.MockedFunction<typeof getSachBanChay>;

describe("DanhSachSanPham - tách lỗi khỏi trạng thái không có kết quả", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("hiện empty state (không phải lỗi) kèm gợi ý bán chạy khi không có kết quả, và giữ nguyên tiêu đề", async () => {
    mockedGetAllBook.mockResolvedValue({ ketQua: [], tongSoTrang: 0, tongSoSach: 0 });
    mockedGetSachBanChay.mockResolvedValue([
      { maSach: 99, tenSach: "Sách bán chạy" },
    ]);

    render(<DanhSachSanPham maTheLoai={0} tieuDe="Tất cả sách" />);

    expect(await screen.findByText(/không tìm thấy sách phù hợp/i)).toBeInTheDocument();
    // Tiêu đề không được biến mất khi rỗng.
    expect(screen.getByRole("heading", { name: "Tất cả sách" })).toBeInTheDocument();
    // Gợi ý bán chạy phải xuất hiện.
    expect(await screen.findByTestId("sach-99")).toBeInTheDocument();
    // Không được có nút "Thử lại" của trạng thái lỗi.
    expect(screen.queryByRole("button", { name: /thử lại/i })).not.toBeInTheDocument();
  });

  it("hiện thông báo lỗi kèm nút Thử lại khi gọi API thất bại, và giữ nguyên tiêu đề", async () => {
    mockedGetAllBook.mockRejectedValueOnce(new Error("network down"));
    mockedGetAllBook.mockResolvedValueOnce({
      ketQua: [{ maSach: 1, tenSach: "Sách A" }],
      tongSoTrang: 1,
      tongSoSach: 1,
    });

    render(<DanhSachSanPham maTheLoai={0} tieuDe="Tất cả sách" />);

    const nutThuLai = await screen.findByRole("button", { name: /thử lại/i });
    expect(screen.getByRole("heading", { name: "Tất cả sách" })).toBeInTheDocument();
    // Trạng thái lỗi không được hiện gợi ý bán chạy của trạng thái rỗng.
    expect(screen.queryByText(/không tìm thấy sách phù hợp/i)).not.toBeInTheDocument();

    fireEvent.click(nutThuLai);

    await waitFor(() => expect(screen.getByTestId("sach-1")).toBeInTheDocument());
    expect(mockedGetAllBook).toHaveBeenCalledTimes(2);
  });
});
