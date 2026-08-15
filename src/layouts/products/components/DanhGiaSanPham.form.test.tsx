import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import DanhGiaSanPham from "./DanhGiaSanPham";
import { layQuyenDanhGia, layTrangDanhGia, themDanhGiaMoi } from "../../../api/DanhGiaAPI";
import { useAuthSession } from "../../../api/AuthSession";

jest.mock("date-fns/locale", () => ({ vi: {} }));
jest.mock("../../../api/AuthSession", () => ({ useAuthSession: jest.fn() }));
jest.mock("react-toastify", () => ({ toast: { error: jest.fn(), success: jest.fn() } }));

jest.mock("../../../api/DanhGiaAPI", () => ({
  layTrangDanhGia: jest.fn(),
  layQuyenDanhGia: jest.fn(),
  themDanhGiaMoi: jest.fn(),
  xoaDanhGia: jest.fn(),
  doiBinhChonHuuIch: jest.fn(),
}));

const layTrangMock = layTrangDanhGia as jest.MockedFunction<typeof layTrangDanhGia>;
const layQuyenMock = layQuyenDanhGia as jest.MockedFunction<typeof layQuyenDanhGia>;
const themMock = themDanhGiaMoi as jest.MockedFunction<typeof themDanhGiaMoi>;
const mockedUseAuth = useAuthSession as jest.MockedFunction<typeof useAuthSession>;

function trangRong(): Awaited<ReturnType<typeof layTrangDanhGia>> {
  return {
    content: [],
    trang: 0,
    kichThuoc: 10,
    tongSoTrang: 0,
    tongSo: 0,
    diemTrungBinh: 0,
    phanBo: { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 },
  };
}

function renderComponent() {
  return render(
    <MemoryRouter>
      <DanhGiaSanPham maSach={7} />
    </MemoryRouter>
  );
}

describe("DanhGiaSanPham — form gửi đánh giá", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    mockedUseAuth.mockReturnValue({ status: "authenticated", uid: 1, username: "reader", roles: ["USER"], capabilities: ["USER"] });
    layTrangMock.mockResolvedValue(trangRong());
    layQuyenMock.mockResolvedValue({ coThe: true, maDonHang: 42, lyDo: null });
    themMock.mockResolvedValue({
      maDanhGia: 99,
      nhanXet: "Sách rất hay",
      diemXepHang: 5,
      timestamp: "",
      tenHienThi: "Nguyễn V. A.",
      laCuaToi: true,
      soLuotHuuIch: 0,
      toiDaBinhChon: false,
      phanHoiShop: null,
      phanHoiShopTai: null,
      anhDinhKem: [],
    });
  });

  async function moForm() {
    renderComponent();
    return screen.findByRole("button", { name: "Gửi đánh giá" });
  }

  it("chọn sao được bằng bàn phím", async () => {
    await moForm();

    // Radio thật: có role, có nhãn đọc được, nhận focus, và chọn được bằng phím Space.
    // Một `<div>` bắt sự kiện click sẽ không có gì trong số này.
    // (Điều hướng bằng phím mũi tên là hành vi của trình duyệt thật; jsdom không cài
    // đặt nó, nên không kiểm tra được ở đây.)
    expect(screen.getByRole("radiogroup", { name: "Số sao" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "5 sao — Rất tốt" })).toBeChecked();

    const bonSao = screen.getByRole("radio", { name: "4 sao — Tốt" });
    bonSao.focus();
    expect(bonSao).toHaveFocus();
    await userEvent.keyboard("[Space]");

    expect(bonSao).toBeChecked();
    expect(screen.getByRole("radio", { name: "5 sao — Rất tốt" })).not.toBeChecked();
  });

  it("gửi được bằng phím Enter trong ô nhận xét", async () => {
    await moForm();
    await userEvent.type(screen.getByLabelText("Nhận xét:"), "Sách rất hay{enter}");

    // Enter trong textarea xuống dòng chứ không submit, nên đây kiểm tra qua nút.
    await userEvent.click(screen.getByRole("button", { name: "Gửi đánh giá" }));

    await waitFor(() => expect(themMock).toHaveBeenCalledTimes(1));
  });

  /**
   * Bấm hai lần thật nhanh có thể lọt qua trước khi React vẽ lại nút disabled. Nếu lần
   * thứ hai vẫn đi tới backend, nó nhận 409 — một thông báo lỗi cho một thao tác đã
   * thành công.
   */
  it("bấm nhanh hai lần chỉ tạo một request", async () => {
    let giaiPhong: (v: Awaited<ReturnType<typeof themDanhGiaMoi>>) => void = () => {};
    themMock.mockImplementation(() => new Promise((resolve) => { giaiPhong = resolve; }));

    const nut = await moForm();
    await userEvent.type(screen.getByLabelText("Nhận xét:"), "Sách rất hay");

    await userEvent.click(nut);
    await userEvent.click(nut);

    expect(themMock).toHaveBeenCalledTimes(1);
    giaiPhong({
      maDanhGia: 99,
      nhanXet: "Sách rất hay",
      diemXepHang: 5,
      timestamp: "",
      tenHienThi: "Nguyễn V. A.",
      laCuaToi: true,
      soLuotHuuIch: 0,
      toiDaBinhChon: false,
      phanHoiShop: null,
      phanHoiShopTai: null,
      anhDinhKem: [],
    });
  });

  it("khoá nút và đổi nhãn trong lúc đang gửi", async () => {
    let giaiPhong: (v: Awaited<ReturnType<typeof themDanhGiaMoi>>) => void = () => {};
    themMock.mockImplementation(() => new Promise((resolve) => { giaiPhong = resolve; }));

    const nut = await moForm();
    await userEvent.type(screen.getByLabelText("Nhận xét:"), "Sách rất hay");
    await userEvent.click(nut);

    expect(await screen.findByRole("button", { name: "Đang gửi…" })).toBeDisabled();
    giaiPhong({
      maDanhGia: 99,
      nhanXet: "Sách rất hay",
      diemXepHang: 5,
      timestamp: "",
      tenHienThi: "Nguyễn V. A.",
      laCuaToi: true,
      soLuotHuuIch: 0,
      toiDaBinhChon: false,
      phanHoiShop: null,
      phanHoiShopTai: null,
      anhDinhKem: [],
    });
  });

  it("xoá nội dung form sau khi gửi thành công", async () => {
    // Sau khi gửi xong, backend nói người này đã đánh giá rồi nên form biến mất.
    layQuyenMock
      .mockResolvedValueOnce({ coThe: true, maDonHang: 42, lyDo: null })
      .mockResolvedValue({ coThe: false, maDonHang: null, lyDo: "DA_DANH_GIA" });

    const nut = await moForm();
    await userEvent.type(screen.getByLabelText("Nhận xét:"), "Sách rất hay");
    await userEvent.click(nut);

    expect(await screen.findByText("Bạn đã đánh giá cuốn sách này rồi.")).toBeInTheDocument();
    expect(screen.queryByLabelText("Nhận xét:")).not.toBeInTheDocument();
  });

  it("hiện lỗi trong vùng role=alert khi gửi thất bại", async () => {
    themMock.mockRejectedValue(new Error("Bạn cần mua và nhận cuốn sách này trước khi đánh giá."));

    const nut = await moForm();
    await userEvent.type(screen.getByLabelText("Nhận xét:"), "Sách rất hay");
    await userEvent.click(nut);

    const canhBao = await screen.findByRole("alert");
    expect(canhBao).toHaveTextContent("Bạn cần mua và nhận cuốn sách này trước khi đánh giá.");
    expect(screen.getByRole("button", { name: "Gửi đánh giá" })).toBeEnabled();
  });
});
