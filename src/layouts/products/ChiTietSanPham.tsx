import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import SachModel from "../../models/SachModel";
import { getBookById, getSachLienQuan } from "../../api/SachApi";
import HinhAnhSanPham from "./components/HinhAnhSanPham";
import DanhGiaSanPham, { renderStars } from "./components/DanhGiaSanPham";
import dinhDangSo from "../utils/DinhDangSo";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { themVaoGioHang } from "../utils/GioHangUtils";
import { themYeuThich, xoaYeuThich, getDanhSachYeuThich } from "../../api/YeuThichApi";
import SachProps from "./components/SachProps";

const ChiTietSanPham: React.FC = () => {
  const navigate = useNavigate();
  const { maSach } = useParams();
  let maSachNumber = 0;

  try {
    maSachNumber = parseInt(maSach + "");
    if (Number.isNaN(maSachNumber)) maSachNumber = 0;
  } catch (error) {
    maSachNumber = 0;
  }

  const [sach, setSach] = useState<SachModel | null>(null);
  const [dangTaiDuLieu, setDangTaiDuLieu] = useState(true);
  const [baoLoi, setBaoLoi] = useState<string | null>(null);
  const [soLuong, setSoLuong] = useState(1);
  const [sachLienQuan, setSachLienQuan] = useState<SachModel[]>([]);
  const [daYeuThich, setDaYeuThich] = useState(false);

  const tangSoLuong = () => {
    const soLuongTonKho = sach && sach.soLuong ? sach.soLuong : 0;
    if (soLuong < soLuongTonKho) {
      setSoLuong(soLuong + 1);
    }
  };

  const giamSoLuong = () => {
    if (soLuong > 1) {
      setSoLuong(soLuong - 1);
    }
  };

  const handleSoLuongChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const soLuongMoi = parseInt(event.target.value);
    const soLuongTonKho = sach && sach.soLuong ? sach.soLuong : 0;
    if (!isNaN(soLuongMoi) && soLuongMoi >= 1 && soLuongMoi <= soLuongTonKho) {
      setSoLuong(soLuongMoi);
    }
  };

  const handleMuaNgay = () => {
    if (!sach) return;
    const sanPhamMuaNgay = {
      maSach: sach.maSach,
      sachDto: {
        tenSach: sach.tenSach,
        giaBan: sach.giaBan,
        hinhAnh: sach.danhSachAnh?.[0]?.urlHinh || "",
      },
      soLuong: soLuong,
    };
    localStorage.setItem("gioHang", JSON.stringify([sanPhamMuaNgay]));
    if (localStorage.getItem("jwt")) {
      navigate("/thanh-toan");
    } else {
      navigate("/dat-hang-nhanh");
    }
  };

  useEffect(() => {
    getBookById(maSachNumber)
      .then((sach) => {
        setSach(sach);
        setDangTaiDuLieu(false);
      })
      .catch((error) => {
        setBaoLoi(error.message);
        setDangTaiDuLieu(false);
      });
  }, [maSachNumber]);

  useEffect(() => {
    if (maSachNumber > 0) {
      getSachLienQuan(maSachNumber, 6).then(setSachLienQuan).catch(console.error);
    }
  }, [maSachNumber]);

  useEffect(() => {
    const jwt = localStorage.getItem('jwt');
    if (jwt && maSachNumber > 0) {
      getDanhSachYeuThich()
        .then((list) => {
          const found = list.some((item) => item.maSach === maSachNumber);
          setDaYeuThich(found);
        })
        .catch(console.error);
    }
  }, [maSachNumber]);

  const toggleYeuThich = async () => {
    const jwt = localStorage.getItem('jwt');
    if (!jwt) {
      toast.info("Vui lòng đăng nhập để sử dụng tính năng yêu thích!");
      return;
    }
    try {
      if (daYeuThich) {
        await xoaYeuThich(maSachNumber);
        setDaYeuThich(false);
        toast.success("Đã xóa khỏi danh sách yêu thích!");
      } else {
        await themYeuThich(maSachNumber);
        setDaYeuThich(true);
        toast.success("Đã thêm vào danh sách yêu thích!");
      }
    } catch (error) {
      toast.error("Có lỗi xảy ra, vui lòng thử lại!");
    }
  };

  const xuLyThemVaoGioHang = () => {
    if (sach) {
      themVaoGioHang(sach, soLuong);
    }
  };

  if (dangTaiDuLieu) {
    return <div className="container py-5">Đang tải dữ liệu...</div>;
  }

  if (baoLoi) {
    return <div className="container py-5 text-center">Gặp lỗi: {baoLoi}</div>;
  }

  if (!sach) {
    return <div className="container py-5 text-center">Sách không tồn tại!</div>;
  }

  const moTaHienThi = sach.moTaChiTiet || sach.moTa || "Mô tả không có sẵn";

  return (
    <div className="container py-4">
      <div className="detail-section animate-fade-in">
        <div className="row">
          <div className="col-lg-5 mb-4 mb-lg-0">
            <div style={{ borderRadius: "var(--radius-md)", overflow: "hidden" }}>
              <HinhAnhSanPham maSach={maSachNumber} />
            </div>
          </div>

          <div className="col-lg-7">
            <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "1.8rem", fontWeight: 700, marginBottom: "0.5rem" }}>
              {sach.tenSach}
            </h1>

            <p style={{ color: "var(--color-text-secondary)", fontSize: "0.95rem", marginBottom: "0.75rem" }}>
              <i className="fas fa-pen-nib me-2"></i>{sach.tenTacGia}
            </p>

            <div className="mb-3">{renderStars(sach.trungBinhXepHang ?? 0)}</div>

            <div className="d-flex align-items-baseline gap-3 mb-3">
              <span className="detail-price">{dinhDangSo(sach.giaBan)} đ</span>
              {sach.giaNiemYet != null && sach.giaBan != null && sach.giaNiemYet > sach.giaBan && (
                <span style={{ textDecoration: "line-through", color: "var(--color-text-muted)", fontSize: "1.1rem" }}>
                  {dinhDangSo(sach.giaNiemYet)} đ
                </span>
              )}
            </div>

            <div style={{ color: "var(--color-text-secondary)", fontSize: "0.93rem", lineHeight: 1.7, marginBottom: "1rem" }}>
              {sach.moTaNgan && <p>{sach.moTaNgan}</p>}
              <div dangerouslySetInnerHTML={{ __html: moTaHienThi }} />
            </div>

            {sach.thongTinChiTiet && (
              <div className="mb-4">
                <h5>Thông tin chi tiết</h5>
                <ul className="list-group list-group-flush">
                  {sach.thongTinChiTiet.congTyPhatHanh && <li className="list-group-item px-0">Công ty phát hành: {sach.thongTinChiTiet.congTyPhatHanh}</li>}
                  {sach.thongTinChiTiet.nhaXuatBan && <li className="list-group-item px-0">Nhà xuất bản: {sach.thongTinChiTiet.nhaXuatBan}</li>}
                  {sach.thongTinChiTiet.ngayXuatBan && <li className="list-group-item px-0">Ngày xuất bản: {sach.thongTinChiTiet.ngayXuatBan}</li>}
                  {sach.thongTinChiTiet.soTrang ? <li className="list-group-item px-0">Số trang: {sach.thongTinChiTiet.soTrang}</li> : null}
                  {sach.thongTinChiTiet.loaiBia && <li className="list-group-item px-0">Loại bìa: {sach.thongTinChiTiet.loaiBia}</li>}
                  {sach.thongTinChiTiet.kichThuoc && <li className="list-group-item px-0">Kích thước: {sach.thongTinChiTiet.kichThuoc}</li>}
                </ul>
              </div>
            )}

            <hr style={{ borderColor: "var(--color-border)", opacity: 0.5 }} />

            <div className="row align-items-end mt-3">
              <div className="col-auto">
                <label style={{ fontWeight: 600, fontSize: "0.88rem", marginBottom: 8, display: "block", color: "var(--color-text-secondary)" }}>
                  Số lượng
                </label>
                <div className="qty-control">
                  <button onClick={giamSoLuong} aria-label="Giảm số lượng">-</button>
                  <input type="number" value={soLuong} min={1} onChange={handleSoLuongChange} aria-label="Số lượng" />
                  <button onClick={tangSoLuong} aria-label="Tăng số lượng">+</button>
                </div>
              </div>

              {sach.giaBan && (
                <div className="col-auto">
                  <div style={{ color: "var(--color-text-secondary)", fontSize: "0.85rem" }}>Tạm tính</div>
                  <div style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: "1.3rem", color: "var(--color-accent)" }}>
                    {dinhDangSo(soLuong * sach.giaBan)} đ
                  </div>
                </div>
              )}
            </div>

            <div className="d-flex gap-3 mt-4 flex-wrap">
              <button className="btn-modern-accent" onClick={handleMuaNgay} style={{ padding: "0.7rem 2rem" }}>
                <i className="fas fa-bolt"></i>
                Mua ngay
              </button>
              <button className="btn-modern-primary" onClick={xuLyThemVaoGioHang} style={{ padding: "0.7rem 2rem" }}>
                <i className="fas fa-shopping-cart"></i>
                Thêm vào giỏ hàng
              </button>
              <button className="btn-modern-outline" onClick={toggleYeuThich} style={{ padding: "0.7rem 1.5rem" }}>
                <i className={`fas fa-heart ${daYeuThich ? 'text-danger' : ''}`}></i>
                {daYeuThich ? ' Đã yêu thích' : ' Yêu thích'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 animate-fade-in-up">
        <DanhGiaSanPham maSach={maSachNumber} />
      </div>

      {sachLienQuan.length > 0 && (
        <div className="mt-4 animate-fade-in-up">
          <div className="section-header"><h2>Sách liên quan</h2></div>
          <div className="row">
            {sachLienQuan.map((s) => <SachProps key={s.maSach} sach={s} />)}
          </div>
        </div>
      )}
    </div>
  );
};

export default ChiTietSanPham;
