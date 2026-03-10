import React, { FormEvent, useCallback, useEffect, useState } from 'react';
import UploadFile, { UploadFileValue } from '../UploadFile';
import { useNavigate } from 'react-router-dom';
import { createSachAdmin, uploadHinhAnhSach } from '../../../../api/AdminApi';
import { getAdminTheLoai } from '../../../../api/TheLoaiApi';
import SachModel from '../../../../models/SachModel';
import { TheLoaiAdminModel } from '../../../../models/TheLoaiModel';

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

const SachForm: React.FC = () => {
  const [sach, setSach] = useState<SachModel>(emptySach);
  const [danhSachTheLoai, setDanhSachTheLoai] = useState<TheLoaiAdminModel[]>([]);
  const [uploadValue, setUploadValue] = useState<UploadFileValue>({ existingUrls: [], newFiles: [] });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    getAdminTheLoai().then(setDanhSachTheLoai).catch(console.error);
  }, []);

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

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const createdSach = await createSachAdmin({ ...sach, listImageStr: [] });
      if (uploadValue.newFiles.length > 0) {
        try {
          await uploadHinhAnhSach(createdSach.maSach, uploadValue.newFiles);
        } catch (uploadError) {
          const errorMessage = uploadError instanceof Error ? uploadError.message : 'Upload hình ảnh thất bại';
          alert(`Đã tạo sách thành công, nhưng upload hình ảnh thất bại. Bạn có thể cập nhật lại tại trang sửa sách.\n${errorMessage}`);
          navigate(`/quan-ly/cap-nhat-sach/${createdSach.maSach}`);
          return;
        }
      }

      alert('Đã thêm sách thành công!');
      setSach(emptySach);
      setUploadValue({ existingUrls: [], newFiles: [] });
      navigate('/quan-ly/danh-sach-sach');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Gặp lỗi trong quá trình thêm sách';
      alert(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container-fluid px-4">
      <h1 className="mt-4">Quản lý sách</h1>
      <ol className="breadcrumb mb-4">
        <li className="breadcrumb-item"><a href="/quan-ly">Sách</a></li>
        <li className="breadcrumb-item active">Thêm sách mới</li>
      </ol>
      <div className="card mb-4">
        <div className="card-header">
          <i className="fas fa-book me-1"></i>
          Thêm sách mới
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
                  <textarea className="form-control" rows={3} value={sach.moTaNgan} onChange={(e) => setSach({ ...sach, moTaNgan: e.target.value })} />
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
                  <UploadFile onChange={handleUploadChange} />
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
                <textarea className="form-control" rows={6} value={sach.moTaChiTiet} onChange={(e) => setSach({ ...sach, moTaChiTiet: e.target.value, moTa: e.target.value })} required />
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
                {isSubmitting ? 'Đang lưu...' : 'Lưu sách'}
              </button>
              <button type="reset" className="btn btn-secondary" disabled={isSubmitting} onClick={() => {
                setSach(emptySach);
                setUploadValue({ existingUrls: [], newFiles: [] });
              }}>
                <i className="fas fa-undo me-2"></i>
                Làm mới
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SachForm;
