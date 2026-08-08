import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Footer from "./Footer";
import { dangKyNhanTin } from "../../api/NhanTinApi";
import { DANH_SACH_CHINH_SACH } from "../chinh-sach/noiDungChinhSach";
import { MANG_XA_HOI } from "../../config/thongTinCuaHang";

jest.mock("../../api/NhanTinApi", () => ({
  dangKyNhanTin: jest.fn(),
}));

const mockedDangKy = dangKyNhanTin as jest.MockedFunction<typeof dangKyNhanTin>;

function veFooter() {
  return render(
    <MemoryRouter>
      <Footer />
    </MemoryRouter>
  );
}

describe("Footer - không còn điểm chết", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedDangKy.mockResolvedValue(undefined);
  });

  /**
   * Đây là lỗi gốc: 11 liên kết mang href="#!" nên bấm vào không đi đâu cả. Test này phải
   * đỏ với phiên bản footer cũ.
   */
  it("không còn liên kết nào trỏ vào hư vô", () => {
    const { container } = veFooter();

    const chet = Array.from(container.querySelectorAll("a")).filter((a) => {
      const href = a.getAttribute("href") || "";
      return href === "" || href === "#" || href === "#!";
    });

    expect(chet.map((a) => a.textContent)).toEqual([]);
  });

  /** Mọi liên kết chính sách phải có nội dung thật, không chỉ có route. */
  it("mọi liên kết chính sách đều khớp một trang có nội dung", () => {
    const { container } = veFooter();
    const slugTrongFooter = Array.from(container.querySelectorAll("a"))
      .map((a) => a.getAttribute("href") || "")
      .filter((href) => href.startsWith("/chinh-sach/"))
      .map((href) => href.replace("/chinh-sach/", ""));

    expect(slugTrongFooter.length).toBe(8);
    slugTrongFooter.forEach((slug) => {
      const trang = DANH_SACH_CHINH_SACH.find((muc) => muc.slug === slug);
      expect(trang).toBeDefined();
      expect(trang!.muc.length).toBeGreaterThan(0);
    });
  });

  /** Hai trang này đã tồn tại từ lâu nhưng footer cũ để `#!`. */
  it("trỏ tới các trang tài khoản đã có sẵn", () => {
    const { container } = veFooter();
    const href = Array.from(container.querySelectorAll("a")).map((a) => a.getAttribute("href"));

    expect(href).toEqual(expect.arrayContaining(["/profile", "/dia-chi", "/order", "/dang-nhap"]));
  });

  it("hiện thông tin liên hệ gọi và gửi thư được", () => {
    const { container } = veFooter();
    const href = Array.from(container.querySelectorAll("a")).map((a) => a.getAttribute("href"));

    expect(href.some((h) => h?.startsWith("tel:"))).toBe(true);
    expect(href.some((h) => h?.startsWith("mailto:"))).toBe(true);
  });

  /**
   * Chỉ hiện biểu tượng của mạng đã có trang thật. Trỏ vào trang chủ facebook.com thì thà
   * đừng hiện còn hơn. Test này đếm theo cấu hình chứ không ghim một con số, nên thêm hay
   * bớt một mạng xã hội không làm nó đỏ oan.
   */
  it("chỉ hiện biểu tượng của mạng xã hội đã cấu hình", () => {
    const { container } = veFooter();

    const soDaCauHinh = MANG_XA_HOI.filter((muc) => muc.url).length;
    expect(container.querySelectorAll(".social-icon")).toHaveLength(soDaCauHinh);
  });

  it("liên kết mạng xã hội mở tab mới và không rò rỉ tab gốc", () => {
    const { container } = veFooter();

    const icon = Array.from(container.querySelectorAll("a.social-icon"));
    expect(icon.length).toBeGreaterThan(0);
    icon.forEach((a) => {
      expect(a.getAttribute("target")).toBe("_blank");
      expect(a.getAttribute("rel")).toContain("noopener");
      expect(a.getAttribute("rel")).toContain("noreferrer");
      expect(a.getAttribute("href")).toMatch(/^https:\/\//);
    });
  });

  it("năm bản quyền lấy theo năm hiện tại, không ghi cứng", () => {
    veFooter();

    expect(screen.getByText(new RegExp(String(new Date().getFullYear())))).toBeInTheDocument();
  });
});

describe("Footer - đăng ký nhận tin", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedDangKy.mockResolvedValue(undefined);
  });

  it("ô email có nhãn thật, không chỉ có placeholder", () => {
    veFooter();

    expect(screen.getByLabelText("Email nhận tin")).toBeInTheDocument();
  });

  it("gửi email tới API và báo thành công", async () => {
    veFooter();

    fireEvent.change(screen.getByLabelText("Email nhận tin"), {
      target: { value: "khach@example.com" },
    });
    fireEvent.submit(screen.getByLabelText("Email nhận tin").closest("form")!);

    await waitFor(() => expect(mockedDangKy).toHaveBeenCalledWith("khach@example.com"));
    expect(await screen.findByText(/Cảm ơn bạn/)).toBeInTheDocument();
    expect((screen.getByLabelText("Email nhận tin") as HTMLInputElement).value).toBe("");
  });

  it("cắt khoảng trắng thừa trước khi gửi", async () => {
    veFooter();

    fireEvent.change(screen.getByLabelText("Email nhận tin"), {
      target: { value: "  khach@example.com  " },
    });
    fireEvent.submit(screen.getByLabelText("Email nhận tin").closest("form")!);

    await waitFor(() => expect(mockedDangKy).toHaveBeenCalledWith("khach@example.com"));
  });

  /** Lỗi phải hiện ra, và không được xoá mất email người dùng vừa gõ. */
  it("hiện lỗi từ máy chủ và giữ lại email đã gõ", async () => {
    mockedDangKy.mockRejectedValue(new Error("Email không hợp lệ."));
    veFooter();

    fireEvent.change(screen.getByLabelText("Email nhận tin"), {
      target: { value: "sai@example.com" },
    });
    fireEvent.submit(screen.getByLabelText("Email nhận tin").closest("form")!);

    expect(await screen.findByText("Email không hợp lệ.")).toBeInTheDocument();
    expect((screen.getByLabelText("Email nhận tin") as HTMLInputElement).value).toBe("sai@example.com");
  });

  it("không gửi lần thứ hai khi lần đầu chưa xong", async () => {
    let choXong: () => void = () => {};
    mockedDangKy.mockImplementation(() => new Promise<void>((resolve) => { choXong = resolve; }));
    veFooter();

    const o = screen.getByLabelText("Email nhận tin");
    fireEvent.change(o, { target: { value: "khach@example.com" } });
    fireEvent.submit(o.closest("form")!);
    fireEvent.submit(o.closest("form")!);

    expect(mockedDangKy).toHaveBeenCalledTimes(1);
    choXong();
    await waitFor(() => expect(screen.getByText(/Cảm ơn bạn/)).toBeInTheDocument());
  });

  it("không gọi API khi ô email rỗng", () => {
    veFooter();

    fireEvent.submit(screen.getByLabelText("Email nhận tin").closest("form")!);

    expect(mockedDangKy).not.toHaveBeenCalled();
  });
});
