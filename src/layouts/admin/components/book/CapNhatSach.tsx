import React, {useEffect, useState} from 'react';
import {useNavigate, useParams} from 'react-router-dom';
import {capNhatSach, getBookById} from '../../../../api/SachApi';
import SachModel from '../../../../models/SachModel';
import UploadFile from "../UploadFile";
import {findImageByBook} from "../../../../api/HinhAnhApi";
import HinhAnhModel from "../../../../models/HinhAnhModel";
import {da} from "date-fns/locale";


const CapNhatSach: React.FC = () => {
    const {maSach} = useParams<{ maSach: string }>();
    const navigate = useNavigate();
    const [sach, setSach] = useState<SachModel>({
        maSach: 0,
        tenSach: "",
        giaBan: 0,
        giaNiemYet: 0,
        moTa: "",
        soLuong: 0,
        tenTacGia: "",
        isbn: "",
        trungBinhXepHang: 0,
        listImageStr:[]
    });

    const [imageList, setImageList] = useState<[]>([]);


    // @ts-ignore
    useEffect( () => {
        if (maSach) {
             findImageByBook(parseInt(maSach)).then( (data) => {
                 if (data) {
                     const urlHinhs = data.map((item: any) => item.urlHinh);
                      setImageList(urlHinhs);
                 }
             }).catch((error) => {
                console.error('Error:', error);

            });

             getBookById(parseInt(maSach))
                .then((sachData) => {
                    if (sachData) {
                        console.log(sachData)
                        setSach(sachData);
                    }
                })
                .catch((error) => {
                    console.error('Error:', error);
                    alert('Không thể lấy thông tin sách!');
                });

        }
    }, [maSach]);



    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        sach.listImageStr = fileBase64;
        const ketQua = await capNhatSach(sach);
        if (ketQua) {
            alert('Cập nhật sách thành công!');
            navigate('/quan-ly/danh-sach-sach');
        } else {
            alert('Có lỗi xảy ra khi cập nhật sách!');
        }
    };
    const [fileBase64, setFileBase64] = useState([]);
    // @ts-ignore
    const handleBase64Change = (base64) => {
        setFileBase64(base64);  // Lưu base64 vào state của component cha
    };

    return (
        <div className="container-fluid px-4">
            <h1 className="mt-4">Cập nhật sách</h1>
            <ol className="breadcrumb mb-4">
                <li className="breadcrumb-item"><a href="/quan-ly">Dashboard</a></li>
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
                                    <label htmlFor="tenSach" className="form-label">Tên sách</label>
                                    <input
                                        className="form-control"
                                        type="text"
                                        value={sach.tenSach}
                                        onChange={(e) => setSach({...sach, tenSach: e.target.value})}
                                        required
                                    />
                                </div>
                                <div className="mb-3">
                                    <label htmlFor="giaBan" className="form-label">Giá bán</label>
                                    <input
                                        className="form-control"
                                        type="number"
                                        value={sach.giaBan}
                                        onChange={(e) => setSach({...sach, giaBan: parseFloat(e.target.value)})}
                                        required
                                    />
                                </div>
                                <div className="mb-3">
                                    <label htmlFor="giaNiemYet" className="form-label">Giá niêm yết</label>
                                    <input
                                        className="form-control"
                                        type="number"
                                        value={sach.giaNiemYet}
                                        onChange={(e) => setSach({...sach, giaNiemYet: parseFloat(e.target.value)})}
                                        required
                                    />
                                </div>
                                <div className="mb-3">
                                    <label htmlFor="soLuong" className="form-label">Số lượng</label>
                                    <input
                                        className="form-control"
                                        type="number"
                                        value={sach.soLuong}
                                        onChange={(e) => setSach({...sach, soLuong: parseInt(e.target.value)})}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="col-md-6">
                                <div className="mb-3">
                                    <label htmlFor="tenTacGia" className="form-label">Tên tác giả</label>
                                    <input
                                        className="form-control"
                                        type="text"
                                        value={sach.tenTacGia}
                                        onChange={(e) => setSach({...sach, tenTacGia: e.target.value})}
                                        required
                                    />
                                </div>
                                <div className="mb-3">
                                    <label htmlFor="isbn" className="form-label">ISBN</label>
                                    <input
                                        className="form-control"
                                        type="text"
                                        value={sach.isbn}
                                        onChange={(e) => setSach({...sach, isbn: e.target.value})}
                                        required
                                    />
                                </div>

                                <div className="mb-3">

                                    <label htmlFor="isbn" className="form-label">Upload ảnh</label>
                                    <UploadFile onBase64Change={handleBase64Change}
                                                existingBase64={imageList}></UploadFile>
                                </div>
                            </div>
                            <div className="col-md-12">
                                <label htmlFor="moTa" className="form-label">Mô tả</label>
                                <textarea
                                    className="form-control"
                                    rows={3}
                                    value={sach.moTa}
                                    onChange={(e) => setSach({...sach, moTa: e.target.value})}
                                    required
                                />
                            </div>
                        </div>
                        <div className="text-center mt-3">
                            <button type="submit" className="btn btn-primary me-2">
                                <i className="fas fa-save me-2"></i>
                                Lưu sách
                            </button>
                            <button type="reset" className="btn btn-secondary">
                                <i className="fas fa-undo me-2"></i>
                                Lưu
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default CapNhatSach;