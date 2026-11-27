
/* =====================================================
   fanmei.
   Main JavaScript
===================================================== */

document.addEventListener("DOMContentLoaded", async () => {
  "use strict";

  // -----------------------------------------------------
  // 01. AUTOMATIC CHAPTER DISCOVERY
  // -----------------------------------------------------

  // GitHub automatically tells fanmei which chapters exist.
  // You only need to upload files named chapter-01.txt,
  // chapter-02.txt, chapter-03.txt, and so on.

  const GITHUB_CHAPTERS_API =
    "https://api.github.com/repos/sivren4951/fanmei/contents/chapters?ref=main";

  const chapters = {};

  const STORAGE = {
    bookmark: "fanmei-bookmark",
    lastChapter: "fanmei-last-chapter",
    fontSize: "fanmei-font-size"
  };

  // -----------------------------------------------------
  // 02. ELEMENTS
  // -----------------------------------------------------

  const $ = (selector, parent = document) =>
    parent.querySelector(selector);

  const $$ = (selector, parent = document) =>
    [...parent.querySelectorAll(selector)];

  const pages = $$(".page[data-page]");
  const readerContent = $("#chapter-content");
  const chapterTitle = $("#chapter-title");

  const previousButton = $("#previous-chapter");
  const nextButton = $("#next-chapter");
  const bookmarkButton = $("#bookmark-button");

  const chapterSection = $(".chapter-section");

  let currentChapter = 1;
  let chapterIsLoading = false;

  // -----------------------------------------------------
  // 03. AUTOMATIC CHAPTER LIST
  // -----------------------------------------------------

  function renderChapterList() {
    if (!chapterSection) return;

    const headingCount = $(".section-heading span", chapterSection);

    const oldRows = $$(".chapter-row", chapterSection);
    oldRows.forEach(row => row.remove());

    const chapterNumbers = Object.keys(chapters)
      .map(Number)
      .sort((a, b) => a - b);

    if (headingCount) {
      headingCount.textContent =
        `${String(chapterNumbers.length).padStart(2, "0")} chapters`;
    }

    chapterNumbers.forEach(number => {
      const link = document.createElement("a");

      link.className = "chapter-row";
      link.href = "#reader";
      link.dataset.chapter = String(number);

      const chapterNumber = document.createElement("span");
      chapterNumber.className = "chapter-number";
      chapterNumber.textContent = String(number).padStart(2, "0");

      const chapterName = document.createElement("span");
      chapterName.textContent = chapters[number].title;

      const arrow = document.createElement("span");
      arrow.className = "chapter-arrow";
      arrow.textContent = "→";

      link.append(chapterNumber, chapterName, arrow);
      chapterSection.appendChild(link);
    });
  }

  async function loadChapterList() {
    const response = await fetch(GITHUB_CHAPTERS_API, {
      headers: {
        Accept: "application/vnd.github+json"
      }
    });

    if (!response.ok) {
      throw new Error("Couldn't retrieve the chapter list from GitHub.");
    }

    const files = await response.json();

    const chapterFiles = files
      .filter(file => {
        return file.type === "file" &&
          /^chapter-(\d+)\.txt$/i.test(file.name);
      })
      .map(file => {
        const match = file.name.match(/^chapter-(\d+)\.txt$/i);

        return {
          number: Number(match[1]),
          file: `chapters/${file.name}`
        };
      })
      .sort((a, b) => a.number - b.number);

    if (!chapterFiles.length) {
      throw new Error("No chapter files were found.");
    }

    // Build the chapter list automatically.
    chapterFiles.forEach(chapter => {
      chapters[chapter.number] = {
        title: `Chapter ${chapter.number}`,
        file: chapter.file
      };
    });

    renderChapterList();
    updateChapterNavigation();

    console.info(
      `fanmei — found ${chapterFiles.length} chapters.`
    );
  }

  // -----------------------------------------------------
  // 04. PAGE NAVIGATION
  // -----------------------------------------------------

  function showPage(pageName) {
    const validPage = pages.some(
      page => page.dataset.page === pageName
    );

    if (!validPage) pageName = "home";

    pages.forEach(page => {
      const active = page.dataset.page === pageName;

      page.hidden = !active;
      page.classList.toggle("active", active);
    });

    window.scrollTo({
      top: 0,
      behavior: "instant"
    });
  }

  function navigateTo(pageName) {
    if (location.hash === `#${pageName}`) {
      showPage(pageName);
    } else {
      location.hash = pageName;
    }
  }

  function handleNavigation() {
    const pageName = location.hash.slice(1) || "home";

    if (["about", "archive"].includes(pageName)) {
      showPage("home");

      requestAnimationFrame(() => {
        document.getElementById(pageName)?.scrollIntoView();
      });

      return;
    }

    showPage(pageName);
  }

  window.addEventListener("hashchange", handleNavigation);

  $$('a[href^="#"]').forEach(link => {
    link.addEventListener("click", event => {
      const destination = link.getAttribute("href").slice(1);

      if (["about", "archive"].includes(destination)) {
        event.preventDefault();

        if (location.hash !== "#home") {
          history.replaceState(null, "", "#home");
        }

        showPage("home");

        requestAnimationFrame(() => {
          document.getElementById(destination)?.scrollIntoView({
            behavior: "smooth"
          });
        });

        return;
      }

      if (pages.some(page => page.dataset.page === destination)) {
        event.preventDefault();
        navigateTo(destination);
      }
    });
  });

  handleNavigation();

  // -----------------------------------------------------
  // 05. CHAPTER TEXT AND CLICKABLE NOTES
  // -----------------------------------------------------

  function renderChapterText(text) {
    if (!readerContent) return;

    readerContent.replaceChildren();

    const paragraphs = text
      .replace(/\r\n/g, "\n")
      .trim()
      .split(/\n\s*\n/)
      .filter(paragraph => paragraph.trim());

    if (!paragraphs.length) {
      readerContent.textContent = "This chapter is empty.";
      return;
    }

    paragraphs.forEach(paragraph => {
      const p = document.createElement("p");

      // Notes use this format:
      // [[Chinese phrase|casual explanation]]

      const pattern = /\[\[([^|\]]+)\|([^\]]+)\]\]/g;
      let lastIndex = 0;
      let match;

      while ((match = pattern.exec(paragraph)) !== null) {
        p.appendChild(
          document.createTextNode(
            paragraph.slice(lastIndex, match.index)
          )
        );

        const note = document.createElement("button");
        note.type = "button";
        note.className = "translation-note";
        note.textContent = match[1].trim();
        note.dataset.note = match[2].trim();

        note.setAttribute(
          "aria-label",
          `${match[1].trim()}: ${match[2].trim()}`
        );

        p.appendChild(note);
        lastIndex = pattern.lastIndex;
      }

      p.appendChild(
        document.createTextNode(paragraph.slice(lastIndex))
      );

      readerContent.appendChild(p);
    });
  }

  // -----------------------------------------------------
  // 06. CLICKABLE NOTE POPUPS
  // -----------------------------------------------------

  const noteStyles = document.createElement("style");

  noteStyles.textContent = `
    .translation-note {
      display: inline;
      padding: 0;
      border: 0;
      border-bottom: 1px dotted #9b8975;
      background: transparent;
      color: inherit;
      font: inherit;
      cursor: pointer;
    }

    .translation-note:hover {
      color: #806c58;
    }

    .translation-note-popup {
      display: block;
      margin: 9px 0;
      padding: 12px 15px;
      border: 1px solid #ded4c5;
      border-radius: 4px;
      background: #f1ebdf;
      color: #554b40;
      font-size: 0.88em;
      line-height: 1.6;
    }
  `;

  document.head.appendChild(noteStyles);

  document.addEventListener("click", event => {
    const clickedNote = event.target.closest(".translation-note");

    $$(".translation-note-popup").forEach(popup => {
      if (!clickedNote || popup.previousElementSibling !== clickedNote) {
        popup.remove();
      }
    });

    if (!clickedNote) return;

    const existing = clickedNote.nextElementSibling;

    if (existing?.classList.contains("translation-note-popup")) {
      existing.remove();
      return;
    }

    const popup = document.createElement("span");
    popup.className = "translation-note-popup";
    popup.textContent = clickedNote.dataset.note;

    clickedNote.insertAdjacentElement("afterend", popup);
  });

  // -----------------------------------------------------
  // 07. LOAD A CHAPTER
  // -----------------------------------------------------

  async function openChapter(number) {
    number = Number(number);

    const chapter = chapters[number];

    if (!chapter || chapterIsLoading || !readerContent) return;

    chapterIsLoading = true;
    currentChapter = number;

    readerContent.replaceChildren();

    const loading = document.createElement("p");
    loading.className = "loading-message";
    loading.textContent = "Loading chapter...";

    readerContent.appendChild(loading);

    if (chapterTitle) {
      chapterTitle.textContent = chapter.title;
    }

    navigateTo("reader");

    try {
      const response = await fetch(chapter.file);

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }

      const text = await response.text();

      renderChapterText(text);

      localStorage.setItem(
        STORAGE.lastChapter,
        String(number)
      );

      updateBookmark();
      updateChapterNavigation();

    } catch (error) {
      console.error("fanmei chapter loading error:", error);

      readerContent.replaceChildren();

      const message = document.createElement("p");
      message.className = "loading-message";
      message.textContent =
        "Couldn't load this chapter. Please check that its file exists and has the correct filename.";

      readerContent.appendChild(message);

    } finally {
      chapterIsLoading = false;
    }
  }

  // Automatically handle clicks on every generated chapter link.
  document.addEventListener("click", event => {
    const link = event.target.closest("[data-chapter]");

    if (!link) return;

    event.preventDefault();
    openChapter(link.dataset.chapter);
  });

  // -----------------------------------------------------
  // 08. PREVIOUS / NEXT
  // -----------------------------------------------------

  function updateChapterNavigation() {
    const available = Object.keys(chapters)
      .map(Number)
      .sort((a, b) => a - b);

    const index = available.indexOf(currentChapter);

    const previous = available[index - 1];
    const next = available[index + 1];

    if (previousButton) {
      previousButton.disabled = !previous;
      previousButton.onclick = () => {
        if (previous) openChapter(previous);
      };
    }

    if (nextButton) {
      nextButton.disabled = !next;
      nextButton.onclick = () => {
        if (next) openChapter(next);
      };
    }
  }

  // -----------------------------------------------------
  // 09. FONT SIZE
  // -----------------------------------------------------

  let fontSize = Number(localStorage.getItem(STORAGE.fontSize)) || 18;

  const fontDisplay = $("#font-size-value");
  const decreaseFont = $("#decrease-font");
  const increaseFont = $("#increase-font");

  function applyFontSize() {
    if (readerContent) {
      readerContent.style.fontSize = `${fontSize}px`;
    }

    if (fontDisplay) {
      fontDisplay.textContent = `${fontSize}px`;
    }

    localStorage.setItem(STORAGE.fontSize, String(fontSize));
  }

  decreaseFont?.addEventListener("click", () => {
    fontSize = Math.max(12, fontSize - 1);
    applyFontSize();
  });

  increaseFont?.addEventListener("click", () => {
    fontSize = Math.min(32, fontSize + 1);
    applyFontSize();
  });

  applyFontSize();

  // -----------------------------------------------------
  // 10. BOOKMARK
  // -----------------------------------------------------

  function updateBookmark() {
    if (!bookmarkButton) return;

    const saved = localStorage.getItem(STORAGE.bookmark);

    const isBookmarked = saved === String(currentChapter);

    bookmarkButton.textContent = isBookmarked
      ? "★ Bookmarked"
      : "☆ Bookmark";

    bookmarkButton.setAttribute(
      "aria-pressed",
      String(isBookmarked)
    );
  }

  bookmarkButton?.addEventListener("click", () => {
    const saved = localStorage.getItem(STORAGE.bookmark);

    if (saved === String(currentChapter)) {
      localStorage.removeItem(STORAGE.bookmark);
    } else {
      localStorage.setItem(
        STORAGE.bookmark,
        String(currentChapter)
      );
    }

    updateBookmark();
  });

  // -----------------------------------------------------
  // 11. START FANMEI
  // -----------------------------------------------------

  try {
    await loadChapterList();

    const savedChapter = Number(
      localStorage.getItem(STORAGE.lastChapter)
    );

    if (savedChapter && chapters[savedChapter]) {
      currentChapter = savedChapter;
    }

    updateBookmark();

  } catch (error) {
    console.error("fanmei chapter list error:", error);

    if (chapterSection) {
      const message = document.createElement("p");
      message.className = "loading-message";
      message.textContent =
        "The chapter list couldn't load. Please refresh the page.";

      chapterSection.appendChild(message);
    }
  }

  console.info("fanmei — reader ready.");
});
