import React, { useState, useEffect } from 'react';
import SachModel from '../../../../models/SachModel';
import { Link, useNavigate } from 'react-router-dom';
import { PhanTrang } from '../../../utils/PhanTrang';
import {getAllBook, xoaSach,findAll} from "../../../../api/SachApi";

export default function DanhSachSach() {
  const [danhSachSach, setDanhSachSach] = useState<SachModel[]>([]);
  const [dangTaiDuLieu, setDangTaiDuLieu] = useState(true);
  const [baoLoi, setBaoLoi] = useState<string | null>(null);
  const [trangHienTai, setTrangHienTai] = useState(1);
  const [tongSoTrang, setTongSoTrang] = useState(0);
  const [showModal, setShowModal] = useState(0);
  const [userInfo, setUserInfo] = useState<any>(null);
  const navigate = useNavigate();

  const [jwt, setJwt] = useState(localStorage.getItem('jwt') || '');

  useEffect(() => {
    if (jwt) {
      const decodedJwt = JSON.parse(atob(jwt.split('.')[1]));
      setUserInfo(decodedJwt);
    }
    findAll(trangHienTai - 1)
      .then((kq) => {
        console.log(kq)
        setDanhSachSach(kq.ketQua);
        setTongSoTrang(kq.tongSoTrang);
        setDangTaiDuLieu(false);
      })
      .catch((error) => {
        setBaoLoi(error.message);
        setDangTaiDuLieu(false);
      });
  }, [trangHienTai]);

  const phanTrang = (trang: number) => setTrangHienTai(trang);

  const handleEdit = (maSach: number) => {
    try {
      navigate(`/quan-ly/cap-nhat-sach/${maSach}`);
    } catch (error) {
      setBaoLoi('Có lỗi khi chuyển đến trang cập nhật');
    }
  };

  const handleAdd = () => {
    try {
      navigate(`/quan-ly/them-sach`);
    } catch (error) {
      setBaoLoi('Có lỗi khi chuyển đến trang cập nhật');
    }
  };

  const handleDelete = async (maSach: number) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa cuốn sách này?')) {
      try {
        await xoaSach(maSach);
        alert('Xóa sách thành công!');
        
        // Tải lại dữ liệu sau khi xóa
        const kq = await findAll(trangHienTai - 1);
        setDanhSachSach(kq.ketQua);
        setTongSoTrang(kq.tongSoTrang);
      } catch (error) {
        alert('Có lỗi xảy ra khi xóa sách!');
        console.error('Lỗi xóa sách:', error);
      }
    }
  };

  const handleClose = ()=>{

  }

  if (dangTaiDuLieu) {
    return <div>Đang tải dữ liệu...</div>;
  }

  if (baoLoi) {
    return <div>Có lỗi xảy ra: {baoLoi}</div>;
  }

  return (
    <div className="container-fluid px-4">
      <h1 className="mt-4">Quản lý sách</h1>
      <ol className="breadcrumb mb-4">
        <li className="breadcrumb-item"><Link to="/quan-ly">Dashboard</Link></li>
        <li className="breadcrumb-item active">Danh sách sách</li>
      </ol>
      <div className="mb-4">
        {userInfo.isAdmin ? <button
            className="btn btn-primary btn-sm me-2"
            onClick={() => handleAdd()}
        >
          Thêm mới <i className="fas fa-add"></i>
        </button>:""}
        
      </div>
      <div className="card mb-4">
        <div className="card-header">
          <i className="fas fa-table me-1"></i>
          Danh sách sách
        </div>
        <div className="card-body">
          <table className="table table-striped">
            <thead>
              <tr>
                <th>Mã sách</th>
                <th>Tên sách</th>
                <th>Trạng thái</th>
                <th>Tác giả</th>
                <th>Giá bán</th>
                <th>Số lượng</th>
                <th>Hình ảnh</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {danhSachSach.map((sach) => (
                <tr key={sach.maSach}>
                  <td>{sach.maSach}</td>
                  <td>{sach.tenSach}</td>
                  <td>{sach.isActive === 1 ? <p className='btn  btn-sm me-2 btn-success'>Mở bán</p>:<p className='btn  btn-sm me-2 btn-danger'>Đóng</p>}</td>
                  <td>{sach.tenTacGia}</td>
                  <td>{(sach.giaBan ?? 0).toLocaleString('vi-VN')} đ</td>
                  <td>{sach.soLuong}</td>
                  <td>
                    <img width={100} height={100} src={sach.danhSachAnh?.at(0)?.urlHinh} alt="My Image" />
                  </td>
                  <td>
                    {userInfo.isAdmin?<button 
                      className="btn btn-primary btn-sm me-2"
                      onClick={() => handleEdit(sach.maSach)}
                    >
                      <i className="fas fa-edit"></i>
                    </button>:""
                    }
                    {userInfo.isAdmin?<button 
                      className="btn btn-danger btn-sm"
                      onClick={() => handleDelete(sach.maSach)}
                    >
                      <i className="fas fa-trash"></i>
                    </button>:""
                    }
                    <div></div>
                    {sach.isActive ?
                        <button
                            className="btn btn-warning btn-sm me-2"
                            onClick={() => {
                              if (window.confirm('Bạn có đóng bán sách này?')) {
                                try {
                                   fetch("http://localhost:8080/api/admin/sach/unactive/"+sach.maSach, {
                                    method: "POST",
                                    headers: {
                                        "Authorization": `Bearer ${localStorage.getItem('jwt')}`,
                                        'Content-Type': 'application/json' 
                                    },
                                })
                                    .then( (response) => {
                                        if(response.status=== 401){
                                          alert("Đăng nhập để đánh giá");
                                          return;
                                        }
                                        findAll(trangHienTai - 1)
                                        .then((kq) => {
                                          console.log(kq)
                                          setDanhSachSach(kq.ketQua);
                                          setTongSoTrang(kq.tongSoTrang);
                                          setDangTaiDuLieu(false);
                                        })
                                        .catch((error) => {
                                          setBaoLoi(error.message);
                                          setDangTaiDuLieu(false);
                                        });
                                    })
                                    .catch((error) => {
                                      
                                        
                                    }); 
                                } catch (error) {
                                  alert('Có lỗi xảy ra khi xóa sách!');
                                  console.error('Lỗi xóa sách:', error);
                                }
                              }
                            }}
                        >
                          <i className="fas fa-lock"></i>
                        </button>
                        :
                        <button
                            className="btn btn-success btn-sm me-2"
                            onClick={() => {
                              if (window.confirm('Bạn có muốn mở sách này?')) {
                                try {
                                    fetch("http://localhost:8080/api/admin/sach/active/"+sach.maSach, {
                                      method: "POST",
                                      headers: {
                                          "Authorization": `Bearer ${localStorage.getItem('jwt')}`,
                                          'Content-Type': 'application/json' 
                                      },
                                    })
                                    .then( (response) => {
                                      findAll(trangHienTai - 1)
                                      .then((kq) => {
                                        console.log(kq)
                                        setDanhSachSach(kq.ketQua);
                                        setTongSoTrang(kq.tongSoTrang);
                                        setDangTaiDuLieu(false);
                                      })
                                      .catch((error) => {
                                        setBaoLoi(error.message);
                                        setDangTaiDuLieu(false);
                                      });
                                    })
                                    .catch((error) => {
                                        console.error("Lỗi:", error);
                                        
                                    });
                                } catch (error) {
                                  alert('Có lỗi xảy ra khi xóa sách!');
                                  console.error('Lỗi xóa sách:', error);
                                }
                              }
                            }}
                        >
                          <i className="fas fa-lock"></i>
                        </button>
                        
                        }
                    
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <PhanTrang 
        trangHienTai={trangHienTai}
        tongSoTrang={tongSoTrang}
        phanTrang={phanTrang}
      />

      
    </div>
  );
}

export {}; 