import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import ChiTietSanPham from "./ChiTietSanPham";
import { getBookByIdentifier, getSachLienQuan } from "../../api/SachApi";
import { getDanhSachYeuThich } from "../../api/YeuThichApi";
import { addServerCartItem, getServerCart, mergeGuestCart } from "../../api/CartApi";

jest.mock("../../api/SachApi", () => ({
  getBookByIdentifier: jest.fn(),
  getSachLienQuan: jest.fn(),
}));

jest.mock("../../api/YeuThichApi", () => ({
  getDanhSachYeuThich: jest.fn(),
  themYeuThich: jest.fn(),
  xoaYeuThich: jest.fn(),
}));

jest.mock("../../api/CartApi", () => ({
  addServerCartItem: jest.fn(),
  getServerCart: jest.fn(),
  mergeGuestCart: jest.fn(),
  removeServerCartItem: jest.fn(),
  updateServerCartItem: jest.fn(),
}));

jest.mock("./components/HinhAnhSanPham", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("./components/DanhGiaSanPham", () => ({
  __esModule: true,
  default: () => null,
  renderStars: () => null,
}));

jest.mock("./components/SachProps", () => ({
  __esModule: true,
  default: () => null,
}));

const mockedGetBookById = getBookByIdentifier as jest.MockedFunction<typeof getBookByIdentifier>;
const mockedGetSachLienQuan = getSachLienQuan as jest.MockedFunction<typeof getSachLienQuan>;
const mockedGetDanhSachYeuThich = getDanhSachYeuThich as jest.MockedFunction<typeof getDanhSachYeuThich>;
const mockedAddServerCartItem = addServerCartItem as jest.MockedFunction<typeof addServerCartItem>;
const mockedGetServerCart = getServerCart as jest.MockedFunction<typeof getServerCart>;
const mockedMergeGuestCart = mergeGuestCart as jest.MockedFunction<typeof mergeGuestCart>;

const sachDangXem = {
  maSach: 101,
  tenSach: "Sách mới",
  giaBan: 150000,
  soLuong: 10,
  tenTacGia: "Tác giả",
  danhSachAnh: [{ maHinhAnh: 1, urlHinh: "https://example.test/bia-sach-moi.jpg" }],
};

const gioHangTonTai = [
  {
    maSach: 7,
    sachDto: {
      tenSach: "Sách đã có trong giỏ",
      giaBan: 90000,
      hinhAnh: "https://example.test/bia-sach-cu.jpg",
    },
    soLuong: 2,
  },
];

function ViTriHienTai(): JSX.Element {
  const location = useLocation();
  return <output data-testid="vi-tri-hien-tai">{location.pathname}</output>;
}

function renderTrangChiTiet(): void {
  render(
    <MemoryRouter initialEntries={["/sach/101"]}>
      <ChiTietSanPham />
      <ViTriHienTai />
    </MemoryRouter>,
  );
}

function taoJwtConHan(): string {
  const payload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 60 }));
  return `header.${payload}.signature`;
}

describe("ChiTietSanPham buy-now (Phase 2 behavior)", () => {
  beforeEach(() => {
    localStorage.clear();
    mockedGetBookById.mockResolvedValue(sachDangXem);
    mockedGetSachLienQuan.mockResolvedValue([]);
    mockedGetDanhSachYeuThich.mockResolvedValue([]);
    mockedGetServerCart.mockResolvedValue({ items: [], tongSoLuong: 0, tongTien: 0 });
    mockedMergeGuestCart.mockResolvedValue({
      items: [],
      tongSoLuong: 0,
      tongTien: 0,
      mergedCount: 0,
      adjustedItems: [],
      removedItems: [],
    });
    mockedAddServerCartItem.mockResolvedValue({
      items: [{
        maSach: 101,
        sachDto: { tenSach: "Sách mới", giaBan: 150000, hinhAnh: "" },
        soLuong: 1,
        soLuongTonKho: 10,
      }],
      tongSoLuong: 1,
      tongTien: 150000,
    });
  });

  afterEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  it("guest: does not mutate the existing cart, sets a return-to-checkout flag and routes to login", async () => {
    localStorage.setItem("gioHang", JSON.stringify(gioHangTonTai));
    renderTrangChiTiet();
    fireEvent.click(await screen.findByRole("button", { name: "Mua ngay" }));

    // Cart must remain untouched before auth is validated.
    expect(JSON.parse(localStorage.getItem("gioHang") || "[]")).toEqual(gioHangTonTai);
    expect(localStorage.getItem("nextPay")).toBe("true");
    await waitFor(() => {
      expect(screen.getByTestId("vi-tri-hien-tai")).toHaveTextContent("/dang-nhap");
    });
  });

  it("authenticated, empty cart: adds the selected item and routes to checkout", async () => {
    localStorage.setItem("jwt", taoJwtConHan());
    renderTrangChiTiet();
    fireEvent.click(await screen.findByRole("button", { name: "Mua ngay" }));

    await waitFor(() => {
      expect(JSON.parse(localStorage.getItem("gioHang") || "[]")).toEqual([
        {
          maSach: 101,
          sachDto: {
            tenSach: "Sách mới",
            giaBan: 150000,
            hinhAnh: "",
          },
          soLuong: 1,
          soLuongTonKho: 10,
        },
      ]);
    });
    await waitFor(() => {
      expect(screen.getByTestId("vi-tri-hien-tai")).toHaveTextContent("/thanh-toan");
    });
  });

  it("authenticated, existing cart with a different item: merges the selected item while preserving the existing line", async () => {
    localStorage.setItem("gioHang", JSON.stringify(gioHangTonTai));
    localStorage.setItem("jwt", taoJwtConHan());
    mockedMergeGuestCart.mockResolvedValue({
      items: gioHangTonTai,
      tongSoLuong: 2,
      tongTien: 180000,
      mergedCount: 1,
      adjustedItems: [],
      removedItems: [],
    });
    mockedGetServerCart.mockResolvedValue({ items: gioHangTonTai, tongSoLuong: 2, tongTien: 180000 });
    mockedAddServerCartItem.mockResolvedValue({
      items: [
        gioHangTonTai[0],
        {
          maSach: 101,
          sachDto: { tenSach: "Sách mới", giaBan: 150000, hinhAnh: "" },
          soLuong: 1,
          soLuongTonKho: 10,
        },
      ],
      tongSoLuong: 3,
      tongTien: 330000,
    });
    renderTrangChiTiet();
    fireEvent.click(await screen.findByRole("button", { name: "Mua ngay" }));

    await waitFor(() => {
      const gioHangSau = JSON.parse(localStorage.getItem("gioHang") || "[]");
      expect(gioHangSau).toEqual([
        gioHangTonTai[0],
        {
          maSach: 101,
          sachDto: {
            tenSach: "Sách mới",
            giaBan: 150000,
            hinhAnh: "",
          },
          soLuong: 1,
          soLuongTonKho: 10,
        },
      ]);
    });
    await waitFor(() => {
      expect(screen.getByTestId("vi-tri-hien-tai")).toHaveTextContent("/thanh-toan");
    });
  });
});
