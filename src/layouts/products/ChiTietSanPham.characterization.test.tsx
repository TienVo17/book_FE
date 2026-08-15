import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import ChiTietSanPham from "./ChiTietSanPham";
import { getBookByIdentifier, getSachLienQuan } from "../../api/SachApi";
import { useAuthSession } from "../../api/AuthSession";
import { themVaoGioHang } from "../utils/GioHangUtils";
import {
  setBookWishlisted,
  useWishlist,
} from "../../api/WishlistSession";
import { toast } from "react-toastify";

jest.mock("../../api/SachApi", () => ({ getBookByIdentifier: jest.fn(), getSachLienQuan: jest.fn() }));
jest.mock("../../api/SeoApi", () => ({ getSeoMeta: () => Promise.resolve(null) }));
jest.mock("../utils/SeoMeta", () => ({ applySeoMeta: jest.fn(), resetSeoMeta: jest.fn() }));
jest.mock("../../api/AuthSession", () => ({ useAuthSession: jest.fn() }));
jest.mock("../utils/GioHangUtils", () => ({ themVaoGioHang: jest.fn() }));
jest.mock("react-toastify", () => ({
  toast: {
    error: jest.fn(),
    info: jest.fn(),
    success: jest.fn(),
  },
}));
jest.mock("../../api/WishlistSession", () => ({
  useWishlist: jest.fn(() => ({ items: [], status: "guest", error: null, pendingBookIds: [] })),
  isBookWishlisted: jest.fn(() => false),
  setBookWishlisted: jest.fn(),
}));
jest.mock("./components/HinhAnhSanPham", () => ({ __esModule: true, default: () => null }));
jest.mock("./components/DanhGiaSanPham", () => ({ __esModule: true, default: () => null, renderStars: () => null }));
jest.mock("./components/SachProps", () => ({ __esModule: true, default: () => null }));

const mockedGetBook = getBookByIdentifier as jest.MockedFunction<typeof getBookByIdentifier>;
const mockedGetRelated = getSachLienQuan as jest.MockedFunction<typeof getSachLienQuan>;
const mockedUseAuth = useAuthSession as jest.MockedFunction<typeof useAuthSession>;
const mockedUseWishlist = useWishlist as jest.MockedFunction<typeof useWishlist>;
const mockedSetBookWishlisted = setBookWishlisted as jest.MockedFunction<typeof setBookWishlisted>;
const mockedAddToCart = themVaoGioHang as jest.MockedFunction<typeof themVaoGioHang>;
const book = { maSach: 101, tenSach: "Sách mới", giaBan: 150000, soLuong: 10, tenTacGia: "Tác giả" };

function ViTriHienTai(): JSX.Element { const location = useLocation(); return <output data-testid="vi-tri">{location.pathname}</output>; }
function renderDetail(): void { render(<MemoryRouter initialEntries={["/sach/101"]}><ChiTietSanPham /><ViTriHienTai /></MemoryRouter>); }

describe("ChiTietSanPham buy-now AuthSession behavior", () => {
  beforeEach(() => {
    localStorage.clear(); jest.clearAllMocks();
    mockedGetBook.mockResolvedValue(book); mockedGetRelated.mockResolvedValue([]); mockedAddToCart.mockResolvedValue(true);
    mockedUseWishlist.mockReturnValue({ items: [], status: "guest", error: null, pendingBookIds: [] });
  });
  it("does not classify unknown authentication as guest", async () => {
    mockedUseAuth.mockReturnValue({ status: "unknown", uid: null, username: null, roles: [], capabilities: [] });
    renderDetail();
    fireEvent.click(await screen.findByRole("button", { name: "Mua ngay" }));
    expect(mockedAddToCart).not.toHaveBeenCalled();
    expect(localStorage.getItem("nextPay")).toBeNull();
    expect(screen.getByTestId("vi-tri")).toHaveTextContent("/sach/101");
  });
  it("does not mutate wishlist or show guest/error feedback while authentication is unknown", async () => {
    mockedUseAuth.mockReturnValue({ status: "unknown", uid: null, username: null, roles: [], capabilities: [] });
    renderDetail();

    fireEvent.click(await screen.findByRole("button", { name: "Yêu thích" }));

    expect(mockedSetBookWishlisted).not.toHaveBeenCalled();
    expect(toast.info).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
  });
  it("sends guests to login without mutating cart", async () => {
    mockedUseAuth.mockReturnValue({ status: "guest", uid: null, username: null, roles: [], capabilities: [] });
    renderDetail();
    fireEvent.click(await screen.findByRole("button", { name: "Mua ngay" }));
    expect(mockedAddToCart).not.toHaveBeenCalled();
    expect(localStorage.getItem("nextPay")).toBe("true");
    await waitFor(() => expect(screen.getByTestId("vi-tri")).toHaveTextContent("/dang-nhap"));
  });
  it("adds the book and proceeds to checkout for an authenticated account", async () => {
    mockedUseAuth.mockReturnValue({ status: "authenticated", uid: 1, username: "reader", roles: ["USER"], capabilities: ["USER"] });
    renderDetail();
    fireEvent.click(await screen.findByRole("button", { name: "Mua ngay" }));
    await waitFor(() => expect(mockedAddToCart).toHaveBeenCalledWith(book, 1));
    await waitFor(() => expect(screen.getByTestId("vi-tri")).toHaveTextContent("/thanh-toan"));
  });
});
