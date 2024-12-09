class HinhAnhModel {
  maHinhAnh: number;
  tenHinhAnh?: string;
  icon?: boolean;
  urlHinh?: string;
  dataImage?: string;
  constructor(
    maHinhAnh: number,
    tenHinhAnh: string,
    icon: boolean,
    urlHinh: string,
    dataImage: string
  ) {
    this.maHinhAnh = maHinhAnh;
    this.tenHinhAnh = tenHinhAnh;
    this.icon = icon;
    this.urlHinh = urlHinh;
    this.dataImage = dataImage;
  }
}

export default HinhAnhModel;
