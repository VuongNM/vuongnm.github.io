---
layout: post
title: Vì sao mình làm Spark
lang: vi
date: 2026-10-22 12:45:00 +0700
excerpt: Một app gõ tiếng Việt bằng giọng nói, hiểu được cả những từ tiếng Anh mà dân code hay dùng.
---

![Spark: giữ fn, nói tiếng Việt, thả ra là có chữ](/images/spark-cover.jpg)

Mình vừa làm xong [Spark](/spark/), một app gõ bằng giọng nói cho Mac. Giữ phím fn, nói tiếng Việt, thả ra là chữ được dán vào chỗ con trỏ, trong Cursor, VS Code, Terminal hay Slack đều được.

Lúc làm việc mình hay nói nửa Việt nửa Anh, kiểu "report toàn bộ bằng tiếng Việt". Bộ nhận giọng tiếng Việt nghe những câu như vậy khá tệ, "report" ra "lừa đảo", "deploy" ra "đi phôi". Mình thích cách Wispr Flow dọn chữ, nên tự làm một cái cho tiếng Việt, tập trung vào kiểu nói của dân code.

Phần nhận giọng chạy ngay trên máy. Mình dùng Zipformer tiếng Việt qua sherpa-onnx, 5 giây nói đọc xong trong khoảng 0,1 giây trên CPU của con M1. Song song có thêm một mô hình tiếng Anh nhỏ (Moonshine) để bắt các từ như commit, merge, database.

![Lịch sử trong Spark: những câu đã được viết lại](/images/spark-history.jpg)

Sau đó một mô hình ngôn ngữ viết lại thành câu hoàn chỉnh. Bạn có thể dùng Gemma 4 chạy luôn trên máy (tải thêm 3,1 GB, không cần mạng), hoặc Claude nếu có khoá, chính xác hơn và mất khoảng một giây. Spark so câu viết lại với lời gốc, nếu mô hình tự thêm ý hay đổi con số thì kết quả đó bị bỏ.

![Chọn cách dọn chữ: Claude, Gemma trên máy, hoặc cơ bản](/images/spark-cleanup.jpg)

Spark cũng làm được vài việc nhỏ khá tiện. Nói "ba giờ" thì ra "3 giờ", liệt kê vài việc thì ra danh sách gạch đầu dòng, còn nói "index chấm ts" trong Cursor thì ra index.ts. Gemma đôi khi vẫn sai khi tiếng Anh phát âm quá Việt, Claude thì ổn hơn.

![Spark với giao diện tối](/images/spark-dark.jpg)

App viết bằng Electron, React và TypeScript, mã nguồn để trên [GitHub](https://github.com/VuongNM/spark). Hiện Spark chạy trên Mac chip Apple, bản Windows có rồi nhưng chưa được thử kỹ.

Cài bằng lệnh này trong Terminal:

```bash
curl -fsSL https://vuongnm.github.io/spark/install.sh | bash
```

Hướng dẫn đầy đủ ở [trang Spark](/spark/).
