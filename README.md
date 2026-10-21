# Learning Only for YouTube

A browser extension that hides recommended YouTube videos unless they're in an educational category. No setup, no lists to fill in. Install it and the home page and the sidebar next to a video only show stuff to learn from.

Made for [this Hacker News comment](https://news.ycombinator.com/item?id=50170724): "I wish there was a way I could get educational-only youtube as an adult."

## How it decides

Every YouTube video has a category that the uploader picks: Music, Gaming, Education and so on. The extension looks it up for each recommended video and keeps only:

- Education
- Science & Technology
- Howto & Style

Everything else gets hidden, music included. The extension doesn't guess anything itself, it goes by what's on YouTube.

The catch is that uploaders don't always pick the right category. In my test next to a 3Blue1Brown video, "Every Programming Language Explained in 16 Minutes" was filed under People & Blogs and got hidden, while a money-motivation video was filed under Education and stayed. So it's a strong filter, not a perfect one.

## Where it works

- the home page
- the sidebar and the recommendations on a video page

Search results, channel pages and your subscriptions are left alone, since those are things you asked for.

A small counter in the bottom left corner shows how many videos were shown and hidden. Click it to dismiss.

## Install

Not in the stores yet, so for now you load it by hand. First download this repo (Code → Download ZIP) and unzip it.

**Chrome, Edge, Brave**
1. Open `chrome://extensions`.
2. Turn on "Developer mode" in the top right corner.
3. Click "Load unpacked" and pick the unzipped folder.

**Firefox**
1. Open `about:debugging#/runtime/this-firefox`.
2. Click "Load Temporary Add-on…" and pick `manifest.json`.

Firefox drops temporary add-ons on restart, so you'll need to load it again after that.

## Privacy

To find a category, the extension asks youtube.com about each video, the same way the YouTube page itself does. Nothing goes to any other server. Categories are cached in your browser so each video is looked up only once.

## If something breaks

YouTube changes its page layout from time to time. If recommendations stop being filtered, please [open an issue](https://github.com/vovanka0-netizen/learning-only-youtube/issues).
