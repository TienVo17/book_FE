import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuthSession } from "../../../api/AuthSession";
import { getAllImageOfOneBook } from "../../../api/HinhAnhApi";
import {
  setBookWishlisted,
  useWishlist,
} from "../../../api/WishlistSession";
import SachModel from "../../../models/SachModel";
import SachProps from "./SachProps";

jest.mock("../../../api/AuthSession", () => ({
  useAuthSession: jest.fn(),
}));
jest.mock("../../../api/HinhAnhApi", () => ({
  getAllImageOfOneBook: jest.fn(),
}));
jest.mock("../../../api/WishlistSession", () => ({
  isBookWishlisted: jest.fn(() => false),
  setBookWishlisted: jest.fn(),
  useWishlist: jest.fn(),
}));
jest.mock("react-toastify", () => ({
  toast: {
    error: jest.fn(),
    info: jest.fn(),
    success: jest.fn(),
  },
}));
jest.mock("./DanhGiaSanPham", () => ({
  renderStars: () => null,
}));
jest.mock("../../utils/GioHangUtils", () => ({
  themVaoGioHang: jest.fn(),
}));

const mockedUseAuth = useAuthSession as jest.MockedFunction<typeof useAuthSession>;
const mockedGetImages = getAllImageOfOneBook as jest.MockedFunction<typeof getAllImageOfOneBook>;
const mockedSetBookWishlisted = setBookWishlisted as jest.MockedFunction<typeof setBookWishlisted>;
const mockedUseWishlist = useWishlist as jest.MockedFunction<typeof useWishlist>;

const book = new SachModel(
  101,
  "Sách A",
  150000,
);

describe("SachProps auth behavior", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseAuth.mockReturnValue({
      status: "unknown",
      uid: null,
      username: null,
      roles: [],
      capabilities: [],
    });
    mockedUseWishlist.mockReturnValue({
      items: [],
      status: "guest",
      error: null,
      pendingBookIds: [],
    });
    mockedGetImages.mockResolvedValue([]);
  });

  it("does not mutate wishlist or show guest/error feedback while authentication is unknown", async () => {
    render(
      <MemoryRouter>
        <SachProps sach={book} />
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole("button", {
      name: "Thêm Sách A vào danh sách yêu thích",
    }));

    expect(mockedSetBookWishlisted).not.toHaveBeenCalled();
    expect(toast.info).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
  });
});
