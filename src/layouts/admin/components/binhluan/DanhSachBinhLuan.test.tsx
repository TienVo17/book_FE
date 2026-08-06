import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DanhSachBinhLuan from "./DanhSachBinhLuan";
import {
  getDanhGiaAdmin,
  xoaAnhDanhGia,
} from "../../../../api/DanhGiaAPI";

jest.mock("../../../../api/DanhGiaAPI", () => ({
  getDanhGiaAdmin: jest.fn(),
  setDanhGiaActive: jest.fn(),
  traLoiDanhGia: jest.fn(),
  xoaAnhDanhGia: jest.fn(),
}));

const getDanhGiaAdminMock = getDanhGiaAdmin as jest.MockedFunction<
  typeof getDanhGiaAdmin
>;
const xoaAnhDanhGiaMock = xoaAnhDanhGia as jest.MockedFunction<
  typeof xoaAnhDanhGia
>;

beforeEach(() => {
  jest.clearAllMocks();
  getDanhGiaAdminMock.mockResolvedValue({
    totalPages: 1,
    content: [
      {
        maDanhGia: 99,
        nhanXet: "Ảnh vi phạm",
        diemXepHang: 1,
        timestamp: "2026-08-06T10:00:00Z",
        maNguoiDung: 7,
        tenNguoiDung: "user7",
        maSach: 3,
        tenSach: "Sách",
        trangThai: "HIEN_THI",
        tungBiAn: false,
        maDonHang: 42,
        phanHoiShop: null,
        phanHoiShopTai: null,
        anhDinhKem: [
          { maHinhAnh: 10, urlHinh: "https://cdn.example/review.jpg" },
        ],
      },
    ],
  });
  xoaAnhDanhGiaMock.mockResolvedValue({ maHinhAnh: 10, daXoa: true });
  window.confirm = jest.fn(() => true);
});

describe("DanhSachBinhLuan — kiểm duyệt ảnh", () => {
  it("hiện thumbnail và cho admin gỡ đúng ảnh", async () => {
    render(<DanhSachBinhLuan />);

    expect(
      await screen.findByAltText("Ảnh 1 của đánh giá #99")
    ).toHaveAttribute("src", "https://cdn.example/review.jpg");

    await userEvent.click(
      screen.getByRole("button", { name: "Gỡ ảnh 1 của đánh giá #99" })
    );

    expect(window.confirm).toHaveBeenCalledWith(
      "Bạn muốn gỡ ảnh vi phạm này?"
    );
    expect(xoaAnhDanhGiaMock).toHaveBeenCalledWith(10);
    await waitFor(() =>
      expect(
        screen.queryByAltText("Ảnh 1 của đánh giá #99")
      ).not.toBeInTheDocument()
    );
  });
});
