import React, { useEffect, useState } from "react";
import Banner from "./components/Banner";
import Carousel from "./components/Carousel";
import DanhSachSanPham from "../products/DanhSachSanPham";
import SachModel from "../../models/SachModel";
import { getSachBanChay, getSachMoiNhat } from "../../api/SachApi";
import SachRow from "./components/SachRow";

interface HomePageProps {
  tuKhoaTimKiem: string;
}

function HomePage({ tuKhoaTimKiem }: HomePageProps) {
  const [sachBanChay, setSachBanChay] = useState<SachModel[]>([]);
  const [sachMoiNhat, setSachMoiNhat] = useState<SachModel[]>([]);

  useEffect(() => {
    getSachBanChay().then(setSachBanChay).catch(console.error);
    getSachMoiNhat().then(setSachMoiNhat).catch(console.error);
  }, []);

  return (
    <div>
      <Banner />
      <Carousel />
      <SachRow title="Sách bán chạy" danhSach={sachBanChay} />
      <SachRow title="Sách mới nhất" danhSach={sachMoiNhat} />
      <DanhSachSanPham
        tuKhoaTimKiem={tuKhoaTimKiem}
        maTheLoai={0}
      />
    </div>
  );
}
export default HomePage;
