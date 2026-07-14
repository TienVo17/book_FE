import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getBookById } from '../../../../api/SachApi';
import { findImageByBook } from '../../../../api/HinhAnhApi';
import { dieuChinhTonKhoSach, updateSachAdmin, uploadHinhAnhSach } from '../../../../api/AdminApi';
import { ApiRequestError } from '../../../../api/Request';
import { getAdminTheLoai } from '../../../../api/TheLoaiApi';
import SachModel from '../../../../models/SachModel';
import UploadFile, { UploadFileValue } from '../UploadFile';
import { TheLoaiAdminModel } from '../../../../models/TheLoaiModel';

const MIN_STOCK_DELTA = -2147483648;
const MAX_STOCK_DELTA = 2147483647;
const SIGNED_INTEGER_PATTERN = /^[+-]?\d+$/;

type StockDeltaValidation =
  | { isValid: true; value: number }
  | { isValid: false; message: string };

function validateStockDelta(input: string): StockDeltaValidation {
  const normalizedInput = input.trim();
  if (!normalizedInput) {
    return { isValid: false, message: 'Vui lòng nhập số lượng cần điều chỉnh.' };
  }
  if (!SIGNED_INTEGER_PATTERN.test(normalizedInput)) {
    return { isValid: false, message: 'Số lượng thay đổi phải là số nguyên, ví dụ 5 hoặc -3.' };
  }

  const value = Number(normalizedInput);
  if (!Number.isSafeInteger(value) || value < MIN_STOCK_DELTA || value > MAX_STOCK_DELTA) {
    return { isValid: false, message: 'Số lượng thay đổi nằm ngoài phạm vi cho phép.' };
  }
  if (value === 0) {
    return { isValid: false, message: 'Số lượng thay đổi phải khác 0.' };
  }

  return { isValid: true, value };
}

const emptySach: SachModel = {
  maSach: 0,
  tenSach: '',
  giaBan: 0,
  giaNiemYet: 0,
  moTa: '',
  moTaNgan: '',
  moTaChiTiet: '',
  soLuong: 0,
  tenTacGia: '',
  isbn: '',
  trungBinhXepHang: 0,
  listImageStr: [],
  maTheLoaiList: [],
  thongTinChiTiet: {
    congTyPhatHanh: '',
    nhaXuatBan: '',
    ngayXuatBan: '',
    soTrang: 0,
    loaiBia: '',
    ngonNgu: '',
    kichThuoc: '',
    trongLuongGram: 0,
    phienBan: '',
  },
};

const CapNhatSach: React.FC = () => {
  const { maSach } = useParams<{ maSach: string }>();
  const navigate = useNavigate();
  const [sach, setSach] = useState<SachModel>(emptySach);
  const [danhSachTheLoai, setDanhSachTheLoai] = useState<TheLoaiAdminModel[]>([]);
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>([]);
  const [uploadValue, setUploadValue] = useState<UploadFileValue>({ existingUrls: [], newFiles: [] });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stockDelta, setStockDelta] = useState('');
  const [stockDeltaError, setStockDeltaError] = useState('');
  const [stockDeltaSuccess, setStockDeltaSuccess] = useState('');
  const [isAdjustingStock, setIsAdjustingStock] = useState(false);
  const [mustReloadStock, setMustReloadStock] = useState(false);
  const actionInFlight = useRef(false);

  useEffect(() => {
    getAdminTheLoai().then(setDanhSachTheLoai).catch(console.error);
  }, []);

  useEffect(() => {
    const bookId = Number(maSach);
    if (!bookId) {
      return;
    }

    Promise.all([getBookById(bookId), findImageByBook(bookId)])
      .then(([sachData, imageData]) => {
        if (!sachData) {
          throw new Error('Không thể lấy thông tin sách');
        }

        const urls = (imageData || [])
          .map((item) => item.urlHinh)
          .filter((url): url is string => Boolean(url));

        setSach({
          ...emptySach,
          ...sachData,
          maTheLoaiList: sachData.listTheLoai?.map((item) => item.maTheLoai) || sachData.maTheLoaiList || [],
          thongTinChiTiet: {
            ...emptySach.thongTinChiTiet,
            ...sachData.thongTinChiTiet,
          },
        });
        setExistingImageUrls(urls);
        setUploadValue({ existingUrls: urls, newFiles: [] });
      })
      .catch((error) => {
        const errorMessage = error instanceof Error ? error.message : 'Không thể lấy thông tin sách';
        alert(errorMessage);
      });
  }, [maSach]);

  const handleUploadChange = useCallback((value: UploadFileValue) => {
    setUploadValue(value);
  }, []);

  const updateChiTiet = (field: string, value: string | number) => {
    setSach((prev) => ({
      ...prev,
      thongTinChiTiet: {
        ...prev.thongTinChiTiet,
        [field]: value,
      },
    }));
  };

  const handleTheLoaiChange = (maTheLoai: number, checked: boolean) => {
    setSach((prev) => ({
      ...prev,
      maTheLoaiList: checked
        ? [...(prev.maTheLoaiList || []), maTheLoai]
        : (prev.maTheLoaiList || []).filter((item) => item !== maTheLoai),
    }));
  };

  const imagesChanged = useMemo(() => {
    if (uploadValue.newFiles.length > 0) {
      return true;
    }
    if (uploadValue.existingUrls.length !== existingImageUrls.length) {
      return true;
    }
    return uploadValue.existingUrls.some((url, index) => url !== existingImageUrls[index]);
  }, [existingImageUrls, uploadValue]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (actionInFlight.current || mustReloadStock) {
      return;
    }

    actionInFlight.current = true;
    setIsSubmitting(true);

    try {
      const updatedSach = await updateSachAdmin({
        ...sach,
        listImageStr: uploadValue.existingUrls,
      });

      if (uploadValue.newFiles.length > 0) {
        await uploadHinhAnhSach(updatedSach.maSach, uploadValue.newFiles);
      }

      alert('Cập nhật sách thành công!');
      navigate('/quan-ly/danh-sach-sach');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Có lỗi xảy ra khi cập nhật sách';
      alert(errorMessage);
    } finally {
      actionInFlight.current = false;
      setIsSubmitting(false);
    }
  };

  const handleStockAdjustment = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (actionInFlight.current || mustReloadStock) {
      return;
    }

    setStockDeltaError('');
    setStockDeltaSuccess('');

    const validation = validateStockDelta(stockDelta);
    if (!validation.isValid) {
      setStockDeltaError(validation.message);
      return;
    }
    if (!Number.isSafeInteger(sach.maSach) || sach.maSach <= 0) {
      setStockDeltaError('Không xác định được sách cần điều chỉnh tồn kho.');
      return;
    }

    actionInFlight.current = true;
    setIsAdjustingStock(true);

    try {
      const response = await dieuChinhTonKhoSach(sach.maSach, {
        soLuongThayDoi: validation.value,
      });
      setSach((prev) => ({ ...prev, soLuong: response.soLuongTon }));
      setStockDelta('');
      setStockDeltaSuccess(`Điều chỉnh tồn kho thành công. Tồn hiện tại: ${response.soLuongTon}.`);
    } catch (error) {
      if (error instanceof ApiRequestError) {
        setStockDeltaError(error.message);
      } else {
        setMustReloadStock(true);
        setStockDeltaError(
          'Không xác định được yêu cầu đã được áp dụng hay chưa. Hãy tải lại tồn kho trước khi thử lại.',
        );
      }
    } finally {
      actionInFlight.current = false;
      setIsAdjustingStock(false);
    }
  };

  const handleReloadStock = async () => {
    if (actionInFlight.current || !Number.isSafeInteger(sach.maSach) || sach.maSach <= 0) {
      return;
    }

    actionInFlight.current = true;
    setIsAdjustingStock(true);
    setStockDeltaError('');
    setStockDeltaSuccess('');
    try {
      const refreshedSach = await getBookById(sach.maSach);
      if (!refreshedSach || !Number.isInteger(refreshedSach.soLuong) || (refreshedSach.soLuong ?? -1) < 0) {
        throw new Error('Phản hồi tồn kho từ máy chủ không hợp lệ.');
      }
      setSach((prev) => ({ ...prev, soLuong: refreshedSach.soLuong }));
      setMustReloadStock(false);
      setStockDeltaSuccess(`Đã tải lại tồn kho. Tồn hiện tại: ${refreshedSach.soLuong}.`);
    } catch {
      setStockDeltaError('Không thể tải lại tồn kho. Vui lòng kiểm tra kết nối và thử lại.');
    } finally {
      actionInFlight.current = false;
      setIsAdjustingStock(false);
    }
  };

  return (
    <div className="container-fluid px-4">
      <h1 className="mt-4">Cập nhật sách</h1>
      <ol className="breadcrumb mb-4">
        <li className="breadcrumb-item"><a href="/quan-ly">Cập nhật sách</a></li>
        <li className="breadcrumb-item active">Cập nhật sách</li>
      </ol>

      <div className="card mb-4">
        <div className="card-header">
          <i className="fas fa-boxes me-1"></i>
          Điều chỉnh tồn kho
        </div>
        <div className="card-body">
          <form onSubmit={handleStockAdjustment} noValidate>
            <div className="row align-items-end">
              <div className="col-md-4 mb-3">
                <label className="form-label" htmlFor="current-stock">Tồn hiện tại</label>
                <input
                  id="current-stock"
                  className="form-control"
                  type="number"
                  value={sach.soLuong ?? 0}
                  readOnly
                  aria-readonly="true"
                />
              </div>
              <div className="col-md-5 mb-3">
                <label className="form-label" htmlFor="stock-delta">Số lượng thay đổi</label>
                <input
                  id="stock-delta"
                  className={`form-control${stockDeltaError ? ' is-invalid' : ''}`}
                  type="text"
                  value={stockDelta}
                  onChange={(event) => {
                    setStockDelta(event.target.value);
                    setStockDeltaError('');
                    setStockDeltaSuccess('');
                  }}
                  aria-describedby="stock-delta-help stock-delta-feedback"
                  aria-invalid={Boolean(stockDeltaError)}
                  disabled={isAdjustingStock || isSubmitting || mustReloadStock}
                  placeholder="Ví dụ: 5 hoặc -3"
                />
                <div id="stock-delta-help" className="form-text">
                  Nhập số dương để thêm tồn, số âm để giảm tồn.
                </div>
              </div>
              <div className="col-md-3 mb-3">
                <button
                  type="submit"
                  className="btn btn-primary w-100"
                  disabled={isAdjustingStock || isSubmitting || mustReloadStock || !stockDelta.trim()}
                >
                  {isAdjustingStock ? 'Đang điều chỉnh...' : 'Điều chỉnh tồn kho'}
                </button>
              </div>
            </div>
            <div id="stock-delta-feedback" aria-live="polite">
              {stockDeltaError && (
                <div className="alert alert-danger mb-0" role="alert">{stockDeltaError}</div>
              )}
              {stockDeltaSuccess && (
                <div className="alert alert-success mb-0" role="status">{stockDeltaSuccess}</div>
              )}
              {mustReloadStock && (
                <button
                  type="button"
                  className="btn btn-warning mt-3"
                  onClick={handleReloadStock}
                  disabled={isAdjustingStock || isSubmitting}
                >
                  {isAdjustingStock ? 'Đang tải lại...' : 'Tải lại tồn kho'}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      <div className="card mb-4">
        <div className="card-header">
          <i className="fas fa-book me-1"></i>
          Cập nhật
        </div>
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="row">
              <div className="col-md-6">
                <div className="mb-3">
                  <label className="form-label">Tên sách</label>
                  <input className="form-control" type="text" value={sach.tenSach} onChange={(e) => setSach({ ...sach, tenSach: e.target.value })} required />
                </div>
                <div className="mb-3">
                  <label className="form-label">Giá bán</label>
                  <input className="form-control" type="number" value={sach.giaBan} onChange={(e) => setSach({ ...sach, giaBan: parseFloat(e.target.value) || 0 })} required />
                </div>
                <div className="mb-3">
                  <label className="form-label">Giá niêm yết</label>
                  <input className="form-control" type="number" value={sach.giaNiemYet} onChange={(e) => setSach({ ...sach, giaNiemYet: parseFloat(e.target.value) || 0 })} required />
                </div>
                <div className="mb-3">
                  <label className="form-label">Mô tả ngắn</label>
                  <textarea className="form-control" rows={3} value={sach.moTaNgan || ''} onChange={(e) => setSach({ ...sach, moTaNgan: e.target.value })} />
                </div>
              </div>
              <div className="col-md-6">
                <div className="mb-3">
                  <label className="form-label">Tên tác giả</label>
                  <input className="form-control" type="text" value={sach.tenTacGia} onChange={(e) => setSach({ ...sach, tenTacGia: e.target.value })} required />
                </div>
                <div className="mb-3">
                  <label className="form-label">ISBN</label>
                  <input className="form-control" type="text" value={sach.isbn} onChange={(e) => setSach({ ...sach, isbn: e.target.value })} required />
                </div>
                <div className="mb-3">
                  <label className="form-label">Slug</label>
                  <input className="form-control" type="text" value={sach.slug || ''} onChange={(e) => setSach({ ...sach, slug: e.target.value })} />
                </div>
                <div className="mb-3">
                  <label className="form-label">Upload ảnh</label>
                  <UploadFile onChange={handleUploadChange} existingImageUrls={existingImageUrls} />
                </div>
              </div>
              <div className="col-md-12 mb-3">
                <label className="form-label">Thể loại</label>
                <div className="row">
                  {danhSachTheLoai.map((theLoai) => (
                    <div key={theLoai.maTheLoai} className="col-md-4 mb-2">
                      <label className="form-check-label d-flex align-items-center gap-2">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          checked={(sach.maTheLoaiList || []).includes(theLoai.maTheLoai)}
                          onChange={(e) => handleTheLoaiChange(theLoai.maTheLoai, e.target.checked)}
                        />
                        <span>{theLoai.tenTheLoai}</span>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              <div className="col-md-12 mb-3">
                <label className="form-label">Mô tả chi tiết</label>
                <textarea className="form-control" rows={6} value={sach.moTaChiTiet || sach.moTa || ''} onChange={(e) => setSach({ ...sach, moTaChiTiet: e.target.value, moTa: e.target.value })} required />
              </div>
            </div>

            <hr />
            <h5 className="mb-3">Thông tin chi tiết sách</h5>
            <div className="row">
              <div className="col-md-4 mb-3">
                <label className="form-label">Công ty phát hành</label>
                <input className="form-control" type="text" value={sach.thongTinChiTiet?.congTyPhatHanh || ''} onChange={(e) => updateChiTiet('congTyPhatHanh', e.target.value)} />
              </div>
              <div className="col-md-4 mb-3">
                <label className="form-label">Nhà xuất bản</label>
                <input className="form-control" type="text" value={sach.thongTinChiTiet?.nhaXuatBan || ''} onChange={(e) => updateChiTiet('nhaXuatBan', e.target.value)} />
              </div>
              <div className="col-md-4 mb-3">
                <label className="form-label">Ngày xuất bản</label>
                <input className="form-control" type="date" value={sach.thongTinChiTiet?.ngayXuatBan || ''} onChange={(e) => updateChiTiet('ngayXuatBan', e.target.value)} />
              </div>
              <div className="col-md-3 mb-3">
                <label className="form-label">Số trang</label>
                <input className="form-control" type="number" value={sach.thongTinChiTiet?.soTrang || 0} onChange={(e) => updateChiTiet('soTrang', parseInt(e.target.value, 10) || 0)} />
              </div>
              <div className="col-md-3 mb-3">
                <label className="form-label">Loại bìa</label>
                <input className="form-control" type="text" value={sach.thongTinChiTiet?.loaiBia || ''} onChange={(e) => updateChiTiet('loaiBia', e.target.value)} />
              </div>
              <div className="col-md-3 mb-3">
                <label className="form-label">Ngôn ngữ</label>
                <input className="form-control" type="text" value={sach.thongTinChiTiet?.ngonNgu || ''} onChange={(e) => updateChiTiet('ngonNgu', e.target.value)} />
              </div>
              <div className="col-md-3 mb-3">
                <label className="form-label">Kích thước</label>
                <input className="form-control" type="text" value={sach.thongTinChiTiet?.kichThuoc || ''} onChange={(e) => updateChiTiet('kichThuoc', e.target.value)} />
              </div>
            </div>

            <div className="text-center mt-3">
              <button type="submit" className="btn btn-primary me-2" disabled={isSubmitting || isAdjustingStock || mustReloadStock}>
                <i className="fas fa-save me-2"></i>
                {isSubmitting ? 'Đang cập nhật...' : 'Lưu sách'}
              </button>
              <button type="reset" className="btn btn-secondary" disabled={isSubmitting || isAdjustingStock || mustReloadStock} onClick={() => {
                setUploadValue({ existingUrls: existingImageUrls, newFiles: [] });
              }}>
                <i className="fas fa-undo me-2"></i>
                Làm mới ảnh
              </button>
            </div>
            {imagesChanged && !isSubmitting && (
              <p className="text-muted mt-3 mb-0">Thay đổi ảnh sẽ được áp dụng khi bạn lưu sách.</p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default CapNhatSach;
