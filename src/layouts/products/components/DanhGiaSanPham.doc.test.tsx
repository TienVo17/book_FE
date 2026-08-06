import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import DanhGiaSanPham from "./DanhGiaSanPham";
import { layTrangDanhGia } from "../../../api/DanhGiaAPI";

jest.mock("date-fns/locale", () => ({ vi: {} }));

jest.mock("../../../api/DanhGiaAPI", () => ({
  layTrangDanhGia: jest.fn(),
  layQuyenDanhGia: jest.fn(),
  themDanhGiaMoi: jest.fn(),
}));

const layTrangMock = layTrangDanhGia as jest.MockedFunction<typeof layTrangDanhGia>;

type Trang = Awaited<ReturnType<typeof layTrangDanhGia>>;

function trang(ghiDe: Partial<Trang> = {}): Trang {
  return {
    content: [
      { maDanhGia: 1, nhanXet: "Rất hay", diemXepHang: 5, timestamp: "", laCuaToi: false },
      { maDanhGia: 2, nhanXet: "Tạm được", diemXepHang: 3, timestamp: "", laCuaToi: false },
    ],
    trang: 0,
    kichThuoc: 10,
    tongSoTrang: 3,
    tongSo: 25,
    diemTrungBinh: 4.2,
    phanBo: { "1": 2, "2": 3, "3": 5, "4": 7, "5": 8 },
    ...ghiDe,
  };
}

function renderComponent() {
  return render(
    <MemoryRouter>
      <DanhGiaSanPham maSach={7} />
    </MemoryRouter>
  );
}

describe("DanhGiaSanPham — đọc phân trang và phân bố", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    layTrangMock.mockResolvedValue(trang());
  });

  it("hiện điểm trung bình, tổng số và đủ 5 thanh phân bố", async () => {
    renderComponent();

    expect(await screen.findByText("4.2")).toBeInTheDocument();
    expect(screen.getByText("25 đánh giá")).toBeInTheDocument();
    for (const sao of [1, 2, 3, 4, 5]) {
      expect(screen.getByLabelText(new RegExp(`^Lọc ${sao} sao`))).toBeInTheDocument();
    }
  });

  it("bấm một mức sao thì gửi bộ lọc lên backend và về trang đầu", async () => {
    renderComponent();
    await screen.findByText("Rất hay");

    await userEvent.click(screen.getByLabelText(/^Lọc 4 sao/));

    await waitFor(() =>
      expect(layTrangMock).toHaveBeenCalledWith(7, expect.objectContaining({ loc: 4, page: 0 }))
    );
  });

  // Phân bố phải tính trên toàn bộ đánh giá hiển thị. Nếu tính lại theo bộ lọc đang chọn,
  // bấm vào một cột sẽ làm bốn cột còn lại về 0 và thanh phân bố tự phá huỷ công dụng của nó.
  it("giữ nguyên phân bố khi đang lọc", async () => {
    layTrangMock.mockResolvedValue(
      trang({ content: [{ maDanhGia: 3, nhanXet: "Bốn sao", diemXepHang: 4, timestamp: "", laCuaToi: false }] })
    );

    renderComponent();
    await screen.findByText("Bốn sao");
    await userEvent.click(screen.getByLabelText(/^Lọc 4 sao/));

    await waitFor(() => expect(screen.getByLabelText("Lọc 5 sao (8 đánh giá)")).toBeInTheDocument());
    expect(screen.getByText("25 đánh giá")).toBeInTheDocument();
  });

  it("đổi kiểu sắp xếp thì gửi tham số sort mới", async () => {
    renderComponent();
    await screen.findByText("Rất hay");

    await userEvent.selectOptions(screen.getByLabelText("Sắp xếp:"), "diem-cao");

    await waitFor(() =>
      expect(layTrangMock).toHaveBeenCalledWith(7, expect.objectContaining({ sort: "diem-cao" }))
    );
  });

  it("chuyển trang sau thì tăng page", async () => {
    renderComponent();
    await screen.findByText("Rất hay");

    await userEvent.click(screen.getByText("Trang sau"));

    await waitFor(() =>
      expect(layTrangMock).toHaveBeenCalledWith(7, expect.objectContaining({ page: 1 }))
    );
  });

  it("không hiện phân trang khi chỉ có một trang", async () => {
    layTrangMock.mockResolvedValue(trang({ tongSoTrang: 1 }));

    renderComponent();
    await screen.findByText("Rất hay");

    expect(screen.queryByText("Trang sau")).not.toBeInTheDocument();
  });
});
