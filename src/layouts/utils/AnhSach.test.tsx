import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import AnhSach from "./AnhSach";

describe("AnhSach", () => {
  it("hiển thị ảnh khi có url", () => {
    render(<AnhSach src="https://example.com/bia.jpg" alt="Đắc Nhân Tâm" />);
    expect(screen.getByRole("img", { name: "Đắc Nhân Tâm" }).tagName).toBe("IMG");
  });

  it("hiển thị khối thay thế khi không có url", () => {
    render(<AnhSach alt="Đắc Nhân Tâm" />);
    const el = screen.getByRole("img", { name: "Đắc Nhân Tâm" });
    expect(el.tagName).not.toBe("IMG");
    expect(el).toHaveTextContent("Chưa có ảnh");
  });

  it("chuyển sang khối thay thế khi ảnh tải lỗi", () => {
    render(<AnhSach src="https://example.com/hong.jpg" alt="Nhà Giả Kim" />);
    fireEvent.error(screen.getByRole("img", { name: "Nhà Giả Kim" }));

    const el = screen.getByRole("img", { name: "Nhà Giả Kim" });
    expect(el.tagName).not.toBe("IMG");
    expect(el).toHaveTextContent("Chưa có ảnh");
  });

  // Danh sách tái sử dụng component khi cuộn; nếu không reset theo src thì
  // một ảnh lỗi sẽ khiến các sách sau đó cũng hiện khối thay thế.
  it("thử lại khi src đổi sang ảnh khác", () => {
    const { rerender } = render(
      <AnhSach src="https://example.com/hong.jpg" alt="Sách A" />
    );
    fireEvent.error(screen.getByRole("img", { name: "Sách A" }));
    expect(screen.getByRole("img", { name: "Sách A" }).tagName).not.toBe("IMG");

    rerender(<AnhSach src="https://example.com/tot.jpg" alt="Sách B" />);
    expect(screen.getByRole("img", { name: "Sách B" }).tagName).toBe("IMG");
  });
});
