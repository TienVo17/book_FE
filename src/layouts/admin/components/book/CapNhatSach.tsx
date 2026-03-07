import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getBookById } from '../../../../api/SachApi';
import { findImageByBook } from '../../../../api/HinhAnhApi';
import { updateSachAdmin, uploadHinhAnhSach } from '../../../../api/AdminApi';
import SachModel from '../../../../models/SachModel';
import UploadFile, { UploadFileValue } from '../UploadFile';

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
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>([]);
  const [uploadValue, setUploadValue] = useState<UploadFileValue>({ existingUrls: [], newFiles: [] });
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      setIsSubmitting(false);
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
                  <label className="form-label">Số lượng tồn</label>
                  <input className="form-control" type="number" value={sach.soLuong} onChange={(e) => setSach({ ...sach, soLuong: parseInt(e.target.value, 10) || 0 })} required />
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
              <button type="submit" className="btn btn-primary me-2" disabled={isSubmitting}>
                <i className="fas fa-save me-2"></i>
                {isSubmitting ? 'Đang cập nhật...' : 'Lưu sách'}
              </button>
              <button type="reset" className="btn btn-secondary" disabled={isSubmitting} onClick={() => {
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
