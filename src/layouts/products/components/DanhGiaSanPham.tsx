import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  CoTheDanhGia,
  DanhGiaHinhAnhCongKhai,
  KieuSapXepDanhGia,
  LyDoKhongDanhGiaDuoc,
  TrangDanhGia,
  layQuyenDanhGia,
  layTrangDanhGia,
  themAnhDanhGia,
  themDanhGiaMoi,
  thongDiepLoiAnhDanhGia,
  xoaAnhDanhGia,
  xoaDanhGia,
} from "../../../api/DanhGiaAPI";
import ChonAnhDanhGia from "./ChonAnhDanhGia";
import ChonSao from "./ChonSao";
import NutHuuIch from "./NutHuuIch";
import PhanBoSao from "./PhanBoSao";
import XemAnhLon from "./XemAnhLon";
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { toast } from "react-toastify";
import { useNavigate } from 'react-router-dom';
import { generateIdempotencyKey } from "../../../api/CheckoutIntent";
import { useAuthSession } from "../../../api/AuthSession";



interface DanhGiaSanPhamProps {
  maSach: number;
}

interface AnhDangXem {
  danhSach: DanhGiaHinhAnhCongKhai[];
  chiSo: number;
}

interface AnhChoTai {
  file: File;
  idempotencyKey: string;
}

function accountKey(status: string, uid: number | null): string {
  return status === "authenticated" && uid !== null ? `account:${uid}` : "guest";
}

/**
 * `unknown` is retryable, so it must not discard the draft of the account that is
 * being re-verified. The key only changes once the session resolves to a
 * different account or to a guest.
 */
function useAccountBoundaryKey(status: string, uid: number | null): string {
  const lastResolvedKey = useRef("guest");
  if (status !== "unknown") {
    lastResolvedKey.current = accountKey(status, uid);
  }
  return lastResolvedKey.current;
}

export const renderStars = (rating: number) => {
  const fullStars = Math.floor(rating);
  const halfStar = rating - fullStars >= 0.5;
  const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);

  return (
    <div className="stars d-inline-block">
      {[...Array(fullStars)].map((_, index) => (
        <i key={`full-${index}`} className="fas fa-star"></i>
      ))}
      {halfStar && <i className="fas fa-star-half-alt"></i>}
      {[...Array(emptyStars)].map((_, index) => (
        <i key={`empty-${index}`} className="far fa-star"></i>
      ))}
    </div>
  );
};

/**
 * Bon ly do dan toi bon hanh dong khac nhau. Gop thanh mot cau "ban khong the danh gia"
 * bat nguoi dung tu doan minh dang thieu gi, va ho thuong doan sai.
 */
const KICH_THUOC_TRANG = 10;

const NHAN_SAP_XEP: Array<{ gia_tri: KieuSapXepDanhGia; nhan: string }> = [
  { gia_tri: "moi-nhat", nhan: "Mới nhất" },
  { gia_tri: "cu-nhat", nhan: "Cũ nhất" },
  { gia_tri: "diem-cao", nhan: "Điểm cao" },
  { gia_tri: "diem-thap", nhan: "Điểm thấp" },
];

const THONG_DIEP_KHONG_DANH_GIA_DUOC: Record<LyDoKhongDanhGiaDuoc, string> = {
  CHUA_MUA: "Chỉ khách đã mua và nhận cuốn sách này mới đánh giá được.",
  CHUA_NHAN_HANG: "Đơn của bạn chưa được giao xong. Bạn đánh giá được ngay sau khi nhận hàng.",
  DA_DANH_GIA: "Bạn đã đánh giá cuốn sách này rồi.",
  DA_BI_AN: "Đánh giá của bạn cho cuốn sách này đã bị ẩn nên không thể đăng lại.",
};

const DanhGiaSanPhamContent: React.FC<
  DanhGiaSanPhamProps & { authUid: number | null; authStatus: string }
> = ({ maSach, authUid, authStatus }) => {
  const [trangDanhGia, setTrangDanhGia] = useState<TrangDanhGia | null>(null);
  const [trang, setTrang] = useState(0);
  const [sapXep, setSapXep] = useState<KieuSapXepDanhGia>("moi-nhat");
  const [locSao, setLocSao] = useState<number | null>(null);
  const [dangTaiDuLieu, setDangTaiDuLieu] = useState(true);
  const [baoLoi, setBaoLoi] = useState<string | null>(null);
  const [quyenDanhGia, setQuyenDanhGia] = useState<CoTheDanhGia | null>(null);
  const [danhGiaMoi, setDanhGiaMoi] = useState({ diemXepHang: 5, nhanXet: "" });
  const [anhDaChon, setAnhDaChon] = useState<File[]>([]);
  const [dangGui, setDangGui] = useState(false);
  const [loiGui, setLoiGui] = useState<string | null>(null);
  const [thongBao, setThongBao] = useState("");
  const [anhDangXem, setAnhDangXem] = useState<AnhDangXem | null>(null);
  const [anhDangXoa, setAnhDangXoa] = useState<number | null>(null);
  const [taiLaiAnh, setTaiLaiAnh] = useState<{
    maDanhGia: number;
    files: AnhChoTai[];
  } | null>(null);
  const navigate = useNavigate();
  const mounted = useRef(true);
  const daDangNhap = authStatus === "authenticated" && authUid !== null;

  useEffect(() => () => {
    mounted.current = false;
  }, []);

  const taiTrang = useCallback(
    () => layTrangDanhGia(maSach, { page: trang, size: KICH_THUOC_TRANG, sort: sapXep, loc: locSao }),
    [maSach, trang, sapXep, locSao]
  );

  useEffect(() => {
    let conHieuLuc = true;
    setDangTaiDuLieu(true);
    taiTrang()
      .then((ketQua) => {
        if (!conHieuLuc) return;
        setTrangDanhGia(ketQua);
        setBaoLoi(null);
        setDangTaiDuLieu(false);
      })
      .catch((error) => {
        if (!conHieuLuc) return;
        setDangTaiDuLieu(false);
        setBaoLoi(error.message);
      });
    return () => {
      conHieuLuc = false;
    };
  }, [taiTrang]);

  /**
   * `dangGui` chặn lần gửi thứ hai ngay trong handler, không chỉ vô hiệu hoá nút. Người
   * dùng bấm hai lần thật nhanh có thể lọt qua trước khi React vẽ lại trạng thái disabled,
   * và khi đó lần thứ hai trả về 409 — một thông báo lỗi cho một thao tác đã thành công.
   */
  const guiDanhGia = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (dangGui) return;
    setDangGui(true);
    setLoiGui(null);

    let daTao;
    try {
      daTao = await themDanhGiaMoi(
        maSach,
        danhGiaMoi.nhanXet,
        danhGiaMoi.diemXepHang,
        0
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không thể gửi đánh giá.";
      setLoiGui(message);
      toast.error(message);
      setDangGui(false);
      return;
    }

    if (!mounted.current) return;

    // Review chữ đã được commit. Ẩn form ngay, không để lỗi upload/refresh phía sau
    // biến một thao tác đã thành công thành thông báo "gửi thất bại".
    setQuyenDanhGia({ coThe: false, maDonHang: null, lyDo: "DA_DANH_GIA" });
    setDanhGiaMoi({ diemXepHang: 5, nhanXet: "" });
    setAnhDaChon([]);

    const anhChoTai = anhDaChon.map((file) => ({
      file,
      idempotencyKey: generateIdempotencyKey(),
    }));
    let soAnhDaTai = 0;
    let loiAnh: string | null = null;

    for (let index = 0; index < anhChoTai.length; index += 1) {
      const anh = anhChoTai[index];
      try {
        await themAnhDanhGia(
          daTao.maDanhGia,
          anh.file,
          anh.idempotencyKey
        );
        soAnhDaTai += 1;
      } catch (error) {
        loiAnh = thongDiepLoiAnhDanhGia(error);
        setTaiLaiAnh({
          maDanhGia: daTao.maDanhGia,
          files: anhChoTai.slice(index),
        });
        break;
      }
    }

    if (!loiAnh) setTaiLaiAnh(null);

    if (loiAnh) {
      const ketQuaAnh = soAnhDaTai > 0
        ? ` Đã tải ${soAnhDaTai}/${anhChoTai.length} ảnh.`
        : "";
      setThongBao(`Đánh giá chữ đã được lưu.${ketQuaAnh} ${loiAnh}`);
      toast.error(`Đánh giá chữ đã được lưu.${ketQuaAnh} ${loiAnh}`);
    } else {
      setThongBao(
        anhChoTai.length > 0
          ? `Đã gửi đánh giá và ${soAnhDaTai} ảnh của bạn.`
          : "Đã gửi đánh giá của bạn."
      );
    }

    try {
      const [trangMoi, quyenMoi] = await Promise.all([
        taiTrang(),
        layQuyenDanhGia(maSach),
      ]);
      setTrangDanhGia(trangMoi);
      setQuyenDanhGia(quyenMoi);
    } catch {
      setThongBao("Đánh giá đã được lưu nhưng chưa thể làm mới danh sách.");
    } finally {
      setDangGui(false);
    }
  };

  const taiLaiAnhConThieu = async () => {
    if (!taiLaiAnh || dangGui) return;
    setDangGui(true);
    let soAnhDaTai = 0;
    try {
      for (let index = 0; index < taiLaiAnh.files.length; index += 1) {
        const anh = taiLaiAnh.files[index];
        try {
          await themAnhDanhGia(
            taiLaiAnh.maDanhGia,
            anh.file,
            anh.idempotencyKey
          );
          soAnhDaTai += 1;
        } catch (error) {
          setTaiLaiAnh({
            maDanhGia: taiLaiAnh.maDanhGia,
            files: taiLaiAnh.files.slice(index),
          });
          const message = thongDiepLoiAnhDanhGia(error);
          setThongBao(`Đã tải thêm ${soAnhDaTai} ảnh. ${message}`);
          toast.error(message);
          return;
        }
      }
      setTaiLaiAnh(null);
      setTrangDanhGia(await taiTrang());
      setThongBao(`Đã tải thêm ${soAnhDaTai} ảnh vào đánh giá của bạn.`);
    } finally {
      setDangGui(false);
    }
  };

  const xoaDanhGiaCuaToi = async (maDanhGia: number) => {
    if (!window.confirm("Bạn muốn xoá đánh giá này?")) return;
    try {
      await xoaDanhGia(maDanhGia);
      setTrangDanhGia(await taiTrang());
      setQuyenDanhGia(await layQuyenDanhGia(maSach));
      setThongBao("Đã xoá đánh giá của bạn.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể xoá đánh giá.");
    }
  };

  const xoaAnhCuaToi = async (maHinhAnh: number) => {
    if (!window.confirm("Bạn muốn gỡ ảnh này khỏi đánh giá?")) return;
    setAnhDangXoa(maHinhAnh);
    try {
      await xoaAnhDanhGia(maHinhAnh);
      setAnhDangXem(null);
      setTrangDanhGia(await taiTrang());
      setThongBao("Đã gỡ ảnh khỏi đánh giá của bạn.");
    } catch (error) {
      toast.error(thongDiepLoiAnhDanhGia(error));
    } finally {
      setAnhDangXoa(null);
    }
  };

  // Đổi bộ lọc hay kiểu sắp xếp thì phải về trang đầu: giữ nguyên trang 3 khi tập kết
  // quả vừa co lại còn một trang sẽ cho ra một danh sách rỗng không giải thích được.
  useEffect(() => {
    setTrang(0);
  }, [sapXep, locSao]);

  // Hoi quyen truoc khi hien form, de nguoi dung khong go xong ca bai roi moi bi tu choi.
  // Loi o day khong duoc chan danh sach danh gia: doc va viet la hai viec doc lap.
  useEffect(() => {
    // `unknown` là trạng thái tạm và thử lại được: giữ nguyên quyền cùng bản nháp
    // đang gõ thay vì xoá, để một lần làm mới phiên không cuốn mất bài viết dở.
    if (authStatus === "unknown") return;
    if (!daDangNhap) {
      setQuyenDanhGia(null);
      return;
    }
    let conHieuLuc = true;
    layQuyenDanhGia(maSach)
      .then((quyen) => {
        if (conHieuLuc) setQuyenDanhGia(quyen);
      })
      .catch(() => {
        if (conHieuLuc) setQuyenDanhGia(null);
      });
    return () => {
      conHieuLuc = false;
    };
  }, [maSach, daDangNhap, authStatus]);

  

  // Chỉ chặn màn hình ở lần tải đầu. Sau đó, đổi trang hay đổi bộ lọc mà xoá sạch danh
  // sách rồi vẽ lại từ spinner sẽ làm trang nhảy và mất vị trí cuộn.
  if (dangTaiDuLieu && trangDanhGia === null) {
    return (
      <div className="text-center my-4">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Đang tải...</span>
        </div>
      </div>
    );
  }

  if (baoLoi) {
    return (
      <div className="alert alert-danger" role="alert">
        <i className="fas fa-exclamation-circle me-2"></i>
        {baoLoi}
      </div>
    );
  }

 



  return (
    <div className="review-section my-4">
      {authStatus === "guest" ? (
        <div className="review-login-prompt">
          <div>
            <strong>Bạn đã đọc cuốn này?</strong>
            <p>Đăng nhập để chia sẻ cảm nhận với người mua khác.</p>
          </div>
          <button
            type="button"
            className="btn-modern-outline-primary"
            onClick={() => navigate("/dang-nhap")}
          >
            Đăng nhập để đánh giá
          </button>
        </div>
      ) : quyenDanhGia && !quyenDanhGia.coThe ? (
        <div className="review-login-prompt" role="status">
          <div>
            <strong>Chưa thể đánh giá</strong>
            <p>
              {quyenDanhGia.lyDo
                ? THONG_DIEP_KHONG_DANH_GIA_DUOC[quyenDanhGia.lyDo]
                : "Bạn chưa đủ điều kiện đánh giá cuốn sách này."}
            </p>
          </div>
        </div>
      ) : quyenDanhGia?.coThe ? (
      <div className="card mb-4">
        <div className="card-body">
          <h4 className="mb-3">Đánh giá sản phẩm</h4>
          {/* Logic nằm ở `onSubmit` chứ không phải `onClick` của nút: chỉ `onSubmit` mới
              bắt được cả phím Enter trong ô nhập, và mới để `required` của trình duyệt
              chặn trước khi gửi. */}
          <form onSubmit={guiDanhGia} noValidate={false}>
            <div className="mb-3">
              <ChonSao
                giaTri={danhGiaMoi.diemXepHang}
                onChon={(sao) => setDanhGiaMoi({ ...danhGiaMoi, diemXepHang: sao })}
                disabled={dangGui}
              />
            </div>
            <div className="mb-3">
              <label className="form-label" htmlFor="nhan-xet-danh-gia">Nhận xét:</label>
              <textarea
                id="nhan-xet-danh-gia"
                className="form-control"
                rows={3}
                value={danhGiaMoi.nhanXet}
                onChange={(e) => setDanhGiaMoi({ ...danhGiaMoi, nhanXet: e.target.value })}
                disabled={dangGui}
                required
              />
            </div>

            <div className="mb-3">
              <ChonAnhDanhGia files={anhDaChon} onChange={setAnhDaChon} disabled={dangGui} />
            </div>

            {loiGui && (
              <div className="alert alert-danger py-2" role="alert">
                {loiGui}
              </div>
            )}

            <button type="submit" className="btn btn-primary" disabled={dangGui}>
              {dangGui ? "Đang gửi…" : "Gửi đánh giá"}
            </button>
          </form>
        </div>
      </div>
      ) : null}

      {taiLaiAnh && (
        <div className="alert alert-warning d-flex justify-content-between align-items-center gap-3" role="status">
          <span>
            Còn {taiLaiAnh.files.length} ảnh chưa tải lên. Đánh giá chữ của bạn đã được lưu.
          </span>
          <button
            type="button"
            className="btn btn-sm btn-outline-primary"
            onClick={taiLaiAnhConThieu}
            disabled={dangGui}
          >
            {dangGui ? "Đang tải lại…" : `Tải lại ${taiLaiAnh.files.length} ảnh`}
          </button>
        </div>
      )}

      {/* Live region luôn có mặt trong cây DOM. Chèn nó cùng lúc với nội dung thì trình
          đọc màn hình thường bỏ qua lần thông báo đầu tiên. */}
      <div role="status" aria-live="polite" className="visually-hidden">
        {thongBao}
      </div>

      <div className="section-header">
        <h2>Đánh giá từ khách hàng</h2>
      </div>

      {trangDanhGia && (
        <PhanBoSao
          phanBo={trangDanhGia.phanBo}
          tongSo={trangDanhGia.tongSo}
          diemTrungBinh={trangDanhGia.diemTrungBinh}
          locSao={locSao}
          onChonSao={setLocSao}
        />
      )}

      <div className="d-flex justify-content-end mb-2">
        <label className="me-2 align-self-center" htmlFor="sap-xep-danh-gia">
          Sắp xếp:
        </label>
        <select
          id="sap-xep-danh-gia"
          className="form-select w-auto"
          value={sapXep}
          onChange={(e) => setSapXep(e.target.value as KieuSapXepDanhGia)}
        >
          {NHAN_SAP_XEP.map((tuyChon) => (
            <option key={tuyChon.gia_tri} value={tuyChon.gia_tri}>
              {tuyChon.nhan}
            </option>
          ))}
        </select>
      </div>

      <div className="review-list">
        {trangDanhGia && trangDanhGia.content.length === 0 ? (
          <p className="text-muted">
            {locSao === null
              ? "Chưa có đánh giá nào cho cuốn sách này."
              : `Chưa có đánh giá ${locSao} sao nào.`}
          </p>
        ) : (
          trangDanhGia?.content.map((danhGia) => (
            <div key={danhGia.maDanhGia} className="review-item card mb-3">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <div>
                    <i className="fas fa-user-circle me-2 text-primary"></i>
                    {/* Tên đã được backend che sẵn. Trước đây mọi dòng đều ghi cứng
                        "Khách hàng" vì backend không trả về tên nào cả. */}
                    <span className="fw-bold">{danhGia.tenHienThi}</span>
                    {danhGia.laCuaToi && (
                      <span className="badge bg-secondary ms-2">Đánh giá của bạn</span>
                    )}
                  </div>
                  <small className="text-muted">
                    {danhGia.timestamp
                      ? format(new Date(danhGia.timestamp), 'dd/MM/yyyy HH:mm', { locale: vi })
                      : ''}
                  </small>
                </div>
                <div className="mb-2">
                  {renderStars(danhGia.diemXepHang)}
                  <span className="ms-2 text-muted">
                    ({danhGia.diemXepHang}/5)
                  </span>
                </div>
                <p className="review-content mb-0">
                  {danhGia.nhanXet}
                </p>
                {danhGia.anhDinhKem?.length > 0 && (
                  <ul className="review-image-list" aria-label={`Ảnh của đánh giá từ ${danhGia.tenHienThi}`}>
                    {danhGia.anhDinhKem.map((anh, index) => (
                      <li key={anh.maHinhAnh}>
                        <button
                          type="button"
                          className="review-image-thumbnail"
                          onClick={() => setAnhDangXem({ danhSach: danhGia.anhDinhKem, chiSo: index })}
                          aria-label={`Xem ảnh đánh giá ${index + 1} ở kích thước lớn`}
                        >
                          <img
                            src={anh.urlHinh}
                            alt=""
                            width={112}
                            height={112}
                            loading="lazy"
                          />
                        </button>
                        {danhGia.laCuaToi && (
                          <button
                            type="button"
                            className="btn btn-link btn-sm p-0 text-danger"
                            onClick={() => xoaAnhCuaToi(anh.maHinhAnh)}
                            disabled={anhDangXoa === anh.maHinhAnh}
                          >
                            {anhDangXoa === anh.maHinhAnh ? "Đang gỡ…" : `Gỡ ảnh ${index + 1}`}
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
                {/* Phản hồi của shop lồng ngay dưới bài, không phải một dòng riêng trong
                    danh sách: nó là câu trả lời cho đúng bài này. */}
                {danhGia.phanHoiShop && (
                  <div className="mt-3 ps-3 border-start border-3">
                    <strong className="d-block">Phản hồi từ shop</strong>
                    <p className="mb-0">{danhGia.phanHoiShop}</p>
                  </div>
                )}

                <div className="d-flex align-items-center gap-3 mt-2">
                  <NutHuuIch
                    key={danhGia.maDanhGia}
                    maDanhGia={danhGia.maDanhGia}
                    soLuot={danhGia.soLuotHuuIch}
                    daBinhChon={danhGia.toiDaBinhChon}
                    laCuaToi={danhGia.laCuaToi}
                    daDangNhap={daDangNhap}
                    onLoi={(thongDiep) => toast.error(thongDiep)}
                  />
                  {/* Chỉ chủ sở hữu thấy nút này. Backend vẫn kiểm tra quyền sở hữu ở
                      `deleteReview`, nên ẩn nút là chuyện giao diện chứ không phải bảo vệ. */}
                  {danhGia.laCuaToi && (
                    <button
                      type="button"
                      className="btn btn-link btn-sm p-0 text-danger"
                      onClick={() => xoaDanhGiaCuaToi(danhGia.maDanhGia)}
                    >
                      Xoá đánh giá của tôi
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {trangDanhGia && trangDanhGia.tongSoTrang > 1 && (
        <div className="d-flex justify-content-between align-items-center">
          <button
            type="button"
            className="btn btn-outline-secondary"
            disabled={trang === 0}
            onClick={() => setTrang((p) => Math.max(0, p - 1))}
          >
            Trang trước
          </button>
          <span>
            Trang {trang + 1} / {trangDanhGia.tongSoTrang}
          </span>
          <button
            type="button"
            className="btn btn-outline-secondary"
            disabled={trang + 1 >= trangDanhGia.tongSoTrang}
            onClick={() => setTrang((p) => p + 1)}
          >
            Trang sau
          </button>
        </div>
      )}

      {anhDangXem && (
        <XemAnhLon
          danhSach={anhDangXem.danhSach}
          chiSo={anhDangXem.chiSo}
          onChuyen={(chiSo) => setAnhDangXem({ ...anhDangXem, chiSo })}
          onDong={() => setAnhDangXem(null)}
        />
      )}
    </div>
  );
};

const DanhGiaSanPham: React.FC<DanhGiaSanPhamProps> = ({ maSach }) => {
  const auth = useAuthSession();
  const boundaryKey = useAccountBoundaryKey(auth.status, auth.uid);

  return (
    <DanhGiaSanPhamContent
      key={boundaryKey}
      maSach={maSach}
      authUid={auth.uid}
      authStatus={auth.status}
    />
  );
};

export default DanhGiaSanPham;
