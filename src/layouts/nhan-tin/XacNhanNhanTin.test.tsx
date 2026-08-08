import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import XacNhanNhanTin from "./XacNhanNhanTin";
import HuyNhanTin from "./HuyNhanTin";
import { xacNhanNhanTin, huyNhanTin } from "../../api/NhanTinApi";

jest.mock("../../api/NhanTinApi", () => ({
  xacNhanNhanTin: jest.fn(),
  huyNhanTin: jest.fn(),
}));

const mockedXacNhan = xacNhanNhanTin as jest.MockedFunction<typeof xacNhanNhanTin>;
const mockedHuy = huyNhanTin as jest.MockedFunction<typeof huyNhanTin>;

function veXacNhan(ma = "ma-xac-nhan-1") {
  return render(
    <MemoryRouter initialEntries={[`/xac-nhan-nhan-tin/${ma}`]}>
      <Routes>
        <Route path="/xac-nhan-nhan-tin/:maXacNhan" element={<XacNhanNhanTin />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("XacNhanNhanTin", () => {
  beforeEach(() => jest.clearAllMocks());

  /** Người đã bấm liên kết trong thư là đã nêu rõ ý định; không bắt bấm thêm nút nữa. */
  it("xác nhận ngay khi mở trang, dùng đúng khoá trong URL", async () => {
    mockedXacNhan.mockResolvedValue(undefined);

    veXacNhan("abc-123");

    await waitFor(() => expect(mockedXacNhan).toHaveBeenCalledWith("abc-123"));
    expect(await screen.findByText(/Đã xác nhận đăng ký nhận tin/)).toBeInTheDocument();
  });

  it("chỉ gọi API đúng một lần", async () => {
    mockedXacNhan.mockResolvedValue(undefined);

    veXacNhan();

    await screen.findByText(/Đã xác nhận đăng ký nhận tin/);
    expect(mockedXacNhan).toHaveBeenCalledTimes(1);
  });

  it("hiện thông điệp thật của máy chủ khi khoá sai hoặc hết hạn", async () => {
    mockedXacNhan.mockRejectedValue(new Error("Liên kết xác nhận đã hết hạn."));

    veXacNhan();

    expect(await screen.findByText("Liên kết xác nhận đã hết hạn.")).toBeInTheDocument();
    expect(screen.getByText(/Không xác nhận được đăng ký/)).toBeInTheDocument();
  });

  it("luôn có lối về trang chủ dù thành công hay thất bại", async () => {
    mockedXacNhan.mockRejectedValue(new Error("hỏng"));

    const { container } = veXacNhan();

    await screen.findByText(/Không xác nhận được đăng ký/);
    const href = Array.from(container.querySelectorAll("a")).map((a) => a.getAttribute("href"));
    expect(href).toContain("/");
  });
});

describe("HuyNhanTin - dùng chung khung với trang xác nhận", () => {
  beforeEach(() => jest.clearAllMocks());

  it("huỷ ngay khi mở trang và báo thành công", async () => {
    mockedHuy.mockResolvedValue(undefined);

    render(
      <MemoryRouter initialEntries={["/huy-nhan-tin/ma-huy-9"]}>
        <Routes>
          <Route path="/huy-nhan-tin/:maHuy" element={<HuyNhanTin />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => expect(mockedHuy).toHaveBeenCalledWith("ma-huy-9"));
    expect(await screen.findByText(/Đã huỷ đăng ký nhận tin/)).toBeInTheDocument();
    expect(mockedXacNhan).not.toHaveBeenCalled();
  });
});
