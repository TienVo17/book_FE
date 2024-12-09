import NguoiDungModel from "../models/NguoiDungModel";
import {my_request} from "./Request";

var url = 'http://localhost:8080';
var endpoint = url + "/api/admin/user";

interface KetQuaInterface {
    ketQua: NguoiDungModel[];
    tongSoTrang: number;
    tongSoSach: number;
}

// @ts-ignore
export async function findAll(trangHienTai: number): Promise<KetQuaInterface> {
    // Xác định endpoint
    const ketQua: NguoiDungModel[] = [];

    //Gọi phương thức request
    const response = await my_request(endpoint+"?page="+trangHienTai);
    console.log(response);
    // Lấy ra json sách
    const responseData = response.content;

    // Lấy thông tin trang
    const tongSoTrang: number = response.totalPages;
    const tongSoSach: number = response.totalElements;

    for (const key in responseData) {
        ketQua.push({
            daKichHoat: false, diaChiGiaoHang: "",
            maNguoiDung: responseData[key].maNguoiDung,
            hoDem: responseData[key].hoDem,
            ten: responseData[key].ten,
            tenDangNhap: responseData[key].tenDangNhap,
            gioiTinh: responseData[key].gioiTinh,
            email: responseData[key].email,
            soDienThoai: responseData[key].soDienThoai,
            ngaySinh: responseData[key].ngaySinh,
        });
    }
    return {ketQua: ketQua, tongSoSach: tongSoSach, tongSoTrang: tongSoTrang};
}