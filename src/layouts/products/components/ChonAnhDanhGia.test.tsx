import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ChonAnhDanhGia from "./ChonAnhDanhGia";

const createObjectURLMock = jest.fn(() => "blob:preview");
const revokeObjectURLMock = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  createObjectURLMock.mockReturnValue("blob:preview");
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: createObjectURLMock,
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    value: revokeObjectURLMock,
  });
});

function BoChon() {
  const [files, setFiles] = React.useState<File[]>([]);
  return <ChonAnhDanhGia files={files} onChange={setFiles} />;
}

describe("ChonAnhDanhGia", () => {
  it("hiện preview, số lượng và gỡ ảnh khỏi danh sách chọn", async () => {
    render(<BoChon />);
    const tep = new File(["jpeg"], "bia.jpg", { type: "image/jpeg" });

    await userEvent.upload(screen.getByLabelText("Chọn ảnh đánh giá"), tep);

    expect(screen.getByText("Đã chọn 1/5 ảnh.")).toBeInTheDocument();
    expect(await screen.findByAltText("Xem trước bia.jpg")).toHaveAttribute(
      "src",
      "blob:preview"
    );
    await userEvent.click(screen.getByRole("button", { name: "Gỡ bia.jpg" }));
    expect(screen.getByText("Đã chọn 0/5 ảnh.")).toBeInTheDocument();
  });

  it("chặn file quá 5MB ở client", async () => {
    render(<BoChon />);
    const tep = new File([new Uint8Array(5 * 1024 * 1024 + 1)], "nang.jpg", { type: "image/jpeg" });

    await userEvent.upload(screen.getByLabelText("Chọn ảnh đánh giá"), tep);

    expect(screen.getByRole("alert")).toHaveTextContent("Ảnh nang.jpg vượt quá 5MB.");
    expect(screen.getByText("Đã chọn 0/5 ảnh.")).toBeInTheDocument();
  });

  it("chặn định dạng không được hỗ trợ ở client", async () => {
    render(<BoChon />);
    const tep = new File(["gif"], "dong.gif", { type: "image/gif" });

    await userEvent.upload(screen.getByLabelText("Chọn ảnh đánh giá"), tep);

    expect(screen.getByRole("alert")).toHaveTextContent("Chỉ chấp nhận ảnh JPEG, PNG hoặc WebP.");
  });
});
