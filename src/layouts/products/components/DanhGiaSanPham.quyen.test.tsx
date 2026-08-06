import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import DanhGiaSanPham from "./DanhGiaSanPham";
import { layQuyenDanhGia, layTrangDanhGia } from "../../../api/DanhGiaAPI";

// date-fns/locale chi ship ESM nen Jest cua CRA khong parse duoc. Component chi dung
// locale de dinh dang ngay, khong lien quan gi den quyen danh gia dang duoc kiem tra.
jest.mock("date-fns/locale", () => ({ vi: {} }));

jest.mock("../../../api/DanhGiaAPI", () => ({
  layTrangDanhGia: jest.fn(),
  layQuyenDanhGia: jest.fn(),
  themDanhGiaMoi: jest.fn(),
  xoaDanhGia: jest.fn(),
}));

const layTrangMock = layTrangDanhGia as jest.MockedFunction<typeof layTrangDanhGia>;
const layQuyenMock = layQuyenDanhGia as jest.MockedFunction<typeof layQuyenDanhGia>;

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

/** JWT gia voi exp o tuong lai — component chi doc truong `exp`. */
function jwtConHan(): string {
  const payload = { exp: Math.floor(Date.now() / 1000) + 3600 };
  return `header.${btoa(JSON.stringify(payload))}.signature`;
}

function renderComponent() {
  return render(
    <MemoryRouter>
      <DanhGiaSanPham maSach={7} />
    </MemoryRouter>
  );
}

describe("DanhGiaSanPham — quyền đánh giá", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    layTrangMock.mockResolvedValue(trangRong());
  });

  it("mời đăng nhập khi chưa có token, và không hỏi quyền", async () => {
    renderComponent();

    expect(await screen.findByText("Đăng nhập để đánh giá")).toBeInTheDocument();
    expect(layQuyenMock).not.toHaveBeenCalled();
  });

  it("hiện form khi backend nói được đánh giá", async () => {
    localStorage.setItem("jwt", jwtConHan());
    layQuyenMock.mockResolvedValue({ coThe: true, maDonHang: 42, lyDo: null });

    renderComponent();

    expect(await screen.findByText("Gửi đánh giá")).toBeInTheDocument();
  });

  // Bon ly do phai ra bon thong diep. Mot thong bao chung se bat nguoi dung tu doan
  // minh dang thieu gi — mua hang, doi giao hang, hay khong con duong nao.
  it.each([
    ["CHUA_MUA", "Chỉ khách đã mua và nhận cuốn sách này mới đánh giá được."],
    ["CHUA_NHAN_HANG", "Đơn của bạn chưa được giao xong. Bạn đánh giá được ngay sau khi nhận hàng."],
    ["DA_DANH_GIA", "Bạn đã đánh giá cuốn sách này rồi."],
    ["DA_BI_AN", "Đánh giá của bạn cho cuốn sách này đã bị ẩn nên không thể đăng lại."],
  ] as const)("hiện đúng thông điệp cho lý do %s", async (lyDo, thongDiep) => {
    localStorage.setItem("jwt", jwtConHan());
    layQuyenMock.mockResolvedValue({ coThe: false, maDonHang: null, lyDo });

    renderComponent();

    expect(await screen.findByText(thongDiep)).toBeInTheDocument();
    expect(screen.queryByText("Gửi đánh giá")).not.toBeInTheDocument();
  });

  // Doc va viet la hai viec doc lap: endpoint quyen hong khong duoc lam mat danh sach
  // danh gia da tai ve thanh cong.
  it("vẫn hiện danh sách đánh giá khi endpoint quyền lỗi", async () => {
    localStorage.setItem("jwt", jwtConHan());
    layQuyenMock.mockRejectedValue(new Error("mạng lỗi"));
    layTrangMock.mockResolvedValue({
      ...trangRong(),
      // timestamp de trong: component bo qua buoc dinh dang ngay, tranh phu thuoc vao
      // locale date-fns da bi mock o tren.
      content: [{ maDanhGia: 1, nhanXet: "Sách hay", diemXepHang: 5, timestamp: "", tenHienThi: "Nguyễn V. A.", laCuaToi: false }],
      tongSo: 1,
      tongSoTrang: 1,
      diemTrungBinh: 5,
      phanBo: { "1": 0, "2": 0, "3": 0, "4": 0, "5": 1 },
    });

    renderComponent();

    expect(await screen.findByText("Sách hay")).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText("Gửi đánh giá")).not.toBeInTheDocument());
  });
});
