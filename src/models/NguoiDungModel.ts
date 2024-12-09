class NguoiDungModel {
    maNguoiDung: number;
    hoDem?: string;
    ten?: string;
    tenDangNhap: string;
    matKhau?: string;
    gioiTinh: string;
    email: string;
    soDienThoai: string;
    diaChiMuaHang?: string;
    diaChiGiaoHang: string;
    daKichHoat: boolean;
    maKichHoat?: string;
    ngaySinh?: Date;
    avatar?: string;
    danhSachQuyen?: number[];
    
    constructor(
        maNguoiDung: number,
        tenDangNhap: string,
        gioiTinh: string,
        email: string,
        soDienThoai: string,
        diaChiGiaoHang: string,
        daKichHoat: boolean,
        hoDem?: string,
        ten?: string,
        matKhau?: string,
        diaChiMuaHang?: string,
        maKichHoat?: string,
        ngaySinh?: Date,
        avatar?: string,
        danhSachQuyen?: number[]
    ) {
        this.maNguoiDung = maNguoiDung;
        this.hoDem = hoDem;
        this.ten = ten;
        this.tenDangNhap = tenDangNhap;
        this.matKhau = matKhau;
        this.gioiTinh = gioiTinh;
        this.email = email;
        this.soDienThoai = soDienThoai;
        this.diaChiMuaHang = diaChiMuaHang;
        this.diaChiGiaoHang = diaChiGiaoHang;
        this.daKichHoat = daKichHoat;
        this.maKichHoat = maKichHoat;
        this.ngaySinh = ngaySinh;
        this.avatar = avatar;
        this.danhSachQuyen = danhSachQuyen;
    }
}

export default NguoiDungModel;