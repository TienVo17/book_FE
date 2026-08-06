import React, { useEffect, useState } from "react";
import HinhAnhModel from "../../../models/HinhAnhModel";
import { getAllImageOfOneBook } from "../../../api/HinhAnhApi";
import { Carousel } from "react-responsive-carousel";
import "react-responsive-carousel/lib/styles/carousel.min.css";
import AnhSach from "../../utils/AnhSach";

interface HinhAnhSanPhamProps {
  maSach: number;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Bìa sách không có tỉ lệ chung, nên khung được đặt cố định và ảnh co vào trong
 * (`contain`) thay vì bị kéo méo. Kích thước tường minh cho phép trình duyệt giữ
 * sẵn chỗ trước khi ảnh về — không có nó, mỗi ảnh tải xong lại đẩy toàn bộ phần
 * dưới trang xuống.
 */
const CANH_KHUNG_ANH = 250;
const KHUNG_ANH: React.CSSProperties = {
  minHeight: CANH_KHUNG_ANH,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

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

  // Khối chờ phải chiếm đúng chỗ mà ảnh sẽ chiếm. Bản trước dựng một `h1` cao
  // vài chục pixel rồi thay bằng khung ảnh 250px — chính cú nhảy đó là phần lớn
  // CLS đo được trên trang sản phẩm (0.881, Lighthouse 12.8.2 ngày 2026-08-06).
  if (dangTaiDuLieu) {
    return (
      <div className={`row ${className}`} style={style}>
        <div className="col-12" style={KHUNG_ANH} aria-busy="true">
          <span className="visually-hidden">Đang tải ảnh sản phẩm</span>
        </div>
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
        <Carousel
          showArrows={danhSachAnh.length > 1}
          showIndicators={danhSachAnh.length > 1}
          showStatus={false}
        >
          {danhSachAnh.map((hinhAnh, index) => (
            <div key={index} style={KHUNG_ANH}>
              <AnhSach
                src={hinhAnh.urlHinh}
                alt={`${hinhAnh.tenHinhAnh}`}
                width={CANH_KHUNG_ANH}
                height={CANH_KHUNG_ANH}
                loading={index === 0 ? "eager" : "lazy"}
                style={{ maxWidth: "250px", objectFit: "contain" }}
              />
            </div>
          ))}
        </Carousel>
      </div>
    </div>
  );
};

export default HinhAnhSanPham;
