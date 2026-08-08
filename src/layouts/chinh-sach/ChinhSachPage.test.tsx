import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ChinhSachPage from "./ChinhSachPage";
import { DANH_SACH_CHINH_SACH } from "./noiDungChinhSach";

function veTrang(duongDan: string) {
  return render(
    <MemoryRouter initialEntries={[duongDan]}>
      <Routes>
        <Route path="/chinh-sach/:slug" element={<ChinhSachPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("ChinhSachPage", () => {
  it("hiện đúng tiêu đề và toàn bộ mục của từng chính sách", () => {
    DANH_SACH_CHINH_SACH.forEach((trang) => {
      const { unmount } = veTrang(`/chinh-sach/${trang.slug}`);

      expect(screen.getByRole("heading", { level: 2, name: trang.tieuDe })).toBeInTheDocument();
      trang.muc.forEach((muc) => {
        expect(screen.getByRole("heading", { level: 3, name: muc.tieuDe })).toBeInTheDocument();
      });

      unmount();
    });
  });

  it("slug lạ không làm vỡ trang mà báo không tìm thấy", () => {
    veTrang("/chinh-sach/khong-ton-tai");

    expect(screen.getByText(/Không tìm thấy trang chính sách này/)).toBeInTheDocument();
  });

  it("mỗi trang trỏ tới bảy chính sách còn lại, không tự trỏ về chính nó", () => {
    const { container } = veTrang("/chinh-sach/dieu-khoan-su-dung");

    const href = Array.from(container.querySelectorAll("nav a")).map((a) => a.getAttribute("href"));
    expect(href).toHaveLength(DANH_SACH_CHINH_SACH.length - 1);
    expect(href).not.toContain("/chinh-sach/dieu-khoan-su-dung");
  });

  /**
   * Một chính sách rỗng vẫn "hiển thị được" nên không test nào khác bắt lỗi. Đây là chốt
   * chặn để không ai vô tình đẩy lên một trang chỉ có tiêu đề.
   */
  it("không chính sách nào rỗng nội dung", () => {
    DANH_SACH_CHINH_SACH.forEach((trang) => {
      expect(trang.muc.length).toBeGreaterThan(0);
      trang.muc.forEach((muc) => {
        expect(muc.doan.length).toBeGreaterThan(0);
        muc.doan.forEach((doan) => expect(doan.trim().length).toBeGreaterThan(20));
      });
    });
  });

  it("có đủ tám chính sách với slug không trùng nhau", () => {
    const slug = DANH_SACH_CHINH_SACH.map((t) => t.slug);

    expect(slug).toHaveLength(8);
    expect(new Set(slug).size).toBe(8);
  });
});
