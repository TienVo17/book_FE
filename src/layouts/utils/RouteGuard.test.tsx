import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import RouteGuard from "./RouteGuard";
import { getAuthSnapshot, useAuthSession } from "../../api/AuthSession";

jest.mock("../../api/AuthSession", () => ({
  getAuthSnapshot: jest.fn(),
  useAuthSession: jest.fn(),
}));

const mockedGetAuthSnapshot = getAuthSnapshot as jest.MockedFunction<typeof getAuthSnapshot>;
const mockedUseAuthSession = useAuthSession as jest.MockedFunction<typeof useAuthSession>;

function Trang({ nhan }: { nhan: string }): JSX.Element {
  return <output data-testid="noi-dung-trang">{nhan}</output>;
}

function TrangTheoTaiKhoan({ uid }: { uid: number }): JSX.Element {
  const [uidLucMount] = React.useState(uid);
  return <output data-testid="uid-luc-mount">{uidLucMount}</output>;
}

function ViTriHienTai(): JSX.Element {
  const location = useLocation();
  return <output data-testid="vi-tri-hien-tai">{location.pathname}</output>;
}

function renderTaiDuongDan(duongDan: string): void {
  render(
    <MemoryRouter initialEntries={[duongDan]}>
      <Routes>
        <Route
          path="/quan-ly/*"
          element={<RouteGuard require="admin"><Trang nhan="ADMIN" /></RouteGuard>}
        />
        <Route
          path="/profile"
          element={<RouteGuard require="user"><Trang nhan="PROFILE" /></RouteGuard>}
        />
        <Route path="/dang-nhap" element={<Trang nhan="DANG_NHAP" />} />
        <Route path="/" element={<Trang nhan="HOME" />} />
      </Routes>
      <ViTriHienTai />
    </MemoryRouter>,
  );
}

describe("RouteGuard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("keeps the route neutral while authentication bootstrap is unknown", () => {
    mockedGetAuthSnapshot.mockReturnValue({ status: "unknown", uid: null, username: null, roles: [], capabilities: [] });
    mockedUseAuthSession.mockReturnValue({ status: "unknown", uid: null, username: null, roles: [], capabilities: [] });

    renderTaiDuongDan("/profile");

    expect(screen.getByText(/đang xác thực/i)).toBeInTheDocument();
    expect(screen.getByTestId("vi-tri-hien-tai")).toHaveTextContent("/profile");
    expect(screen.queryByTestId("noi-dung-trang")).not.toBeInTheDocument();
  });

  it("redirects a guest user to login", () => {
    mockedGetAuthSnapshot.mockReturnValue({ status: "guest", uid: null, username: null, roles: [], capabilities: [] });
    mockedUseAuthSession.mockReturnValue({ status: "guest", uid: null, username: null, roles: [], capabilities: [] });

    renderTaiDuongDan("/profile");

    expect(screen.getByTestId("vi-tri-hien-tai")).toHaveTextContent("/dang-nhap");
  });

  it("remounts private content when authenticated uid changes", () => {
    const accountA = { status: "authenticated" as const, uid: 1, username: "reader-a", roles: ["USER"], capabilities: ["USER"] };
    const accountB = { ...accountA, uid: 2, username: "reader-b" };
    let currentAuth = accountA;
    mockedGetAuthSnapshot.mockImplementation(() => currentAuth);
    mockedUseAuthSession.mockImplementation(() => currentAuth);

    const view = render(
      <MemoryRouter>
        <RouteGuard require="user">
          <TrangTheoTaiKhoan uid={currentAuth.uid} />
        </RouteGuard>
      </MemoryRouter>,
    );
    expect(screen.getByTestId("uid-luc-mount")).toHaveTextContent("1");

    currentAuth = accountB;
    view.rerender(
      <MemoryRouter>
        <RouteGuard require="user">
          <TrangTheoTaiKhoan uid={currentAuth.uid} />
        </RouteGuard>
      </MemoryRouter>,
    );

    expect(screen.getByTestId("uid-luc-mount")).toHaveTextContent("2");
  });

  it("allows any authenticated account through a user route", () => {
    const auth = { status: "authenticated" as const, uid: 2, username: "staff", roles: ["STAFF"], capabilities: ["STAFF"] };
    mockedGetAuthSnapshot.mockReturnValue(auth);
    mockedUseAuthSession.mockReturnValue(auth);

    renderTaiDuongDan("/profile");

    expect(screen.getByTestId("noi-dung-trang")).toHaveTextContent("PROFILE");
  });

  it("allows ADMIN through an admin route", () => {
    const auth = { status: "authenticated" as const, uid: 1, username: "admin", roles: ["ADMIN"], capabilities: ["ADMIN"] };
    mockedGetAuthSnapshot.mockReturnValue(auth);
    mockedUseAuthSession.mockReturnValue(auth);

    renderTaiDuongDan("/quan-ly/danh-sach-sach");

    expect(screen.getByTestId("noi-dung-trang")).toHaveTextContent("ADMIN");
  });

  it("redirects a STAFF account home from an admin route", () => {
    const auth = { status: "authenticated" as const, uid: 2, username: "staff", roles: ["STAFF"], capabilities: ["STAFF"] };
    mockedGetAuthSnapshot.mockReturnValue(auth);
    mockedUseAuthSession.mockReturnValue(auth);

    renderTaiDuongDan("/quan-ly/danh-sach-sach");

    expect(screen.getByTestId("vi-tri-hien-tai")).toHaveTextContent("/");
  });
});
