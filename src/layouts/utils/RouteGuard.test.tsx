import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import RouteGuard from "./RouteGuard";

// Route content stand-ins. Real page components are exercised by their own
// suites; this table only needs to prove which content (or redirect target)
// is reachable for a given token state.
function Trang({ nhan }: { nhan: string }) {
  return <output data-testid="noi-dung-trang">{nhan}</output>;
}

function ViTriHienTai() {
  const location = useLocation();
  return <output data-testid="vi-tri-hien-tai">{location.pathname}</output>;
}

/**
 * Mirrors the target App.tsx route matrix from the Phase 2 plan:
 *   /profile, /dia-chi, /yeu-thich, /order, /order/:id, /thanh-toan -> require "user"
 *   /xu-ly-kq-thanh-toan                                -> public, no guard
 *   /quan-ly/*                                          -> require "admin"
 */
function renderTaiDuongDan(duongDan: string) {
  render(
    <MemoryRouter initialEntries={[duongDan]}>
      <Routes>
        <Route
          path="/quan-ly/*"
          element={
            <RouteGuard require="admin">
              <Trang nhan="ADMIN" />
            </RouteGuard>
          }
        />
        <Route
          path="/profile"
          element={
            <RouteGuard require="user">
              <Trang nhan="PROFILE" />
            </RouteGuard>
          }
        />
        <Route
          path="/dia-chi"
          element={
            <RouteGuard require="user">
              <Trang nhan="DIA_CHI" />
            </RouteGuard>
          }
        />
        <Route
          path="/yeu-thich"
          element={
            <RouteGuard require="user">
              <Trang nhan="YEU_THICH" />
            </RouteGuard>
          }
        />
        <Route
          path="/order/:maDonHang"
          element={
            <RouteGuard require="user">
              <Trang nhan="ORDER_DETAIL" />
            </RouteGuard>
          }
        />
        <Route
          path="/order"
          element={
            <RouteGuard require="user">
              <Trang nhan="ORDER" />
            </RouteGuard>
          }
        />
        <Route
          path="/thanh-toan"
          element={
            <RouteGuard require="user">
              <Trang nhan="THANH_TOAN" />
            </RouteGuard>
          }
        />
        <Route path="/xu-ly-kq-thanh-toan" element={<Trang nhan="KET_QUA_THANH_TOAN" />} />
        <Route path="/dang-nhap" element={<Trang nhan="DANG_NHAP" />} />
        <Route path="/" element={<Trang nhan="HOME" />} />
      </Routes>
      <ViTriHienTai />
    </MemoryRouter>,
  );
}

function taoJwt(payload: Record<string, unknown>): string {
  const encoded = btoa(JSON.stringify(payload));
  return `header.${encoded}.signature`;
}

const mot_gio_sau = Math.floor(Date.now() / 1000) + 3600;
const mot_gio_truoc = Math.floor(Date.now() / 1000) - 3600;

const TOKEN = {
  MALFORMED: "khong-phai-jwt-hop-le",
  EXPIRED: taoJwt({ exp: mot_gio_truoc, isAdmin: false, isStaff: false }),
  VALID_USER: taoJwt({ exp: mot_gio_sau, isAdmin: false, isStaff: false }),
  STAFF_ONLY: taoJwt({ exp: mot_gio_sau, isAdmin: false, isStaff: true }),
  VALID_ADMIN: taoJwt({ exp: mot_gio_sau, isAdmin: true, isStaff: false }),
};

function datToken(token: string | null) {
  if (token === null) {
    localStorage.removeItem("jwt");
  } else {
    localStorage.setItem("jwt", token);
  }
}

const CAC_DUONG_DAN_YEU_CAU_USER: Array<{ duongDan: string; nhan: string }> = [
  { duongDan: "/profile", nhan: "PROFILE" },
  { duongDan: "/dia-chi", nhan: "DIA_CHI" },
  { duongDan: "/yeu-thich", nhan: "YEU_THICH" },
  { duongDan: "/order", nhan: "ORDER" },
  { duongDan: "/order/7", nhan: "ORDER_DETAIL" },
  { duongDan: "/thanh-toan", nhan: "THANH_TOAN" },
];

describe("RouteGuard", () => {
  afterEach(() => {
    localStorage.clear();
  });

  describe.each(CAC_DUONG_DAN_YEU_CAU_USER)(
    "require=user route $duongDan",
    ({ duongDan, nhan }) => {
      it("thiếu token -> chuyển hướng /dang-nhap", () => {
        datToken(null);
        renderTaiDuongDan(duongDan);
        expect(screen.getByTestId("vi-tri-hien-tai")).toHaveTextContent("/dang-nhap");
        expect(localStorage.getItem("jwt")).toBeNull();
      });

      it("token sai định dạng -> xóa token và chuyển hướng /dang-nhap", () => {
        datToken(TOKEN.MALFORMED);
        renderTaiDuongDan(duongDan);
        expect(screen.getByTestId("vi-tri-hien-tai")).toHaveTextContent("/dang-nhap");
        expect(localStorage.getItem("jwt")).toBeNull();
      });

      it("token hết hạn -> xóa token và chuyển hướng /dang-nhap", () => {
        datToken(TOKEN.EXPIRED);
        renderTaiDuongDan(duongDan);
        expect(screen.getByTestId("vi-tri-hien-tai")).toHaveTextContent("/dang-nhap");
        expect(localStorage.getItem("jwt")).toBeNull();
      });

      it("token USER hợp lệ -> vào được trang", () => {
        datToken(TOKEN.VALID_USER);
        renderTaiDuongDan(duongDan);
        expect(screen.getByTestId("noi-dung-trang")).toHaveTextContent(nhan);
        expect(localStorage.getItem("jwt")).toBe(TOKEN.VALID_USER);
      });

      it("token isStaff:true/isAdmin:false vẫn là JWT hợp lệ -> vào được trang", () => {
        datToken(TOKEN.STAFF_ONLY);
        renderTaiDuongDan(duongDan);
        expect(screen.getByTestId("noi-dung-trang")).toHaveTextContent(nhan);
        expect(localStorage.getItem("jwt")).toBe(TOKEN.STAFF_ONLY);
      });

      it("token ADMIN hợp lệ -> vào được trang", () => {
        datToken(TOKEN.VALID_ADMIN);
        renderTaiDuongDan(duongDan);
        expect(screen.getByTestId("noi-dung-trang")).toHaveTextContent(nhan);
        expect(localStorage.getItem("jwt")).toBe(TOKEN.VALID_ADMIN);
      });
    },
  );

  describe("require=admin route /quan-ly/*", () => {
    it("thiếu token -> chuyển hướng /dang-nhap", () => {
      datToken(null);
      renderTaiDuongDan("/quan-ly/danh-sach-sach");
      expect(screen.getByTestId("vi-tri-hien-tai")).toHaveTextContent("/dang-nhap");
    });

    it("token sai định dạng -> xóa token và chuyển hướng /dang-nhap", () => {
      datToken(TOKEN.MALFORMED);
      renderTaiDuongDan("/quan-ly/danh-sach-sach");
      expect(screen.getByTestId("vi-tri-hien-tai")).toHaveTextContent("/dang-nhap");
      expect(localStorage.getItem("jwt")).toBeNull();
    });

    it("token hết hạn -> xóa token và chuyển hướng /dang-nhap", () => {
      datToken(TOKEN.EXPIRED);
      renderTaiDuongDan("/quan-ly/danh-sach-sach");
      expect(screen.getByTestId("vi-tri-hien-tai")).toHaveTextContent("/dang-nhap");
      expect(localStorage.getItem("jwt")).toBeNull();
    });

    it("token USER hợp lệ nhưng không phải admin -> không vào được, chuyển hướng /", () => {
      datToken(TOKEN.VALID_USER);
      renderTaiDuongDan("/quan-ly/danh-sach-sach");
      expect(screen.getByTestId("vi-tri-hien-tai")).toHaveTextContent("/");
      expect(screen.getByTestId("noi-dung-trang")).toHaveTextContent("HOME");
      expect(localStorage.getItem("jwt")).toBe(TOKEN.VALID_USER);
    });

    it("token isStaff:true/isAdmin:false KHÔNG được vào admin -> chuyển hướng /", () => {
      datToken(TOKEN.STAFF_ONLY);
      renderTaiDuongDan("/quan-ly/danh-sach-sach");
      expect(screen.getByTestId("vi-tri-hien-tai")).toHaveTextContent("/");
      expect(screen.getByTestId("noi-dung-trang")).toHaveTextContent("HOME");
      expect(localStorage.getItem("jwt")).toBe(TOKEN.STAFF_ONLY);
    });

    it("token ADMIN hợp lệ -> vào được trang quản lý", () => {
      datToken(TOKEN.VALID_ADMIN);
      renderTaiDuongDan("/quan-ly/danh-sach-sach");
      expect(screen.getByTestId("noi-dung-trang")).toHaveTextContent("ADMIN");
    });
  });

  describe("public route /xu-ly-kq-thanh-toan (VNPay return, no guard)", () => {
    it.each([
      ["thiếu token", null],
      ["token sai định dạng", TOKEN.MALFORMED],
      ["token hết hạn", TOKEN.EXPIRED],
      ["token USER hợp lệ", TOKEN.VALID_USER],
      ["token isStaff-only", TOKEN.STAFF_ONLY],
      ["token ADMIN hợp lệ", TOKEN.VALID_ADMIN],
    ])("%s -> luôn hiển thị được trang, không chuyển hướng", (_mo_ta, token) => {
      datToken(token);
      renderTaiDuongDan("/xu-ly-kq-thanh-toan");
      expect(screen.getByTestId("noi-dung-trang")).toHaveTextContent("KET_QUA_THANH_TOAN");
      expect(screen.getByTestId("vi-tri-hien-tai")).toHaveTextContent("/xu-ly-kq-thanh-toan");
    });
  });
});
