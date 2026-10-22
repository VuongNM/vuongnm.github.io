---
layout: post
title: Vì sao mình làm Spark
lang: vi
date: 2026-10-22 13:00:00 +0700
excerpt: Nói "cơ mít", ra chữ commit. Mít để dành ăn.
---

![Spark: giữ fn, nói tiếng Việt, thả ra là có chữ](/images/spark-cover.jpg)

[Spark](/spark/) là app gõ bằng giọng nói cho dân code. Giữ phím fn, nói tiếng Việt, thả ra. Câu đã sửa nằm ngay chỗ con trỏ: Cursor, VS Code, Terminal, Slack.

Dân code Việt nói chuyện kiểu này: "deploy lên staging trước, test xong thì merge vào main". Nửa Việt nửa Anh. Bộ nhận giọng tiếng Việt nghe câu đó thành "đi phôi lên sờ tây riêng". Nghe cũng vui, nhưng không ai deploy được.

Mình thích cách Wispr Flow dọn chữ, nên làm một cái cho riêng mình, hiểu tiếng Việt kiểu dân code. Mất hai ngày.

Spark nghe bằng hai tai. Một mô hình tiếng Việt nhỏ chạy ngay trên máy, đọc 5 giây giọng nói trong khoảng 0,1 giây. Một mô hình tiếng Anh nhỏ nghe song song để bắt mấy từ như commit, review, database. Xong thì một mô hình ngôn ngữ viết lại thành câu: Gemma chạy trên máy, hoặc Claude nếu bạn có khoá.

Máy nghe "ri vi mô cốt", Spark viết "review code". Máy nghe "cơ mít", Spark viết commit. Mít để dành ăn.

![Lịch sử trong Spark: những câu đã được viết lại](/images/spark-history.jpg)

Nói "ba giờ" thì ra "3 giờ". Nói "gồm có" ba việc thì ra danh sách gạch đầu dòng. Nói "index chấm ts" thì ra index.ts. Nói lan man thì Spark gom lại cho gọn, nhưng không bịa thêm ý.

Âm thanh không rời máy. Chọn Gemma thì mất mạng vẫn chạy.

![Chọn cách dọn chữ: Claude, Gemma trên máy, hoặc cơ bản](/images/spark-cleanup.jpg)

Gemma thỉnh thoảng vẫn sai, nhất là khi bạn phát âm tiếng Anh rất Việt. Claude chuẩn hơn, mất khoảng một giây. Bạn chọn.

Có cả giao diện tối, cho ai code lúc 2 giờ sáng.

![Spark với giao diện tối](/images/spark-dark.jpg)

Spark miễn phí, mã nguồn mở. Hiện chạy trên Mac chip Apple. Bản Windows có rồi nhưng chưa thử kỹ.

Cài bằng một dòng trong Terminal:

```bash
curl -fsSL https://vuongnm.github.io/spark/install.sh | bash
```

Hướng dẫn đầy đủ ở [trang Spark](/spark/), mã nguồn trên [GitHub](https://github.com/VuongNM/spark).

Máy giờ nghe được tiếng Việt chen tiếng Anh. Còn hiểu sếp muốn gì thì chưa.
