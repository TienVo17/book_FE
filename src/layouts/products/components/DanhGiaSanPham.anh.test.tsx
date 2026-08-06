import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import DanhGiaSanPham from "./DanhGiaSanPham";
import {
  layQuyenDanhGia,
  layTrangDanhGia,
  themAnhDanhGia,
  themDanhGiaMoi,
  xoaAnhDanhGia,
} from "../../../api/DanhGiaAPI";
import { ApiRequestError } from "../../../api/Request";

jest.mock("date-fns/locale", () => ({ vi: {} }));
jest.mock("react-toastify", () => ({ toast: { error: jest.fn(), success: jest.fn() } }));
jest.mock("../../../api/DanhGiaAPI", () => {
  const actual = jest.requireActual("../../../api/DanhGiaAPI");
  return {
    ...actual,
    layTrangDanhGia: jest.fn(),
    layQuyenDanhGia: jest.fn(),
    themDanhGiaMoi: jest.fn(),
    themAnhDanhGia: jest.fn(),
    xoaAnhDanhGia: jest.fn(),
    xoaDanhGia: jest.fn(),
    doiBinhChonHuuIch: jest.fn(),
  };
});

const layTrangMock = layTrangDanhGia as jest.MockedFunction<typeof layTrangDanhGia>;
const layQuyenMock = layQuyenDanhGia as jest.MockedFunction<typeof layQuyenDanhGia>;
const themMock = themDanhGiaMoi as jest.MockedFunction<typeof themDanhGiaMoi>;
const themAnhMock = themAnhDanhGia as jest.MockedFunction<typeof themAnhDanhGia>;
const xoaAnhMock = xoaAnhDanhGia as jest.MockedFunction<typeof xoaAnhDanhGia>;
const createObjectURLMock = jest.fn(() => "blob:preview");
const revokeObjectURLMock = jest.fn();

function jwtConHan(): string {
  return `header.${btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }))}.signature`;
}

function danhGia(laCuaToi = true) {
  return {
    maDanhGia: 99,
    nhanXet: "Có ảnh thật",
    diemXepHang: 5,
    timestamp: "",
    tenHienThi: "Nguyễn V. A.",
    laCuaToi,
    soLuotHuuIch: 0,
    toiDaBinhChon: false,
    phanHoiShop: null,
    phanHoiShopTai: null,
    anhDinhKem: [
      { maHinhAnh: 10, urlHinh: "https://cdn.example/1.jpg" },
      { maHinhAnh: 11, urlHinh: "https://cdn.example/2.jpg" },
    ],
  };
}

function trang(content: ReturnType<typeof danhGia>[] = []) {
  return {
    content,
    trang: 0,
    kichThuoc: 10,
    tongSoTrang: content.length ? 1 : 0,
    tongSo: content.length,
    diemTrungBinh: content.length ? 5 : 0,
    phanBo: { "1": 0, "2": 0, "3": 0, "4": 0, "5": content.length },
  };
}

function renderComponent() {
  return render(
    <MemoryRouter>
      <DanhGiaSanPham maSach={7} />
    </MemoryRouter>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  createObjectURLMock.mockReturnValue("blob:preview");
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: createObjectURLMock,
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    value: revokeObjectURLMock,
  });
  localStorage.clear();
  localStorage.setItem("jwt", jwtConHan());
  layQuyenMock.mockResolvedValue({ coThe: true, maDonHang: 42, lyDo: null });
  layTrangMock.mockResolvedValue(trang());
  themMock.mockResolvedValue(danhGia());
  themAnhMock.mockResolvedValue({ maHinhAnh: 10, urlHinh: "https://cdn.example/1.jpg" });
  xoaAnhMock.mockResolvedValue({ maHinhAnh: 10, daXoa: true });
});

describe("DanhGiaSanPham — ảnh đánh giá", () => {
  it("tạo review trước rồi tải các ảnh đã chọn theo đúng id review", async () => {
    renderComponent();
    await screen.findByRole("button", { name: "Gửi đánh giá" });

    const anh1 = new File(["jpeg-1"], "bia.jpg", { type: "image/jpeg" });
    const anh2 = new File(["png-2"], "trang.png", { type: "image/png" });
    await userEvent.upload(screen.getByLabelText("Chọn ảnh đánh giá"), [anh1, anh2]);
    await userEvent.type(screen.getByLabelText("Nhận xét:"), "Sách có hình thật");
    await userEvent.click(screen.getByRole("button", { name: "Gửi đánh giá" }));

    await waitFor(() => expect(themAnhMock).toHaveBeenCalledTimes(2));
    expect(themAnhMock).toHaveBeenNthCalledWith(1, 99, anh1, expect.any(String));
    expect(themAnhMock).toHaveBeenNthCalledWith(2, 99, anh2, expect.any(String));
    expect(themAnhMock.mock.calls[0][2]).not.toBe(themAnhMock.mock.calls[1][2]);
  });

  it("báo rõ review chữ đã lưu và cho tải lại ảnh còn thiếu", async () => {
    layTrangMock
      .mockResolvedValueOnce(trang())
      .mockResolvedValue(trang([{ ...danhGia(true), anhDinhKem: [danhGia(true).anhDinhKem[0]] }]));
    renderComponent();
    await screen.findByRole("button", { name: "Gửi đánh giá" });

    const anh1 = new File(["jpeg-1"], "bia.jpg", { type: "image/jpeg" });
    const anh2 = new File(["png-2"], "trang.png", { type: "image/png" });
    themAnhMock
      .mockResolvedValueOnce({ maHinhAnh: 10, urlHinh: "https://cdn.example/1.jpg" })
      .mockRejectedValueOnce(new ApiRequestError("too large", 400, "REVIEW_IMAGE_TOO_LARGE"))
      .mockResolvedValueOnce({ maHinhAnh: 11, urlHinh: "https://cdn.example/2.jpg" });

    await userEvent.upload(screen.getByLabelText("Chọn ảnh đánh giá"), [anh1, anh2]);
    await userEvent.type(screen.getByLabelText("Nhận xét:"), "Sách có hình thật");
    await userEvent.click(screen.getByRole("button", { name: "Gửi đánh giá" }));

    expect(await screen.findByText(/Đánh giá chữ đã được lưu\. Đã tải 1\/2 ảnh/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Tải lại 1 ảnh" }));

    await waitFor(() => expect(themAnhMock).toHaveBeenCalledTimes(3));
    expect(themAnhMock.mock.calls[2][0]).toBe(99);
    expect(themAnhMock.mock.calls[2][1]).toBe(anh2);
    expect(themAnhMock.mock.calls[2][2]).toBe(themAnhMock.mock.calls[1][2]);
  });

  it("không báo gửi thất bại khi review đã lưu nhưng tải lại danh sách lỗi", async () => {
    layTrangMock
      .mockResolvedValueOnce(trang())
      .mockRejectedValueOnce(new Error("refresh unavailable"));
    renderComponent();
    await screen.findByRole("button", { name: "Gửi đánh giá" });

    await userEvent.type(screen.getByLabelText("Nhận xét:"), "Đánh giá đã lưu");
    await userEvent.click(screen.getByRole("button", { name: "Gửi đánh giá" }));

    expect(await screen.findByText(/Đánh giá đã được lưu nhưng chưa thể làm mới danh sách/)).toBeInTheDocument();
    expect(screen.queryByText("refresh unavailable")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Gửi đánh giá" })).not.toBeInTheDocument();
  });

  it("mở viewer bằng thumbnail, chuyển ảnh và đóng bằng Escape", async () => {
    layTrangMock.mockResolvedValue(trang([danhGia(false)]));
    layQuyenMock.mockResolvedValue({ coThe: false, maDonHang: null, lyDo: "DA_DANH_GIA" });
    renderComponent();

    const thumbnail = await screen.findByRole("button", { name: "Xem ảnh đánh giá 1 ở kích thước lớn" });
    await userEvent.click(thumbnail);
    expect(screen.getByRole("dialog", { name: "Ảnh đánh giá 1 / 2" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Đóng ảnh lớn" })).toHaveFocus();

    await userEvent.keyboard("{ArrowRight}");
    expect(screen.getByRole("dialog", { name: "Ảnh đánh giá 2 / 2" })).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(thumbnail).toHaveFocus();
  });

  it("chỉ chủ review thấy và dùng được nút gỡ từng ảnh", async () => {
    window.confirm = jest.fn(() => true);
    layTrangMock
      .mockResolvedValueOnce(trang([danhGia(true)]))
      .mockResolvedValue(trang([{ ...danhGia(true), anhDinhKem: [danhGia(true).anhDinhKem[1]] }]));
    renderComponent();

    await userEvent.click(await screen.findByRole("button", { name: "Gỡ ảnh 1" }));
    await waitFor(() => expect(xoaAnhMock).toHaveBeenCalledWith(10));
  });
});
