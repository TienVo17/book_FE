import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import DanhGiaSanPham from "./DanhGiaSanPham";
import { layQuyenDanhGia, layTrangDanhGia } from "../../../api/DanhGiaAPI";
import { useAuthSession } from "../../../api/AuthSession";

// date-fns/locale chi ship ESM nen Jest cua CRA khong parse duoc. Component chi dung
// locale de dinh dang ngay, khong lien quan gi den quyen danh gia dang duoc kiem tra.
jest.mock("date-fns/locale", () => ({ vi: {} }));
jest.mock("../../../api/AuthSession", () => ({ useAuthSession: jest.fn() }));

jest.mock("../../../api/DanhGiaAPI", () => ({
  layTrangDanhGia: jest.fn(),
  layQuyenDanhGia: jest.fn(),
  themDanhGiaMoi: jest.fn(),
  xoaDanhGia: jest.fn(),
  doiBinhChonHuuIch: jest.fn(),
}));

const layTrangMock = layTrangDanhGia as jest.MockedFunction<typeof layTrangDanhGia>;
const layQuyenMock = layQuyenDanhGia as jest.MockedFunction<typeof layQuyenDanhGia>;
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

describe("DanhGiaSanPham — quyền đánh giá", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    mockedUseAuth.mockReturnValue({ status: "guest", uid: null, username: null, roles: [], capabilities: [] });
    layTrangMock.mockResolvedValue(trangRong());
  });

  it("không hiện lời mời đăng nhập khi trạng thái xác thực chưa xác định", async () => {
    mockedUseAuth.mockReturnValue({ status: "unknown", uid: null, username: null, roles: [], capabilities: [] });

    renderComponent();

    await screen.findByText("Đánh giá từ khách hàng");
    expect(screen.queryByText("Đăng nhập để đánh giá")).not.toBeInTheDocument();
    expect(layQuyenMock).not.toHaveBeenCalled();
  });

  it("mời đăng nhập khi phiên đã xác định là khách, và không hỏi quyền", async () => {
    renderComponent();

    expect(await screen.findByText("Đăng nhập để đánh giá")).toBeInTheDocument();
    expect(layQuyenMock).not.toHaveBeenCalled();
  });

  it("hiện form khi backend nói được đánh giá", async () => {
    mockedUseAuth.mockReturnValue({ status: "authenticated", uid: 1, username: "reader", roles: ["USER"], capabilities: ["USER"] });
    layQuyenMock.mockResolvedValue({ coThe: true, maDonHang: 42, lyDo: null });

    renderComponent();

    expect(await screen.findByText("Gửi đánh giá")).toBeInTheDocument();
  });

  it("xóa trạng thái ghi dở và hỏi lại quyền khi chuyển trực tiếp sang uid khác", async () => {
    let auth = { status: "authenticated" as const, uid: 1, username: "reader-a", roles: ["USER"], capabilities: ["USER"] };
    mockedUseAuth.mockImplementation(() => auth);
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: jest.fn(() => "blob:draft"),
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: jest.fn(),
    });
    layQuyenMock
      .mockResolvedValueOnce({ coThe: true, maDonHang: 42, lyDo: null })
      .mockResolvedValueOnce({ coThe: false, maDonHang: null, lyDo: "CHUA_MUA" });

    const view = renderComponent();
    const input = await screen.findByLabelText("Nhận xét:");
    const file = new File(["jpeg"], "draft.jpg", { type: "image/jpeg" });
    await userEvent.type(input, "Bản nháp của tài khoản A");
    await userEvent.upload(screen.getByLabelText("Chọn ảnh đánh giá"), file);
    expect(screen.getByText("Đã chọn 1/5 ảnh.")).toBeInTheDocument();

    auth = { status: "authenticated", uid: 2, username: "reader-b", roles: ["USER"], capabilities: ["USER"] };
    view.rerender(
      <MemoryRouter>
        <DanhGiaSanPham maSach={7} />
      </MemoryRouter>
    );

    expect(await screen.findByText("Chỉ khách đã mua và nhận cuốn sách này mới đánh giá được.")).toBeInTheDocument();
    expect(screen.queryByDisplayValue("Bản nháp của tài khoản A")).not.toBeInTheDocument();
    expect(screen.queryByText("Đã chọn 1/5 ảnh.")).not.toBeInTheDocument();
    expect(layQuyenMock).toHaveBeenCalledTimes(2);
  });

  it("giữ nội dung đang gõ khi phiên tạm về trạng thái chưa xác định", async () => {
    let auth = { status: "authenticated" as const, uid: 1, username: "reader", roles: ["USER"], capabilities: ["USER"] } as ReturnType<typeof useAuthSession>;
    mockedUseAuth.mockImplementation(() => auth);
    layQuyenMock.mockResolvedValue({ coThe: true, maDonHang: 42, lyDo: null });

    const view = renderComponent();
    await userEvent.type(await screen.findByLabelText("Nhận xét:"), "Bản nháp giữ nguyên");

    auth = { status: "unknown", uid: null, username: null, roles: [], capabilities: [] };
    view.rerender(
      <MemoryRouter>
        <DanhGiaSanPham maSach={7} />
      </MemoryRouter>
    );

    expect(screen.getByDisplayValue("Bản nháp giữ nguyên")).toBeInTheDocument();
    expect(screen.queryByText("Đăng nhập để đánh giá")).not.toBeInTheDocument();

    auth = { status: "authenticated", uid: 1, username: "reader", roles: ["USER"], capabilities: ["USER"] };
    view.rerender(
      <MemoryRouter>
        <DanhGiaSanPham maSach={7} />
      </MemoryRouter>
    );

    expect(screen.getByDisplayValue("Bản nháp giữ nguyên")).toBeInTheDocument();
  });

  // Bon ly do phai ra bon thong diep. Mot thong bao chung se bat nguoi dung tu doan
  // minh dang thieu gi — mua hang, doi giao hang, hay khong con duong nao.
  it.each([
    ["CHUA_MUA", "Chỉ khách đã mua và nhận cuốn sách này mới đánh giá được."],
    ["CHUA_NHAN_HANG", "Đơn của bạn chưa được giao xong. Bạn đánh giá được ngay sau khi nhận hàng."],
    ["DA_DANH_GIA", "Bạn đã đánh giá cuốn sách này rồi."],
    ["DA_BI_AN", "Đánh giá của bạn cho cuốn sách này đã bị ẩn nên không thể đăng lại."],
  ] as const)("hiện đúng thông điệp cho lý do %s", async (lyDo, thongDiep) => {
    mockedUseAuth.mockReturnValue({ status: "authenticated", uid: 1, username: "reader", roles: ["USER"], capabilities: ["USER"] });
    layQuyenMock.mockResolvedValue({ coThe: false, maDonHang: null, lyDo });

    renderComponent();

    expect(await screen.findByText(thongDiep)).toBeInTheDocument();
    expect(screen.queryByText("Gửi đánh giá")).not.toBeInTheDocument();
  });

  // Doc va viet la hai viec doc lap: endpoint quyen hong khong duoc lam mat danh sach
  // danh gia da tai ve thanh cong.
  it("vẫn hiện danh sách đánh giá khi endpoint quyền lỗi", async () => {
    mockedUseAuth.mockReturnValue({ status: "authenticated", uid: 1, username: "reader", roles: ["USER"], capabilities: ["USER"] });
    layQuyenMock.mockRejectedValue(new Error("mạng lỗi"));
    layTrangMock.mockResolvedValue({
      ...trangRong(),
      // timestamp de trong: component bo qua buoc dinh dang ngay, tranh phu thuoc vao
      // locale date-fns da bi mock o tren.
      content: [{ maDanhGia: 1, nhanXet: "Sách hay", diemXepHang: 5, timestamp: "", tenHienThi: "Nguyễn V. A.", laCuaToi: false, soLuotHuuIch: 0, toiDaBinhChon: false, phanHoiShop: null, phanHoiShopTai: null, anhDinhKem: [] }],
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
