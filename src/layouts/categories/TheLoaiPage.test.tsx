import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import TheLoaiPage from "./TheLoaiPage";
import { getTheLoaiBySlug } from "../../api/TheLoaiApi";
import { findByBook } from "../../api/SachApi";

jest.mock("../../api/TheLoaiApi", () => ({ getTheLoaiBySlug: jest.fn() }));
jest.mock("../../api/SachApi", () => ({ findByBook: jest.fn() }));
jest.mock("../products/components/SachProps", () => ({
  __esModule: true,
  default: ({ sach }: { sach: { maSach: number; tenSach?: string } }) => (
    <div data-testid={`sach-${sach.maSach}`}>{sach.tenSach}</div>
  ),
}));

const mockedTheLoai = getTheLoaiBySlug as jest.MockedFunction<typeof getTheLoaiBySlug>;
const mockedFind = findByBook as jest.MockedFunction<typeof findByBook>;

function veTrang(duongDan = "/the-loai/tieu-thuyet") {
  return render(
    <MemoryRouter initialEntries={[duongDan]}>
      <Routes>
        <Route path="/the-loai/:slug" element={<TheLoaiPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("TheLoaiPage - co du cong cu nhu trang tim kiem", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedTheLoai.mockResolvedValue({ maTheLoai: 7, tenTheLoai: "Tiểu thuyết", slug: "tieu-thuyet", soLuongSach: 12 } as any);
    mockedFind.mockResolvedValue({ ketQua: [{ maSach: 1, tenSach: "Sách A" } as any], tongSoTrang: 1, tongSoSach: 1 });
  });

  /**
   * Truoc day trang the loai chi co danh sach tran: khach duyet theo the loai co it cong cu
   * hon khach tim kiem, du hai man hinh lam cung mot viec.
   */
  it("hiện thanh sắp xếp và lọc khoảng giá", async () => {
    veTrang();

    expect(await screen.findByLabelText("Sắp xếp theo")).toBeInTheDocument();
    expect(screen.getByLabelText("Giá từ")).toBeInTheDocument();
    expect(screen.getByLabelText("đến")).toBeInTheDocument();
  });

  it("khoá thể loại theo route, không gọi API với thể loại khác", async () => {
    veTrang();

    await waitFor(() => expect(mockedFind).toHaveBeenCalled());
    const [, maTheLoai] = mockedFind.mock.calls[0];
    expect(maTheLoai).toBe(7);
  });

  /** Gỡ được thể loại ra thì danh sách sẽ không còn khớp tiêu đề của chính trang. */
  it("không cho gỡ bộ lọc thể loại trên trang thể loại", async () => {
    veTrang("/the-loai/tieu-thuyet?maTheLoai=99");

    await screen.findByLabelText("Sắp xếp theo");
    expect(screen.queryByText(/Đã lọc theo thể loại/)).not.toBeInTheDocument();
  });

  it("tìm trong thể loại đưa từ khoá lên URL và giữ nguyên thể loại", async () => {
    veTrang();
    await screen.findByLabelText("Sắp xếp theo");

    fireEvent.change(screen.getByLabelText(/Tìm trong thể loại/), { target: { value: "biển" } });
    fireEvent.submit(screen.getByRole("search"));

    await waitFor(() => {
      const lanCuoi = mockedFind.mock.calls[mockedFind.mock.calls.length - 1];
      expect(lanCuoi[0]).toBe("biển");
      expect(lanCuoi[1]).toBe(7);
    });
  });

  it("đổi sắp xếp vẫn giữ nguyên thể loại của trang", async () => {
    veTrang();
    await screen.findByLabelText("Sắp xếp theo");

    fireEvent.change(screen.getByLabelText("Sắp xếp theo"), { target: { value: "gia-tang" } });

    await waitFor(() => {
      const lanCuoi = mockedFind.mock.calls[mockedFind.mock.calls.length - 1];
      expect(lanCuoi[1]).toBe(7);
      expect(lanCuoi[3]).toMatchObject({ sort: "gia-tang" });
    });
  });

  it("giữ nguyên breadcrumb và tên thể loại", async () => {
    veTrang();

    expect(await screen.findByRole("heading", { level: 2, name: "Tiểu thuyết" })).toBeInTheDocument();
    expect(screen.getByText(/Trang chủ/)).toBeInTheDocument();
  });
});
