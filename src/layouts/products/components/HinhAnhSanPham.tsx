import React, { useEffect, useState } from "react";
import HinhAnhModel from "../../../models/HinhAnhModel";
import { getAllImageOfOneBook } from "../../../api/HinhAnhApi";
import { Carousel } from "react-responsive-carousel";
import "react-responsive-carousel/lib/styles/carousel.min.css";

interface HinhAnhSanPhamProps {
  maSach: number;
  className?: string;
  style?: React.CSSProperties;
}

const HinhAnhSanPham: React.FC<HinhAnhSanPhamProps> = ({ maSach, className, style }) => {
  const [danhSachAnh, setDanhSachAnh] = useState<HinhAnhModel[]>([]);
  const [dangTaiDuLieu, setDangTaiDuLieu] = useState(true);
  const [baoLoi, setBaoLoi] = useState(null);

  useEffect(
    () => {
      const loadFirstImage = async () => {
        getAllImageOfOneBook(maSach)
          .then((danhSach) => {
            console.log(danhSach);
            setDanhSachAnh(danhSach);
            setDangTaiDuLieu(false);
          })
          .catch((error) => {
            setDangTaiDuLieu(false);
            setBaoLoi(error.message);
          });
      };
      loadFirstImage();
    },
    [maSach]
  );

  if (dangTaiDuLieu) {
    return (
      <div>
        <h1>Đang tải dữ liệu</h1>
      </div>
    );
  }

  if (baoLoi) {
    return (
      <div>
        <h1>Gặp lỗi: {baoLoi}</h1>
      </div>
    );
  }

  return (
    <div className={`row ${className}`} style={style}>
      <div className="col-12">
        <Carousel showArrows={true} showIndicators={true}>
          {danhSachAnh.map((hinhAnh, index) => (
            <div key={index}>
              <img
                src={hinhAnh.urlHinh}
                alt={`${hinhAnh.tenHinhAnh}`}
                style={{ maxWidth: "250px" }}
              />
            </div>
          ))}
        </Carousel>
      </div>
    </div>
  );
};

export default HinhAnhSanPham;
