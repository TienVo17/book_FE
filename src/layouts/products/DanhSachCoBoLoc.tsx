import React, { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import SachModel from "../../models/SachModel";
import SachProps from "./components/SachProps";
import { PhanTrang } from "../utils/PhanTrang";
import { findByBook, SachSortOption } from "../../api/SachApi";
import LoiTaiDuLieu from "./components/LoiTaiDuLieu";
import KhongCoKetQua from "./components/KhongCoKetQua";
import dinhDangSo from "../utils/DinhDangSo";

interface TuyChonSapXep {
  giaTri: SachSortOption;
  nhan: string;
}

export const TUY_CHON_SAP_XEP: TuyChonSapXep[] = [
  { giaTri: "moi-nhat", nhan: "Mới nhất" },
  { giaTri: "gia-tang", nhan: "Giá tăng dần" },
  { giaTri: "gia-giam", nhan: "Giá giảm dần" },
  { giaTri: "ten-az", nhan: "Tên A-Z" },
  { giaTri: "danh-gia", nhan: "Đánh giá cao" },
];

const SAP_XEP_MAC_DINH: SachSortOption = "moi-nhat";

function docSapXep(gia_tri: string | null): SachSortOption {
  const timThay = TUY_CHON_SAP_XEP.find((tc) => tc.giaTri === gia_tri);
  return timThay ? timThay.giaTri : SAP_XEP_MAC_DINH;
}

/** `undefined` khi không có/không hợp lệ — chỉ nhận số nguyên >= 0. */
function docGia(value: string | null): number | undefined {
  if (value === null || value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

type KhoaBoLoc = "q" | "giaMin" | "giaMax" | "sort" | "maTheLoai";

interface DanhSachCoBoLocProps {
  /**
   * Khi có giá trị, thể loại bị khoá theo trang đang đứng (trang `/the-loai/:slug`)
   * và không hiện chip gỡ — gỡ nó ra thì trang tự mâu thuẫn với chính tiêu đề của mình.
   */
  maTheLoaiCoDinh?: number;
  thongDiepRong?: string;
}

/**
 * Khối "lọc + sắp xếp + danh sách kết quả" dùng chung cho trang tìm kiếm và trang thể loại.
 *
 * Tách ra vì trang thể loại trước đây chỉ có danh sách trần: không sắp xếp, không lọc giá,
 * không tìm trong thể loại. Khách duyệt theo thể loại vì thế có ít công cụ hơn khách tìm
 * kiếm — ngược với trực giác. Chép khối này sang là tạo ra hai bản sẽ lệch nhau dần.
 *
 * URL vẫn là nguồn sự thật duy nhất, nên cả hai trang chia sẻ đúng một bộ tham số.
 */
const DanhSachCoBoLoc: React.FC<DanhSachCoBoLocProps> = ({ maTheLoaiCoDinh, thongDiepRong }) => {
  const [searchParams, setSearchParams] = useSearchParams();

  const tuKhoa = (searchParams.get("q") ?? "").trim();
  const maTheLoaiTuUrl = Number(searchParams.get("maTheLoai")) || 0;
  const maTheLoai = maTheLoaiCoDinh ?? maTheLoaiTuUrl;
  const sort = docSapXep(searchParams.get("sort"));
  const giaMin = docGia(searchParams.get("giaMin"));
  const giaMax = docGia(searchParams.get("giaMax"));
  const trangHienTai = Math.max(1, Number(searchParams.get("page")) || 1);

  const [danhSach, setDanhSach] = useState<SachModel[]>([]);
  const [tongSoSach, setTongSoSach] = useState(0);
  const [tongSoTrang, setTongSoTrang] = useState(0);
  const [dangTai, setDangTai] = useState(true);
  const [loi, setLoi] = useState(false);
  const [lanThuLai, setLanThuLai] = useState(0);

  // Ô nhập khoảng giá được soạn riêng, chỉ áp dụng vào URL khi bấm "Áp dụng" —
  // gọi API mỗi lần gõ phím sẽ vừa tốn lượt gọi vừa làm trang giật liên tục.
  const [giaMinNhap, setGiaMinNhap] = useState(giaMin?.toString() ?? "");
  const [giaMaxNhap, setGiaMaxNhap] = useState(giaMax?.toString() ?? "");
  const [loiKhoangGia, setLoiKhoangGia] = useState<string | null>(null);

  useEffect(() => {
    setGiaMinNhap(giaMin?.toString() ?? "");
    setGiaMaxNhap(giaMax?.toString() ?? "");
  }, [giaMin, giaMax]);

  useEffect(() => {
    let conHieuLuc = true;
    setDangTai(true);
    setLoi(false);

    findByBook(tuKhoa, maTheLoai, trangHienTai - 1, { sort, giaMin, giaMax })
      .then((kq) => {
        if (!conHieuLuc) return;
        setDanhSach(kq.ketQua);
        setTongSoSach(kq.tongSoSach);
        setTongSoTrang(kq.tongSoTrang);
        setDangTai(false);
      })
      .catch(() => {
        if (!conHieuLuc) return;
        setLoi(true);
        setDangTai(false);
      });

    return () => {
      conHieuLuc = false;
    };
  }, [tuKhoa, maTheLoai, sort, giaMin, giaMax, trangHienTai, lanThuLai]);

  const capNhatThamSo = useCallback(
    (thayDoi: Record<string, string | undefined>, veTrang1: boolean = true) => {
      setSearchParams((truoc) => {
        const banSao = new URLSearchParams(truoc);
        Object.entries(thayDoi).forEach(([key, value]) => {
          if (value === undefined || value === "") {
            banSao.delete(key);
          } else {
            banSao.set(key, value);
          }
        });
        // Đổi bộ lọc/sắp xếp phải quay lại trang 1: nếu không, tập kết quả co
        // lại có thể khiến trang hiện tại trỏ ra ngoài phạm vi và hiện danh
        // sách rỗng không rõ nguyên nhân.
        if (veTrang1) {
          banSao.delete("page");
        }
        return banSao;
      });
    },
    [setSearchParams],
  );

  const doiSapXep = (giaTri: SachSortOption) => {
    capNhatThamSo({ sort: giaTri === SAP_XEP_MAC_DINH ? undefined : giaTri });
  };

  const apDungKhoangGia = (e: React.FormEvent) => {
    e.preventDefault();
    const min = giaMinNhap.trim() === "" ? undefined : Number(giaMinNhap);
    const max = giaMaxNhap.trim() === "" ? undefined : Number(giaMaxNhap);

    if ((min !== undefined && (!Number.isFinite(min) || min < 0))
      || (max !== undefined && (!Number.isFinite(max) || max < 0))) {
      setLoiKhoangGia("Giá phải là số không âm.");
      return;
    }
    if (min !== undefined && max !== undefined && min > max) {
      setLoiKhoangGia("Giá tối thiểu không được lớn hơn giá tối đa.");
      return;
    }

    setLoiKhoangGia(null);
    capNhatThamSo({ giaMin: min?.toString(), giaMax: max?.toString() });
  };

  const phanTrang = (trang: number) => {
    capNhatThamSo({ page: trang > 1 ? String(trang) : undefined }, false);
  };

  const thuLai = () => setLanThuLai((n) => n + 1);

  const xoaBoLoc = (key: KhoaBoLoc) => {
    capNhatThamSo({ [key]: undefined });
  };

  const boLocDangApDung: { key: KhoaBoLoc; nhan: string }[] = [];
  if (tuKhoa) boLocDangApDung.push({ key: "q", nhan: `Từ khóa: "${tuKhoa}"` });
  if (giaMin !== undefined) boLocDangApDung.push({ key: "giaMin", nhan: `Từ ${dinhDangSo(giaMin)}đ` });
  if (giaMax !== undefined) boLocDangApDung.push({ key: "giaMax", nhan: `Đến ${dinhDangSo(giaMax)}đ` });
  if (sort !== SAP_XEP_MAC_DINH) {
    const nhan = TUY_CHON_SAP_XEP.find((tc) => tc.giaTri === sort)?.nhan ?? sort;
    boLocDangApDung.push({ key: "sort", nhan: `Sắp xếp: ${nhan}` });
  }
  // Chỉ hiện chip thể loại khi nó đến từ URL. Trên trang /the-loai/:slug thì thể loại là
  // chính danh tính của trang, gỡ được nó ra sẽ cho một danh sách không khớp tiêu đề.
  if (maTheLoaiCoDinh === undefined && maTheLoaiTuUrl > 0) {
    boLocDangApDung.push({ key: "maTheLoai", nhan: "Đã lọc theo thể loại" });
  }

  return (
    <>
      {!dangTai && !loi && (
        <p style={{ margin: "0 0 0.75rem", color: "var(--color-text-secondary)" }}>
          Tìm thấy {tongSoSach} kết quả{tuKhoa ? ` cho "${tuKhoa}"` : ""}
        </p>
      )}

      {boLocDangApDung.length > 0 && (
        <div className="tim-kiem-bo-loc" aria-label="Bộ lọc đang áp dụng">
          {boLocDangApDung.map((bl) => (
            <button
              key={bl.key}
              type="button"
              className="filter-chip"
              onClick={() => xoaBoLoc(bl.key)}
            >
              {bl.nhan}
              <span aria-hidden="true">×</span>
              <span className="visually-hidden">Bỏ bộ lọc {bl.nhan}</span>
            </button>
          ))}
        </div>
      )}

      <div className="tim-kiem-thanh-cong-cu">
        <div className="tim-kiem-sap-xep">
          <label htmlFor="tim-kiem-sap-xep-select">Sắp xếp theo</label>
          <select
            id="tim-kiem-sap-xep-select"
            value={sort}
            onChange={(e) => doiSapXep(e.target.value as SachSortOption)}
          >
            {TUY_CHON_SAP_XEP.map((tc) => (
              <option key={tc.giaTri} value={tc.giaTri}>{tc.nhan}</option>
            ))}
          </select>
        </div>

        <form className="tim-kiem-khoang-gia" onSubmit={apDungKhoangGia}>
          <label htmlFor="tim-kiem-gia-min">Giá từ</label>
          <input
            id="tim-kiem-gia-min"
            type="number"
            min={0}
            inputMode="numeric"
            value={giaMinNhap}
            onChange={(e) => setGiaMinNhap(e.target.value)}
          />
          <label htmlFor="tim-kiem-gia-max">đến</label>
          <input
            id="tim-kiem-gia-max"
            type="number"
            min={0}
            inputMode="numeric"
            value={giaMaxNhap}
            onChange={(e) => setGiaMaxNhap(e.target.value)}
          />
          <button type="submit" className="btn-modern-outline-primary">Áp dụng</button>
        </form>
      </div>
      {loiKhoangGia && <p role="alert" className="text-danger">{loiKhoangGia}</p>}

      {dangTai && (
        <div className="row">
          {[1, 2, 3, 4].map((i) => (
            <div className="col-lg-3 col-md-4 col-6 mb-4" key={i}>
              <div className="product-card">
                <div className="skeleton skeleton-img"></div>
                <div className="product-card-body">
                  <div className="skeleton skeleton-text"></div>
                  <div className="skeleton skeleton-text-sm"></div>
                  <div className="skeleton skeleton-text-sm" style={{ width: "40%" }}></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!dangTai && loi && <LoiTaiDuLieu onThuLai={thuLai} />}

      {!dangTai && !loi && danhSach.length === 0 && (
        <KhongCoKetQua
          thongDiep={thongDiepRong ?? "Không tìm thấy sách phù hợp. Hãy thử bỏ bớt bộ lọc hoặc đổi từ khóa."}
        />
      )}

      {!dangTai && !loi && danhSach.length > 0 && (
        <>
          <div className="row">
            {danhSach.map((sach) => (
              <SachProps key={sach.maSach} sach={sach} />
            ))}
          </div>
          {tongSoTrang > 1 && (
            <PhanTrang
              trangHienTai={trangHienTai}
              tongSoTrang={tongSoTrang}
              phanTrang={phanTrang}
            />
          )}
        </>
      )}
    </>
  );
};

export default DanhSachCoBoLoc;
