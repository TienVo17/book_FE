import React, { act } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import Navbar from "./Navbar";
import { getAllTheLoai } from "../../api/TheLoaiApi";
import { getGoiYTimKiem, SachGoiYModel } from "../../api/SachApi";
import { getAuthSnapshot, logoutAuth, useAuthSession } from "../../api/AuthSession";
import { loadCart, readCartForCurrentSession, signOutCartSession } from "../../api/CartSession";

jest.mock("../../api/TheLoaiApi", () => ({ getAllTheLoai: jest.fn() }));
jest.mock("../../api/SachApi", () => ({ getGoiYTimKiem: jest.fn() }));
jest.mock("../../api/AuthSession", () => ({
  getAuthSnapshot: jest.fn(), useAuthSession: jest.fn(), logoutAuth: jest.fn(),
}));
jest.mock("../../api/CartSession", () => ({
  loadCart: jest.fn(() => Promise.resolve([])),
  readCartForCurrentSession: jest.fn(() => []),
  signOutCartSession: jest.fn(),
}));

const mockedGetAllTheLoai = getAllTheLoai as jest.MockedFunction<typeof getAllTheLoai>;
const mockedGetGoiYTimKiem = getGoiYTimKiem as jest.MockedFunction<typeof getGoiYTimKiem>;
const mockedGetAuthSnapshot = getAuthSnapshot as jest.MockedFunction<typeof getAuthSnapshot>;
const mockedUseAuthSession = useAuthSession as jest.MockedFunction<typeof useAuthSession>;
const mockedLogoutAuth = logoutAuth as jest.MockedFunction<typeof logoutAuth>;
const mockedLoadCart = loadCart as jest.MockedFunction<typeof loadCart>;
const mockedReadCart = readCartForCurrentSession as jest.MockedFunction<typeof readCartForCurrentSession>;
const mockedSignOutCart = signOutCartSession as jest.MockedFunction<typeof signOutCartSession>;

function ViTriHienTai(): JSX.Element {
  const location = useLocation();
  return <output data-testid="vi-tri-hien-tai">{location.pathname}{location.search}</output>;
}

function renderNavbar(path = "/"): void {
  render(<MemoryRouter initialEntries={[path]}><Navbar /><ViTriHienTai /></MemoryRouter>);
}

function goiY(overrides: Partial<SachGoiYModel>): SachGoiYModel {
  return { maSach: 1, tenSach: "Sách mẫu", slug: "sach-mau", urlAnh: "", giaBan: 10000, ...overrides };
}

describe("Navbar AuthSession", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetAllTheLoai.mockResolvedValue([]);
    mockedGetGoiYTimKiem.mockResolvedValue([]);
    mockedGetAuthSnapshot.mockReturnValue({ status: "guest", uid: null, username: null, roles: [], capabilities: [] });
    mockedUseAuthSession.mockReturnValue({ status: "guest", uid: null, username: null, roles: [], capabilities: [] });
    mockedLogoutAuth.mockResolvedValue({ status: "guest", uid: null, username: null, roles: [], capabilities: [] });
    mockedLoadCart.mockResolvedValue([]);
    mockedReadCart.mockReturnValue([]);
  });

  it("does not render guest or account CTAs while authentication is unknown", () => {
    mockedGetAuthSnapshot.mockReturnValue({ status: "unknown", uid: null, username: null, roles: [], capabilities: [] });
    mockedUseAuthSession.mockReturnValue({ status: "unknown", uid: null, username: null, roles: [], capabilities: [] });

    renderNavbar();

    expect(screen.getByTestId("auth-pending")).toHaveTextContent(/đang xác thực/i);
    expect(screen.queryByRole("link", { name: /đăng nhập/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /reader/i })).not.toBeInTheDocument();
  });

  it("uses the in-memory authenticated identity and grants management only to ADMIN", () => {
    const auth = { status: "authenticated" as const, uid: 1, username: "admin", roles: ["ADMIN"], capabilities: ["ADMIN"] };
    mockedGetAuthSnapshot.mockReturnValue(auth);
    mockedUseAuthSession.mockReturnValue(auth);
    renderNavbar();

    fireEvent.click(screen.getByRole("button", { name: /admin/i }));
    expect(screen.getByRole("link", { name: /quản lý/i })).toBeInTheDocument();
  });

  it("hydrates a different account cart when authenticated uid changes", async () => {
    const accountA = {
      status: "authenticated" as const,
      uid: 1,
      username: "reader-a",
      roles: ["USER"],
      capabilities: ["USER"],
    };
    const accountB = {
      ...accountA,
      uid: 2,
      username: "reader-b",
    };
    let currentAuth = accountA;
    mockedGetAuthSnapshot.mockImplementation(() => currentAuth);
    mockedUseAuthSession.mockImplementation(() => currentAuth);
    mockedLoadCart
      .mockResolvedValueOnce([{ maSach: 1, soLuong: 1 } as ReturnType<typeof mockedReadCart>[number]])
      .mockResolvedValueOnce([{ maSach: 2, soLuong: 3 } as ReturnType<typeof mockedReadCart>[number]]);

    const view = render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(mockedLoadCart).toHaveBeenCalledTimes(1);
      expect(screen.getByText("1", { selector: ".cart-badge" })).toBeInTheDocument();
    });

    currentAuth = accountB;
    act(() => {
      view.rerender(
        <MemoryRouter>
          <Navbar />
        </MemoryRouter>,
      );
    });

    await waitFor(() => {
      expect(mockedLoadCart).toHaveBeenCalledTimes(2);
      expect(screen.getByText("3", { selector: ".cart-badge" })).toBeInTheDocument();
    });
  });

  it("logs out through AuthSession and performs cart cleanup without legacy auth events", async () => {
    const auth = { status: "authenticated" as const, uid: 1, username: "reader", roles: ["USER"], capabilities: ["USER"] };
    mockedGetAuthSnapshot.mockReturnValue(auth);
    mockedUseAuthSession.mockReturnValue(auth);
    renderNavbar("/profile");

    fireEvent.click(screen.getByRole("button", { name: /reader/i }));
    fireEvent.click(screen.getByRole("button", { name: /đăng xuất/i }));

    await waitFor(() => expect(mockedLogoutAuth).toHaveBeenCalledTimes(1));
    expect(mockedSignOutCart).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("vi-tri-hien-tai")).toHaveTextContent("/");
  });

  it("still logs out when local cart cleanup throws", async () => {
    const auth = { status: "authenticated" as const, uid: 1, username: "reader", roles: ["USER"], capabilities: ["USER"] };
    mockedGetAuthSnapshot.mockReturnValue(auth);
    mockedUseAuthSession.mockReturnValue(auth);
    mockedSignOutCart.mockImplementation(() => {
      throw new DOMException("storage blocked", "SecurityError");
    });
    renderNavbar("/profile");

    fireEvent.click(screen.getByRole("button", { name: /reader/i }));
    fireEvent.click(screen.getByRole("button", { name: /đăng xuất/i }));

    await waitFor(() => expect(mockedLogoutAuth).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId("vi-tri-hien-tai")).toHaveTextContent("/");
  });
});

describe("Navbar - tìm kiếm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetAllTheLoai.mockResolvedValue([]);
    mockedReadCart.mockReturnValue([]);
    mockedLoadCart.mockResolvedValue([]);
    mockedGetAuthSnapshot.mockReturnValue({ status: "guest", uid: null, username: null, roles: [], capabilities: [] });
    mockedUseAuthSession.mockReturnValue({ status: "guest", uid: null, username: null, roles: [], capabilities: [] });
  });

  it("tìm kiếm từ trang khác tới /tim-kiem?q", () => {
    renderNavbar("/gio-hang");
    fireEvent.change(screen.getByRole("combobox", { name: /tìm kiếm sách/i }), { target: { value: "harry potter" } });
    fireEvent.click(screen.getByRole("button", { name: "Tìm kiếm" }));
    expect(screen.getByTestId("vi-tri-hien-tai")).toHaveTextContent("/tim-kiem?q=harry%20potter");
  });

  it("debounces search suggestions", async () => {
    mockedGetGoiYTimKiem.mockResolvedValue([goiY({})]);
    renderNavbar();
    fireEvent.change(screen.getByRole("combobox", { name: /tìm kiếm sách/i }), { target: { value: "ab" } });
    await waitFor(() => expect(mockedGetGoiYTimKiem).toHaveBeenCalledWith("ab"));
    expect(screen.getByRole("listbox")).toBeInTheDocument();
  });
});
