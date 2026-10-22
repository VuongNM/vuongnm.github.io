---
layout: post
title: I wrote Read My PDF to read my pdf
excerpt: Because, first, I can, and second, it would be lovely for something like that to exist.

---

I like reading books, and a lot of the ones I want aren't available as audiobooks. As a lazy bastard, I'd rather have someone read them to me. And after a long while of working with dirt, I had a hankering for some technical voyage. So I built [Read My PDF](https://github.com/VuongNM/readmybook): you give it a PDF, and it reads it out loud.

I'd hoped someone else would build this, but it seems times aren't great for cool people doing cool projects [ughhhg](https://discourse.mozilla.org/t/future-of-deepspeech-stt-after-recent-changes-at-mozilla/66191). So I wrote one for my own use.

![Catalog page](https://github.com/VuongNM/readmypdf/assets/5158823/6b5a7dae-b63d-42c4-a91b-2a73f83b7a1c)
<center><em>The catalog page, where your books live.</em></center>

## How it's built

- **Flask** for the backend. I've always loved it, and it's my go-to for web apps and APIs.
- **Tailwind CSS** for the front end. Working with CSS has always been dreadful for me, but Tailwind is a breath of fresh air. Freaking love it!
- **[StyleTTS2](https://github.com/yl4579/StyleTTS2)** for the most important part, turning the text into speech. It's a very impressive text-to-speech engine that produces natural, nuanced speech. Those folks are doing incredible work. Awesome engineering.

## The feature I always wanted

I've always wanted to rewind by sentence instead of by "the last 10 seconds, whatever that was". That kind of feature only became possible now that text-to-speech is this good.

![Reading page](https://github.com/VuongNM/readmypdf/assets/5158823/d9e0181d-61af-4273-a532-1f5348395f88)
<center><em>The reading page.</em></center>

Watch the [demo video](https://www.youtube.com/watch?v=t47Qmd5ZecY).
