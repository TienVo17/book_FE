import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ChiTietSanPham from "./ChiTietSanPham";
import { getBookByIdentifier, getSachLienQuan } from "../../api/SachApi";
import { getDanhSachYeuThich } from "../../api/YeuThichApi";

jest.mock("../../api/SachApi", () => ({
  getBookByIdentifier: jest.fn(),
  getSachLienQuan: jest.fn(),
}));

jest.mock("../../api/YeuThichApi", () => ({
  getDanhSachYeuThich: jest.fn(),
  themYeuThich: jest.fn(),
  xoaYeuThich: jest.fn(),
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

function renderTrangChiTiet(): void {
  render(
    <MemoryRouter initialEntries={["/sach/101"]}>
      <ChiTietSanPham />
    </MemoryRouter>,
  );
}

function sachVoiMoTa(moTaChiTiet: string) {
  return {
    maSach: 101,
    tenSach: "Sách độc hại",
    giaBan: 150000,
    soLuong: 10,
    tenTacGia: "Tác giả",
    moTaChiTiet,
    danhSachAnh: [{ maHinhAnh: 1, urlHinh: "https://example.test/bia.jpg" }],
  };
}

describe("ChiTietSanPham product description security", () => {
  beforeEach(() => {
    localStorage.clear();
    (window as any).__xss_script_executed = undefined;
    (window as any).__xss_onerror_executed = undefined;
    mockedGetSachLienQuan.mockResolvedValue([]);
    mockedGetDanhSachYeuThich.mockResolvedValue([]);
  });

  afterEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  it("renders a <script> payload as inert text, never as an executable script node", async () => {
    const payload = '<script>window.__xss_script_executed = true;</script>';
    mockedGetBookById.mockResolvedValue(sachVoiMoTa(payload));
    renderTrangChiTiet();

    await screen.findByText(/Sách độc hại/);

    expect(document.querySelector("script")).toBeNull();
    expect((window as any).__xss_script_executed).toBeUndefined();
    expect(document.body.textContent).toContain(payload);
  });

  it("renders an event-handler attribute (img onerror) payload as inert text, never as a live DOM attribute", async () => {
    const payload = '<img src="x" onerror="window.__xss_onerror_executed = true">';
    mockedGetBookById.mockResolvedValue(sachVoiMoTa(payload));
    renderTrangChiTiet();

    await screen.findByText(/Sách độc hại/);

    expect(document.querySelector("img[onerror]")).toBeNull();
    expect((window as any).__xss_onerror_executed).toBeUndefined();
    expect(document.body.textContent).toContain(payload);
  });

  it("renders a javascript: URL payload as inert text, never as a clickable anchor", async () => {
    const payload = '<a href="javascript:window.__xss_onerror_executed = true">bấm vào đây</a>';
    mockedGetBookById.mockResolvedValue(sachVoiMoTa(payload));
    renderTrangChiTiet();

    await screen.findByText(/Sách độc hại/);

    expect(document.querySelector('a[href^="javascript:"]')).toBeNull();
    expect(document.body.textContent).toContain(payload);
  });
});
