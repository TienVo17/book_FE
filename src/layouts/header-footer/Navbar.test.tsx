import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import Navbar from "./Navbar";
import { getAllTheLoai } from "../../api/TheLoaiApi";
import { getGoiYTimKiem, SachGoiYModel } from "../../api/SachApi";
import { ApiRequestError } from "../../api/Request";

jest.mock("../../api/TheLoaiApi", () => ({
  getAllTheLoai: jest.fn(),
}));

jest.mock("../../api/SachApi", () => ({
  getGoiYTimKiem: jest.fn(),
}));

const mockedGetAllTheLoai = getAllTheLoai as jest.MockedFunction<typeof getAllTheLoai>;
const mockedGetGoiYTimKiem = getGoiYTimKiem as jest.MockedFunction<typeof getGoiYTimKiem>;

function ViTriHienTai() {
  const location = useLocation();
  return <output data-testid="vi-tri-hien-tai">{location.pathname}{location.search}</output>;
}

function renderNavbar(duongDanBanDau: string) {
  return render(
    <MemoryRouter initialEntries={[duongDanBanDau]}>
      <Navbar />
      <ViTriHienTai />
    </MemoryRouter>,
  );
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

function goiY(overrides: Partial<SachGoiYModel>): SachGoiYModel {
  return {
    maSach: 1,
    tenSach: "Sách mẫu",
    slug: "sach-mau",
    urlAnh: "",
    giaBan: 10000,
    ...overrides,
  };
}

describe("Navbar - tìm kiếm có URL riêng (sửa lỗi gốc)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetAllTheLoai.mockResolvedValue([]);
    localStorage.clear();
  });

  it("tìm kiếm từ một trang KHÔNG PHẢI trang chủ vẫn điều hướng tới /tim-kiem?q=...", async () => {
    mockedGetGoiYTimKiem.mockResolvedValue([]);
    renderNavbar("/gio-hang");

    const oTimKiem = screen.getByRole("combobox", { name: /tìm kiếm sách/i });
    fireEvent.change(oTimKiem, { target: { value: "harry potter" } });
    fireEvent.click(screen.getByRole("button", { name: "Tìm kiếm" }));

    expect(screen.getByTestId("vi-tri-hien-tai")).toHaveTextContent(
      "/tim-kiem?q=harry%20potter",
    );
  });

  it("không điều hướng khi từ khóa rỗng", () => {
    renderNavbar("/gio-hang");

    fireEvent.click(screen.getByRole("button", { name: "Tìm kiếm" }));

    expect(screen.getByTestId("vi-tri-hien-tai")).toHaveTextContent("/gio-hang");
  });

  it("hiện nút xóa từ khóa chỉ khi ô tìm kiếm có chữ", () => {
    renderNavbar("/");
    expect(screen.queryByRole("button", { name: /xóa từ khóa/i })).not.toBeInTheDocument();

    fireEvent.change(screen.getByRole("combobox", { name: /tìm kiếm sách/i }), {
      target: { value: "abc" },
    });
    expect(screen.getByRole("button", { name: /xóa từ khóa/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /xóa từ khóa/i }));
    expect(screen.getByRole("combobox", { name: /tìm kiếm sách/i })).toHaveValue("");
    expect(screen.queryByRole("button", { name: /xóa từ khóa/i })).not.toBeInTheDocument();
  });
});

describe("Navbar - gợi ý tìm kiếm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetAllTheLoai.mockResolvedValue([]);
    localStorage.clear();
  });

  it("không gọi API gợi ý khi từ khóa dưới 2 ký tự sau khi trim", async () => {
    renderNavbar("/");
    fireEvent.change(screen.getByRole("combobox", { name: /tìm kiếm sách/i }), {
      target: { value: "a" },
    });

    await new Promise((r) => setTimeout(r, 300));
    expect(mockedGetGoiYTimKiem).not.toHaveBeenCalled();
  });

  it("debounce 250ms rồi mới gọi API gợi ý", async () => {
    mockedGetGoiYTimKiem.mockResolvedValue([goiY({})]);
    renderNavbar("/");

    fireEvent.change(screen.getByRole("combobox", { name: /tìm kiếm sách/i }), {
      target: { value: "ab" },
    });
    expect(mockedGetGoiYTimKiem).not.toHaveBeenCalled();

    await waitFor(() => expect(mockedGetGoiYTimKiem).toHaveBeenCalledWith("ab"));
  });

  it("hủy hiệu lực phản hồi trễ của yêu cầu cũ khi yêu cầu mới hơn đã hoàn tất trước", async () => {
    const yeuCauA = deferred<SachGoiYModel[]>();
    const yeuCauB = deferred<SachGoiYModel[]>();
    mockedGetGoiYTimKiem
      .mockReturnValueOnce(yeuCauA.promise)
      .mockReturnValueOnce(yeuCauB.promise);

    renderNavbar("/");
    const oTimKiem = screen.getByRole("combobox", { name: /tìm kiếm sách/i });

    fireEvent.change(oTimKiem, { target: { value: "ha" } });
    await waitFor(() => expect(mockedGetGoiYTimKiem).toHaveBeenCalledTimes(1));

    fireEvent.change(oTimKiem, { target: { value: "harry" } });
    await waitFor(() => expect(mockedGetGoiYTimKiem).toHaveBeenCalledTimes(2));

    // Yêu cầu MỚI HƠN (B, cho "harry") hoàn tất trước.
    yeuCauB.resolve([goiY({ maSach: 2, tenSach: "Harry Potter" })]);
    await screen.findByText("Harry Potter");

    // Yêu cầu CŨ (A, cho "ha") hoàn tất trễ — không được ghi đè kết quả mới hơn.
    yeuCauA.resolve([goiY({ maSach: 1, tenSach: "Halloween" })]);
    await new Promise((r) => setTimeout(r, 50));

    expect(screen.queryByText("Halloween")).not.toBeInTheDocument();
    expect(screen.getByText("Harry Potter")).toBeInTheDocument();
  });

  it("điều hướng gợi ý bằng phím Mũi tên và chọn bằng Enter", async () => {
    mockedGetGoiYTimKiem.mockResolvedValue([
      goiY({ maSach: 1, tenSach: "Sách Một", slug: "sach-mot" }),
      goiY({ maSach: 2, tenSach: "Sách Hai", slug: "sach-hai" }),
    ]);
    renderNavbar("/");
    const oTimKiem = screen.getByRole("combobox", { name: /tìm kiếm sách/i });

    fireEvent.change(oTimKiem, { target: { value: "sach" } });
    await screen.findByRole("listbox");

    fireEvent.keyDown(oTimKiem, { key: "ArrowDown" });
    expect(screen.getAllByRole("option")[0]).toHaveAttribute("aria-selected", "true");

    fireEvent.keyDown(oTimKiem, { key: "ArrowDown" });
    expect(screen.getAllByRole("option")[1]).toHaveAttribute("aria-selected", "true");

    fireEvent.keyDown(oTimKiem, { key: "Enter" });
    expect(screen.getByTestId("vi-tri-hien-tai")).toHaveTextContent("/sach/sach-hai");
  });

  it("Escape đóng dropdown gợi ý mà không điều hướng", async () => {
    mockedGetGoiYTimKiem.mockResolvedValue([goiY({})]);
    renderNavbar("/");
    const oTimKiem = screen.getByRole("combobox", { name: /tìm kiếm sách/i });

    fireEvent.change(oTimKiem, { target: { value: "sach" } });
    await screen.findByRole("listbox");

    fireEvent.keyDown(oTimKiem, { key: "Escape" });
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(screen.getByTestId("vi-tri-hien-tai")).toHaveTextContent("/");
  });

  it("endpoint gợi ý lỗi/404 -> không dropdown, không chặn tìm kiếm bình thường", async () => {
    mockedGetGoiYTimKiem.mockRejectedValue(new ApiRequestError("Not Found", 404));
    renderNavbar("/gio-hang");
    const oTimKiem = screen.getByRole("combobox", { name: /tìm kiếm sách/i });

    fireEvent.change(oTimKiem, { target: { value: "sach loi" } });
    await waitFor(() => expect(mockedGetGoiYTimKiem).toHaveBeenCalled());

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Tìm kiếm" }));
    expect(screen.getByTestId("vi-tri-hien-tai")).toHaveTextContent(
      "/tim-kiem?q=sach%20loi",
    );
  });
});
