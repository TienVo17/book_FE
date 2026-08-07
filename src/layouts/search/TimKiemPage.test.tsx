import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import TimKiemPage from "./TimKiemPage";
import { findByBook, getSachBanChay } from "../../api/SachApi";
import SachModel from "../../models/SachModel";

jest.mock("../../api/SachApi", () => ({
  findByBook: jest.fn(),
  getSachBanChay: jest.fn(),
}));

jest.mock("../products/components/SachProps", () => ({
  __esModule: true,
  default: ({ sach }: { sach: { maSach: number; tenSach?: string } }) => (
    <div data-testid={`sach-${sach.maSach}`}>{sach.tenSach}</div>
  ),
}));

const mockedFindByBook = findByBook as jest.MockedFunction<typeof findByBook>;
const mockedGetSachBanChay = getSachBanChay as jest.MockedFunction<typeof getSachBanChay>;

function ViTriHienTai() {
  const location = useLocation();
  return <output data-testid="vi-tri-hien-tai">{location.pathname}{location.search}</output>;
}

function renderTaiDuongDan(duongDan: string) {
  render(
    <MemoryRouter initialEntries={[duongDan]}>
      <Routes>
        <Route path="/tim-kiem" element={<TimKiemPage />} />
      </Routes>
      <ViTriHienTai />
    </MemoryRouter>,
  );
}

function trangKetQua(content: SachModel[] = [], totalPages = 1, totalElements = content.length) {
  return { ketQua: content, tongSoTrang: totalPages, tongSoSach: totalElements };
}

describe("TimKiemPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetSachBanChay.mockResolvedValue([]);
  });

  it("tải kết quả ngay khi mở trực tiếp bằng URL /tim-kiem?q=abc (F5/share)", async () => {
    mockedFindByBook.mockResolvedValue(
      trangKetQua([{ maSach: 1, tenSach: "Sách abc" }], 1, 1),
    );

    renderTaiDuongDan("/tim-kiem?q=abc");

    expect(await screen.findByTestId("sach-1")).toBeInTheDocument();
    expect(mockedFindByBook).toHaveBeenCalledWith(
      "abc",
      0,
      0,
      expect.objectContaining({ sort: "moi-nhat" }),
    );
    expect(screen.getByText(/tìm thấy 1 kết quả/i)).toBeInTheDocument();
  });

  it("đổi sắp xếp cập nhật URL và quay lại trang 1", async () => {
    mockedFindByBook.mockResolvedValue(trangKetQua([{ maSach: 1, tenSach: "A" }], 5, 50));

    renderTaiDuongDan("/tim-kiem?q=abc&page=3");
    await screen.findByTestId("sach-1");

    fireEvent.change(screen.getByLabelText(/sắp xếp theo/i), { target: { value: "gia-tang" } });

    await waitFor(() => {
      expect(screen.getByTestId("vi-tri-hien-tai")).toHaveTextContent("sort=gia-tang");
    });
    expect(screen.getByTestId("vi-tri-hien-tai")).not.toHaveTextContent("page=");

    await waitFor(() => {
      const cuocGoiCuoiCung = mockedFindByBook.mock.calls[mockedFindByBook.mock.calls.length - 1];
      expect(cuocGoiCuoiCung[2]).toBe(0); // trang 0-based = trang 1
      expect(cuocGoiCuoiCung[3]).toEqual(expect.objectContaining({ sort: "gia-tang" }));
    });
  });

  it("đổi khoảng giá cập nhật URL và quay lại trang 1", async () => {
    mockedFindByBook.mockResolvedValue(trangKetQua([{ maSach: 1, tenSach: "A" }], 5, 50));

    renderTaiDuongDan("/tim-kiem?q=abc&page=2");
    await screen.findByTestId("sach-1");

    fireEvent.change(screen.getByLabelText(/giá từ/i), { target: { value: "10000" } });
    fireEvent.change(screen.getByLabelText(/^đến$/i), { target: { value: "50000" } });
    fireEvent.click(screen.getByRole("button", { name: /áp dụng/i }));

    await waitFor(() => {
      expect(screen.getByTestId("vi-tri-hien-tai")).toHaveTextContent("giaMin=10000");
      expect(screen.getByTestId("vi-tri-hien-tai")).toHaveTextContent("giaMax=50000");
    });
    expect(screen.getByTestId("vi-tri-hien-tai")).not.toHaveTextContent("page=");
  });

  it("gỡ bộ lọc từ khóa xóa tham số q khỏi URL", async () => {
    mockedFindByBook.mockResolvedValue(trangKetQua([{ maSach: 1, tenSach: "A" }], 1, 1));

    renderTaiDuongDan("/tim-kiem?q=abc");
    await screen.findByTestId("sach-1");

    fireEvent.click(screen.getByRole("button", { name: /từ khóa: "abc"/i }));

    await waitFor(() => {
      expect(screen.getByTestId("vi-tri-hien-tai")).not.toHaveTextContent("q=abc");
    });
  });

  it("hiện empty state (không phải lỗi) khi không có kết quả", async () => {
    mockedFindByBook.mockResolvedValue(trangKetQua([], 0, 0));
    mockedGetSachBanChay.mockResolvedValue([{ maSach: 9, tenSach: "Bán chạy" }]);

    renderTaiDuongDan("/tim-kiem?q=khongtontai");

    expect(await screen.findByText(/không tìm thấy sách phù hợp/i)).toBeInTheDocument();
    expect(await screen.findByTestId("sach-9")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /thử lại/i })).not.toBeInTheDocument();
  });

  it("hiện lỗi kèm nút Thử lại khi API thất bại", async () => {
    mockedFindByBook.mockRejectedValueOnce(new Error("mất kết nối"));
    mockedFindByBook.mockResolvedValueOnce(trangKetQua([{ maSach: 1, tenSach: "A" }], 1, 1));

    renderTaiDuongDan("/tim-kiem?q=abc");

    const nutThuLai = await screen.findByRole("button", { name: /thử lại/i });
    fireEvent.click(nutThuLai);

    expect(await screen.findByTestId("sach-1")).toBeInTheDocument();
    expect(mockedFindByBook).toHaveBeenCalledTimes(2);
  });
});
