import { THONG_TIN_CUA_HANG } from "../../config/thongTinCuaHang";

/**
 * Nội dung 8 trang chính sách mà footer trỏ tới.
 *
 * Nguyên tắc khi viết: chỉ mô tả những gì hệ thống THẬT SỰ làm — dữ liệu thật sự lưu, cổng
 * thanh toán thật sự tích hợp, các trạng thái đơn hàng thật sự tồn tại trong mã nguồn. Những
 * điều khoản là quyết định kinh doanh (số ngày đổi trả, phí vận chuyển, chiết khấu sỉ) được
 * ghi rõ là "đang cập nhật" kèm hotline, thay vì bịa ra một con số. Một chính sách bịa còn
 * tệ hơn không có chính sách: khách sẽ tin vào nó.
 *
 * CHỖ CẦN CHỦ CỬA HÀNG ĐIỀN: mọi đoạn có chuỗi "đang cập nhật".
 */

export interface MucChinhSach {
  tieuDe: string;
  doan: string[];
}

export interface TrangChinhSach {
  slug: string;
  tieuDe: string;
  moTa: string;
  muc: MucChinhSach[];
}

const LIEN_HE = `Mọi thắc mắc, vui lòng gọi ${THONG_TIN_CUA_HANG.hotline} hoặc gửi email tới ${THONG_TIN_CUA_HANG.email} trong giờ làm việc (${THONG_TIN_CUA_HANG.gioMoCua}).`;

export const DANH_SACH_CHINH_SACH: TrangChinhSach[] = [
  {
    slug: "dieu-khoan-su-dung",
    tieuDe: "Điều khoản sử dụng",
    moTa: "Các quy định khi bạn sử dụng website BookStore.",
    muc: [
      {
        tieuDe: "Phạm vi áp dụng",
        doan: [
          `Điều khoản này áp dụng cho toàn bộ nội dung và chức năng trên website ${THONG_TIN_CUA_HANG.ten}, bao gồm việc duyệt sách, tìm kiếm, đặt hàng, thanh toán và đánh giá sản phẩm.`,
          "Khi tiếp tục sử dụng website, bạn được xem là đã đọc và đồng ý với các điều khoản dưới đây.",
        ],
      },
      {
        tieuDe: "Tài khoản của bạn",
        doan: [
          "Bạn cần tạo tài khoản và kích hoạt qua email để đặt hàng. Bạn chịu trách nhiệm giữ bí mật mật khẩu của mình và mọi hoạt động phát sinh từ tài khoản đó.",
          "Nếu quên mật khẩu, bạn có thể đặt lại qua liên kết gửi tới email đã đăng ký. Chúng tôi không bao giờ hỏi mật khẩu của bạn qua điện thoại hay email.",
        ],
      },
      {
        tieuDe: "Đánh giá và nội dung do bạn đăng",
        doan: [
          "Chỉ khách đã nhận hàng mới đánh giá được sản phẩm đó, và mỗi khách đánh giá một lần cho mỗi cuốn sách. Bạn có thể sửa hoặc xoá đánh giá của mình.",
          "Chúng tôi có quyền ẩn đánh giá vi phạm pháp luật, xúc phạm người khác, chứa thông tin cá nhân của bên thứ ba hoặc mang tính quảng cáo. Đánh giá đã bị ẩn sẽ không hiển thị công khai và không thể đăng lại.",
          "Bạn giữ quyền đối với nội dung và hình ảnh mình đăng, đồng thời cho phép chúng tôi hiển thị chúng trên trang sản phẩm tương ứng.",
        ],
      },
      {
        tieuDe: "Giá và tình trạng hàng",
        doan: [
          "Giá bán và số lượng tồn hiển thị trên website có thể thay đổi. Đơn hàng chỉ được xác nhận khi hệ thống trừ kho thành công; nếu sách đã hết trong lúc bạn thanh toán, chúng tôi sẽ liên hệ để huỷ hoặc đổi sản phẩm.",
        ],
      },
      { tieuDe: "Liên hệ", doan: [LIEN_HE] },
    ],
  },
  {
    slug: "chinh-sach-bao-mat",
    tieuDe: "Chính sách bảo mật",
    moTa: "Chúng tôi thu thập dữ liệu gì, dùng để làm gì và bạn kiểm soát ra sao.",
    muc: [
      {
        tieuDe: "Dữ liệu chúng tôi thu thập",
        doan: [
          "Khi bạn tạo tài khoản: họ tên, tên đăng nhập, email, giới tính. Khi bạn đặt hàng: số điện thoại và địa chỉ giao hàng. Khi bạn đánh giá: nội dung nhận xét, số sao và hình ảnh bạn tự tải lên.",
          "Chúng tôi cũng lưu lịch sử đơn hàng của bạn để bạn tra cứu lại và để xác định bạn có đủ điều kiện đánh giá sản phẩm hay không.",
          "Nếu bạn đăng ký nhận tin, chúng tôi chỉ lưu địa chỉ email và thời điểm đăng ký.",
        ],
      },
      {
        tieuDe: "Chúng tôi không lưu gì",
        doan: [
          "Chúng tôi KHÔNG lưu số thẻ, mã CVV hay thông tin đăng nhập ngân hàng của bạn. Toàn bộ bước nhập thông tin thanh toán diễn ra trên hệ thống của cổng thanh toán VNPay.",
          "Mật khẩu của bạn được lưu dưới dạng đã băm, không lưu bản gốc, nên kể cả quản trị viên cũng không đọc được.",
        ],
      },
      {
        tieuDe: "Hiển thị công khai",
        doan: [
          "Trên trang sản phẩm, tên người đánh giá được che bớt trước khi hiển thị (ví dụ “Nguyễn V. A.”). Chúng tôi không hiển thị email, số điện thoại hay địa chỉ của bạn cho khách khác.",
        ],
      },
      {
        tieuDe: "Bên thứ ba",
        doan: [
          "Cổng thanh toán VNPay xử lý giao dịch thanh toán trực tuyến. Dịch vụ Cloudinary lưu trữ hình ảnh sản phẩm và hình ảnh bạn đính kèm trong đánh giá. Email kích hoạt tài khoản và đặt lại mật khẩu được gửi qua dịch vụ email của chúng tôi.",
          "Chúng tôi không bán hay trao đổi dữ liệu cá nhân của bạn cho bên thứ ba vì mục đích tiếp thị.",
        ],
      },
      {
        tieuDe: "Quyền của bạn",
        doan: [
          "Bạn có thể xem và cập nhật thông tin cá nhân trong mục Tài khoản, tự xoá đánh giá và hình ảnh mình đã đăng, và huỷ nhận tin bất cứ lúc nào bằng liên kết trong email nhận tin.",
          `Để yêu cầu xoá tài khoản và dữ liệu liên quan, vui lòng liên hệ ${THONG_TIN_CUA_HANG.email}.`,
        ],
      },
      { tieuDe: "Liên hệ", doan: [LIEN_HE] },
    ],
  },
  {
    slug: "bao-mat-thanh-toan",
    tieuDe: "Bảo mật thanh toán",
    moTa: "Cách chúng tôi xử lý giao dịch và vì sao thông tin thẻ không đi qua website này.",
    muc: [
      {
        tieuDe: "Phương thức thanh toán",
        doan: [
          "Website hỗ trợ thanh toán khi nhận hàng và thanh toán trực tuyến qua cổng VNPay.",
        ],
      },
      {
        tieuDe: "Thông tin thẻ không đi qua website của chúng tôi",
        doan: [
          "Khi chọn thanh toán trực tuyến, bạn được chuyển sang trang của VNPay để nhập thông tin. Website của chúng tôi không nhìn thấy và không lưu số thẻ, mã bảo mật hay mã OTP.",
          "Kết quả thanh toán VNPay trả về đều được máy chủ của chúng tôi kiểm tra lại chữ ký trước khi ghi nhận. Một đường dẫn trả về bị sửa nội dung sẽ không thể biến một đơn chưa trả tiền thành đơn đã thanh toán.",
        ],
      },
      {
        tieuDe: "Kết nối được mã hoá",
        doan: [
          "Toàn bộ website chạy trên HTTPS. Trình duyệt sẽ hiển thị biểu tượng ổ khoá — nếu không thấy, vui lòng dừng giao dịch và liên hệ chúng tôi.",
        ],
      },
      {
        tieuDe: "Nếu bạn nghi ngờ có giao dịch bất thường",
        doan: [
          `Hãy liên hệ ngân hàng phát hành thẻ ngay, sau đó báo cho chúng tôi theo số ${THONG_TIN_CUA_HANG.hotline} để đối chiếu đơn hàng.`,
        ],
      },
    ],
  },
  {
    slug: "he-thong-nha-sach",
    tieuDe: "Hệ thống nhà sách",
    moTa: "Địa chỉ và giờ mở cửa.",
    muc: [
      {
        tieuDe: "Cửa hàng",
        doan: [
          `${THONG_TIN_CUA_HANG.ten} — ${THONG_TIN_CUA_HANG.diaChi}.`,
          `Giờ mở cửa: ${THONG_TIN_CUA_HANG.gioMoCua}.`,
          `Điện thoại: ${THONG_TIN_CUA_HANG.hotline}. Email: ${THONG_TIN_CUA_HANG.email}.`,
        ],
      },
      {
        tieuDe: "Mua tại cửa hàng",
        doan: [
          "Bạn có thể tới trực tiếp để xem sách trước khi mua. Số lượng tồn hiển thị trên website là tồn kho chung, vui lòng gọi trước nếu cần chắc chắn còn hàng cho một đầu sách cụ thể.",
        ],
      },
    ],
  },
  {
    slug: "doi-tra-hoan-tien",
    tieuDe: "Đổi trả - Hoàn tiền",
    moTa: "Khi nào đổi trả được và các bước thực hiện.",
    muc: [
      {
        tieuDe: "Trường hợp được đổi trả",
        doan: [
          "Sách giao sai so với đơn đặt, sách bị lỗi in ấn (mất trang, mờ chữ, ngược trang), hoặc sách hư hỏng do quá trình vận chuyển.",
          "Vui lòng giữ nguyên tình trạng sách và hoá đơn, đồng thời chụp ảnh phần lỗi để chúng tôi xử lý nhanh hơn.",
        ],
      },
      {
        tieuDe: "Thời hạn và chi phí",
        doan: [
          "Thời hạn đổi trả và bên chịu chi phí vận chuyển hàng đổi trả: đang cập nhật. Trong lúc chờ công bố chính thức, vui lòng liên hệ hotline để được hướng dẫn theo từng trường hợp.",
        ],
      },
      {
        tieuDe: "Cách yêu cầu",
        doan: [
          `Gọi ${THONG_TIN_CUA_HANG.hotline} hoặc gửi email tới ${THONG_TIN_CUA_HANG.email}, kèm mã đơn hàng và ảnh sản phẩm. Bạn tra được mã đơn trong mục "Đơn hàng của tôi".`,
        ],
      },
      {
        tieuDe: "Hoàn tiền",
        doan: [
          "Với đơn thanh toán khi nhận hàng, chúng tôi hoàn tiền theo tài khoản bạn cung cấp. Với đơn thanh toán qua VNPay, tiền được hoàn về phương thức bạn đã dùng; thời gian ghi có phụ thuộc ngân hàng phát hành.",
          "Đơn hàng chưa giao có thể được huỷ trực tiếp trong mục “Đơn hàng của tôi”.",
        ],
      },
    ],
  },
  {
    slug: "bao-hanh-boi-hoan",
    tieuDe: "Bảo hành - Bồi hoàn",
    moTa: "Cam kết của chúng tôi về chất lượng sách.",
    muc: [
      {
        tieuDe: "Sách chính hãng",
        doan: [
          "Chúng tôi cam kết bán sách có nguồn gốc từ nhà xuất bản và đơn vị phát hành hợp pháp. Nếu bạn nhận được sách in lậu, chúng tôi đổi sách mới hoặc hoàn tiền đầy đủ.",
        ],
      },
      {
        tieuDe: "Giao thiếu, giao sai",
        doan: [
          "Nếu đơn hàng thiếu sản phẩm hoặc giao nhầm đầu sách, vui lòng báo cho chúng tôi kèm ảnh kiện hàng khi mở. Chúng tôi giao bổ sung hoặc thu hồi và giao lại đúng sách.",
        ],
      },
      {
        tieuDe: "Mức bồi hoàn",
        doan: [
          "Mức bồi hoàn cụ thể cho từng trường hợp: đang cập nhật. Vui lòng liên hệ hotline; chúng tôi xử lý theo từng tình huống cho tới khi chính sách chi tiết được công bố.",
        ],
      },
    ],
  },
  {
    slug: "chinh-sach-van-chuyen",
    tieuDe: "Chính sách vận chuyển",
    moTa: "Phạm vi giao hàng và cách theo dõi đơn.",
    muc: [
      {
        tieuDe: "Phạm vi giao hàng",
        doan: ["Chúng tôi giao hàng toàn quốc."],
      },
      {
        tieuDe: "Theo dõi đơn hàng",
        doan: [
          "Đơn của bạn đi qua các trạng thái: Chờ xử lý → Đang giao → Đã nhận hàng. Đơn bị huỷ sẽ hiển thị trạng thái Đã huỷ.",
          "Bạn xem trạng thái hiện tại trong mục “Đơn hàng của tôi”. Sau khi đơn chuyển sang Đã nhận hàng, bạn có thể đánh giá những cuốn sách trong đơn đó.",
        ],
      },
      {
        tieuDe: "Thời gian và phí vận chuyển",
        doan: [
          "Thời gian giao dự kiến theo khu vực và biểu phí vận chuyển: đang cập nhật. Phí áp dụng cho đơn hàng của bạn được hiển thị ở bước thanh toán trước khi bạn xác nhận đặt hàng.",
        ],
      },
      {
        tieuDe: "Kiểm tra khi nhận",
        doan: [
          "Bạn nên quay video lúc mở kiện hàng. Đây là bằng chứng hữu ích nhất nếu cần yêu cầu đổi trả do thiếu hàng hoặc hư hỏng khi vận chuyển.",
        ],
      },
    ],
  },
  {
    slug: "chinh-sach-khach-si",
    tieuDe: "Chính sách khách sỉ",
    moTa: "Dành cho trường học, thư viện, doanh nghiệp và đại lý.",
    muc: [
      {
        tieuDe: "Đối tượng",
        doan: [
          "Trường học, thư viện, doanh nghiệp mua sách số lượng lớn, và các đại lý bán lẻ.",
        ],
      },
      {
        tieuDe: "Mức chiết khấu và số lượng tối thiểu",
        doan: [
          "Mức chiết khấu theo số lượng và số lượng đặt tối thiểu: đang cập nhật. Website hiện chưa hỗ trợ đặt sỉ trực tuyến, nên mọi đơn sỉ được báo giá riêng.",
        ],
      },
      {
        tieuDe: "Cách liên hệ",
        doan: [
          `Gửi danh sách đầu sách và số lượng tới ${THONG_TIN_CUA_HANG.email}, hoặc gọi ${THONG_TIN_CUA_HANG.hotline}. Chúng tôi báo giá và thời gian cung ứng theo từng danh mục.`,
        ],
      },
    ],
  },
];

export function timChinhSach(slug: string | undefined): TrangChinhSach | undefined {
  return DANH_SACH_CHINH_SACH.find((trang) => trang.slug === slug);
}
