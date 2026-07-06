---
layout: post
title: Read My PDF — turn any PDF into an audiobook
excerpt: A little Flask app that reads my books out loud, now up on GitHub.

---

I love audiobooks, but the selection is always a little thin — half the things I actually want to read only exist as PDFs. So I built [Read My PDF](https://github.com/VuongNM/readmypdf): point it at a PDF and it reads the thing out loud to you.

![Catalog page](https://github.com/VuongNM/readmypdf/assets/5158823/6b5a7dae-b63d-42c4-a91b-2a73f83b7a1c)

## What's under the hood

- **Flask** for the backend — my ol' reliable for web apps and APIs.
- **Tailwind CSS** on the front end. CSS usually fills me with dread; Tailwind turned out to be a fresh breeze.
- **espeak-ng** + **phonemizer** doing the text-to-speech.

## The good bits

The reading page is an infinite scroll of the text — click the speaker button on any sentence and it reads from there. The feature I always wanted: rewind by *sentence*, not by "the last 10 seconds". Modern TTS finally makes that feel natural.

![Reading page](https://github.com/VuongNM/readmypdf/assets/5158823/d9e0181d-61af-4273-a532-1f5348395f88)

## Try it

- Code → [github.com/VuongNM/readmypdf](https://github.com/VuongNM/readmypdf)
- Demo video → [youtube.com/watch?v=t47Qmd5ZecY](https://www.youtube.com/watch?v=t47Qmd5ZecY)

Install `espeak-ng` (use MacPorts if you're on an M1 — Homebrew installs it for the wrong architecture), `pip install -r ./requirement.txt`, then `flask --app app.py --debug run`. Still early days — next up is cleanup and documentation.
