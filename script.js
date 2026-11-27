
/* =====================================================
   fanmei.
   Main JavaScript
===================================================== */

document.addEventListener("DOMContentLoaded", () => {
  "use strict";

  // -----------------------------------------------------
  // 01. CONFIGURATION
  // -----------------------------------------------------

  const chapters = {
    1: {
      title: "Chapter 1",
      file: "chapters/chapter-01.txt"
    }

    // Add future chapters like this:
    // 2: {
    //   title: "Chapter 2",
    //   file: "chapters/chapter-02.txt"
    // },
  };

  const STORAGE = {
    bookmark: "marginalia-bookmark",
    lastChapter: "marginalia-last-chapter",
    fontSize: "marginalia-font-size",
    theme: "marginalia-reading-theme",
    progress: "marginalia-reading-progress"
  };

  // -----------------------------------------------------
  // 02. HELPERS
  // -----------------------------------------------------

  const $ = (selector, parent = document) =>
    parent.querySelector(selector);

  const $$ = (selector, parent = document) =>
    [...parent.querySelectorAll(selector)];

  function getStoredNumber(key, fallback) {
    const value = Number(localStorage.getItem(key));

    return Number.isFinite(value) && value > 0
      ? value
      : fallback;
  }

  // -----------------------------------------------------
  // 03. ELEMENTS
  // -----------------------------------------------------

  const pages = $$(".page[data-page]");
  const navLinks = $$("[data-nav]");

  const menuButton = $("#menu-toggle");
  const navigation = $("#site-navigation");

  const readerContent = $("#chapter-content");
  const chapterTitle = $("#chapter-title");
  const chapterNumber = $("#chapter-number");

  const previousButton = $("#previous-chapter");
  const nextButton = $("#next-chapter");
  const bookmarkButton = $("#bookmark-button");

  const progressBar = $("#reading-progress");

  let currentChapter = 1;
  let chapterIsLoading = false;

  // -----------------------------------------------------
  // 04. MOBILE NAVIGATION
  // -----------------------------------------------------

  function closeMenu() {
    if (!menuButton || !navigation) return;

    navigation.classList.remove("open");
    menuButton.classList.remove("open");

    menuButton.setAttribute("aria-expanded", "false");
  }

  if (menuButton && navigation) {
    menuButton.setAttribute("aria-expanded", "false");

    menuButton.addEventListener("click", () => {
      const isOpen = navigation.classList.toggle("open");

      menuButton.classList.toggle("open", isOpen);
      menuButton.setAttribute("aria-expanded", String(isOpen));
    });

    navigation.querySelectorAll("a").forEach(link => {
      link.addEventListener("click", closeMenu);
    });
  }

  document.addEventListener("click", event => {
    if (
      navigation &&
      menuButton &&
      !navigation.contains(event.target) &&
      !menuButton.contains(event.target)
    ) {
      closeMenu();
    }
  });

  // -----------------------------------------------------
  // 05. READING PROGRESS
  // -----------------------------------------------------

  function updateReadingProgress() {
    if (!progressBar) return;

    const totalHeight =
      document.documentElement.scrollHeight -
      window.innerHeight;

    const progress = totalHeight > 0
      ? (window.scrollY / totalHeight) * 100
      : 0;

    progressBar.style.width =
      `${Math.min(100, Math.max(0, progress))}%`;
  }

  window.addEventListener(
    "scroll",
    updateReadingProgress,
    { passive: true }
  );

  window.addEventListener(
    "resize",
    updateReadingProgress
  );

  // -----------------------------------------------------
  // 06. PAGE NAVIGATION
  // -----------------------------------------------------

  function showPage(pageName) {
    const pageExists = pages.some(
      page => page.dataset.page === pageName
    );

    if (!pageExists) {
      pageName = "home";
    }

    pages.forEach(page => {
      const isActive = page.dataset.page === pageName;

      page.classList.toggle("active", isActive);
      page.hidden = !isActive;
    });

    navLinks.forEach(link => {
      const isActive = link.dataset.nav === pageName;

      link.classList.toggle("active", isActive);

      if (isActive) {
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }
    });

    closeMenu();

    window.scrollTo({
      top: 0,
      behavior: "instant"
    });

    if (pageName === "reader") {
      requestAnimationFrame(updateReadingProgress);
    }
  }

  function navigateToHash() {
    const pageName = location.hash.slice(1) || "home";
    showPage(pageName);
  }

  function navigateTo(pageName) {
    if (location.hash === `#${pageName}`) {
      showPage(pageName);
    } else {
      location.hash = pageName;
    }
  }

  $$('a[href^="#"]').forEach(link => {
    link.addEventListener("click", event => {
      const destination = link.getAttribute("href");

      if (!destination || destination === "#") return;

      const pageName = destination.slice(1);

      if (pages.some(page => page.dataset.page === pageName)) {
        event.preventDefault();
        navigateTo(pageName);
      }
    });
  });

  // -----------------------------------------------------
  // 07. ARCHIVE SEARCH
  // -----------------------------------------------------

  const archiveSearch = $("#archive-search");
  const archiveEntries = $$(".archive-entry");

  if (archiveSearch) {
    archiveSearch.addEventListener("input", () => {
      const query = archiveSearch.value.toLowerCase().trim();

      archiveEntries.forEach(entry => {
        entry.hidden = !entry.textContent
          .toLowerCase()
          .includes(query);
      });
    });
  }

  // -----------------------------------------------------
  // 08. CHAPTER LIST
  // -----------------------------------------------------

  function getAvailableChapters() {
    return Object.keys(chapters)
      .map(Number)
      .sort((a, b) => a - b);
  }

  // -----------------------------------------------------
  // 09. CLICKABLE TRANSLATION NOTES
  // -----------------------------------------------------

  function renderChapterText(text) {
    if (!readerContent) return;

    readerContent.replaceChildren();

    const paragraphs = text
      .replace(/\r\n/g, "\n")
      .trim()
      .split(/\n\s*\n/)
      .filter(paragraph => paragraph.trim().length > 0);

    paragraphs.forEach(paragraph => {
      const element = document.createElement("p");

      const pattern = /\[\[([\s\S]*?)\|([\s\S]*?)\]\]/g;

      let lastIndex = 0;
      let match;

      while ((match = pattern.exec(paragraph)) !== null) {
        element.appendChild(
          document.createTextNode(
            paragraph.slice(lastIndex, match.index)
          )
        );

        const note = document.createElement("button");

        note.type = "button";
        note.className = "translation-note";
        note.textContent = match[1];
        note.dataset.note = match[2];
        note.setAttribute(
          "aria-label",
          `${match[1]} — click to read an explanation`
        );

        const popup = document.createElement("span");

        popup.className = "note-popup";
        popup.textContent = match[2];
        popup.setAttribute("role", "tooltip");

        note.appendChild(popup);
        element.appendChild(note);

        lastIndex = pattern.lastIndex;
      }

      element.appendChild(
        document.createTextNode(
          paragraph.slice(lastIndex)
        )
      );

      readerContent.appendChild(element);
    });
  }

  // Note appearance

  const noteStyle = document.createElement("style");

  noteStyle.textContent = `
    .translation-note {
      position: relative;
      display: inline;
      padding: 0;
      margin: 0;
      border: 0;
      border-bottom: 1px dotted #927e69;
      background: transparent;
      color: #927e69;
      font: inherit;
      cursor: pointer;
      text-align: inherit;
    }

    .translation-note:hover {
      color: #665747;
      border-bottom-style: solid;
    }

    .note-popup {
      display: none;
      position: absolute;
      left: 0;
      bottom: calc(100% + 10px);
      width: 250px;
      max-width: 75vw;
      padding: 12px 15px;
      background: #f5f0e7;
      color: #49443e;
      border: 1px solid #ded5c8;
      border-radius: 5px;
      font-family: sans-serif;
      font-size: 13px;
      font-weight: normal;
      line-height: 1.6;
      text-align: left;
      white-space: normal;
      z-index: 1000;
      box-shadow: 0 4px 14px rgba(0,0,0,0.08);
    }

    .translation-note.active .note-popup {
      display: block;
    }
  `;

  document.head.appendChild(noteStyle);

  // Open and close notes

  document.addEventListener("click", event => {
    if (!(event.target instanceof Element)) return;

    const note = event.target.closest(".translation-note");

    document.querySelectorAll(".translation-note.active").forEach(item => {
      if (item !== note) {
        item.classList.remove("active");
      }
    });

    if (note) {
      note.classList.toggle("active");
      event.stopPropagation();
    }
  });

  // -----------------------------------------------------
  // 10. STORY READING HISTORY
  // -----------------------------------------------------

  function updateStoryProgress() {
    const progressLabel = $("#story-reading-progress");

    if (!progressLabel) return;

    const lastChapter = Number(
      localStorage.getItem(STORAGE.lastChapter)
    );

    if (!lastChapter) {
      progressLabel.textContent = "Not started";
      return;
    }

    const total = getAvailableChapters().length;

    progressLabel.textContent =
      `Last opened: Chapter ${lastChapter} / ${total}`;
  }

  // -----------------------------------------------------
  // 11. BOOKMARKS
  // -----------------------------------------------------

  function updateBookmark() {
    if (!bookmarkButton) return;

    const savedChapter = Number(
      localStorage.getItem(STORAGE.bookmark)
    );

    const isBookmarked = savedChapter === currentChapter;

    bookmarkButton.textContent = isBookmarked
      ? "♥ BOOKMARKED"
      : "♡ BOOKMARK";

    bookmarkButton.classList.toggle(
      "bookmarked",
      isBookmarked
    );

    bookmarkButton.setAttribute(
      "aria-pressed",
      String(isBookmarked)
    );
  }

  if (bookmarkButton) {
    bookmarkButton.addEventListener("click", () => {
      const savedChapter = Number(
        localStorage.getItem(STORAGE.bookmark)
      );

      if (savedChapter === currentChapter) {
        localStorage.removeItem(STORAGE.bookmark);
      } else {
        localStorage.setItem(
          STORAGE.bookmark,
          String(currentChapter)
        );
      }

      updateBookmark();
    });
  }

  // -----------------------------------------------------
  // 12. PREVIOUS / NEXT CHAPTER
  // -----------------------------------------------------

  function updateChapterNavigation() {
    const available = getAvailableChapters();
    const currentIndex = available.indexOf(currentChapter);

    const previous = available[currentIndex - 1];
    const next = available[currentIndex + 1];

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

    const navigationLabel = $(".chapter-navigation span");

    if (navigationLabel) {
      navigationLabel.textContent =
        `${String(currentChapter).padStart(2, "0")} / ${String(available.length).padStart(2, "0")}`;
    }
  }

  // -----------------------------------------------------
  // 13. LOAD CHAPTER
  // -----------------------------------------------------

  async function openChapter(number) {
    number = Number(number);

    const chapter = chapters[number];

    if (!chapter || chapterIsLoading || !readerContent) {
      return;
    }

    chapterIsLoading = true;
    currentChapter = number;

    readerContent.replaceChildren();

    const loadingMessage = document.createElement("p");

    loadingMessage.className = "reader-message";
    loadingMessage.textContent = "Opening the chapter…";

    readerContent.appendChild(loadingMessage);

    if (chapterTitle) {
      chapterTitle.textContent = chapter.title;
    }

    if (chapterNumber) {
      chapterNumber.textContent =
        String(number).padStart(2, "0");
    }

    navigateTo("reader");

    try {
      const response = await fetch(chapter.file);

      if (!response.ok) {
        throw new Error(
          `Could not load chapter: ${response.status}`
        );
      }

      const text = await response.text();

      if (currentChapter !== number) return;

      renderChapterText(text);

      localStorage.setItem(
        STORAGE.lastChapter,
        String(number)
      );

      localStorage.setItem(
        STORAGE.progress,
        String(number)
      );

      updateChapterNavigation();
      updateBookmark();
      updateStoryProgress();

      window.scrollTo({
        top: 0,
        behavior: "smooth"
      });

      updateReadingProgress();

    } catch (error) {
      console.error("fanmei. chapter error:", error);

      readerContent.replaceChildren();

      const errorMessage = document.createElement("p");

      errorMessage.className = "reader-message";
      errorMessage.textContent =
        "The chapter couldn't be opened. Check that chapters/chapter-01.txt exists and that its filename matches the JavaScript.";

      readerContent.appendChild(errorMessage);

    } finally {
      chapterIsLoading = false;
    }
  }

  // Chapter index buttons

  $$("[data-chapter]").forEach(button => {
    button.addEventListener("click", () => {
      openChapter(button.dataset.chapter);
    });
  });

  // -----------------------------------------------------
  // 14. FONT SIZE
  // -----------------------------------------------------

  let fontSize = getStoredNumber(STORAGE.fontSize, 18);

  const fontDisplay = $("#font-size-value");

  function applyFontSize() {
    if (!readerContent) return;

    readerContent.style.fontSize = `${fontSize}px`;

    if (fontDisplay) {
      fontDisplay.textContent = `${fontSize}px`;
    }

    localStorage.setItem(
      STORAGE.fontSize,
      String(fontSize)
    );
  }

  const decreaseFont = $("#decrease-font");
  const increaseFont = $("#increase-font");

  if (decreaseFont) {
    decreaseFont.addEventListener("click", () => {
      fontSize = Math.max(12, fontSize - 1);
      applyFontSize();
    });
  }

  if (increaseFont) {
    increaseFont.addEventListener("click", () => {
      fontSize = Math.min(32, fontSize + 1);
      applyFontSize();
    });
  }

  applyFontSize();

  // -----------------------------------------------------
  // 15. READING THEMES
  // -----------------------------------------------------

  const themeButtons = $$("[data-reading-theme]");

  function applyTheme(theme) {
    const allowedThemes = ["dark", "light", "sepia"];

    if (!allowedThemes.includes(theme)) {
      theme = "dark";
    }

    document.documentElement.dataset.readingTheme = theme;

    document.body.classList.remove(
      "reading-dark",
      "reading-light",
      "reading-sepia"
    );

    document.body.classList.add(`reading-${theme}`);

    themeButtons.forEach(button => {
      const isActive = button.dataset.readingTheme === theme;

      button.classList.toggle("active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });

    localStorage.setItem(STORAGE.theme, theme);
  }

  themeButtons.forEach(button => {
    button.addEventListener("click", () => {
      applyTheme(button.dataset.readingTheme);
    });
  });

  applyTheme(
    localStorage.getItem(STORAGE.theme) || "dark"
  );

  // -----------------------------------------------------
  // 16. BACK TO TOP
  // -----------------------------------------------------

  const backToTop = $("#back-to-top");

  if (backToTop) {
    backToTop.addEventListener("click", () => {
      window.scrollTo({
        top: 0,
        behavior: "smooth"
      });
    });
  }

  // -----------------------------------------------------
  // 17. FOOTER YEAR
  // -----------------------------------------------------

  const currentYear = $("#current-year");

  if (currentYear) {
    currentYear.textContent =
      new Date().getFullYear();
  }

  // -----------------------------------------------------
  // 18. INITIALIZE THE WEBSITE
  // -----------------------------------------------------

  updateChapterNavigation();
  updateStoryProgress();

  // Restore the last saved chapter number

  const savedChapter = Number(
    localStorage.getItem(STORAGE.lastChapter)
  );

  if (savedChapter && chapters[savedChapter]) {
    currentChapter = savedChapter;
  }

  // Navigate only AFTER all variables and functions exist

  navigateToHash();

  // If someone opens #reader directly, load a chapter

  if (location.hash === "#reader") {
    openChapter(
      savedChapter && chapters[savedChapter]
        ? savedChapter
        : 1
    );
  }

  // If the visitor navigates to #reader later, load it too

  window.addEventListener("hashchange", () => {
    navigateToHash();

    if (
      location.hash === "#reader" &&
      readerContent &&
      readerContent.children.length === 0
    ) {
      const saved = Number(
        localStorage.getItem(STORAGE.lastChapter)
      );

      openChapter(
        saved && chapters[saved] ? saved : 1
      );
    }
  });

  console.info("fanmei. — the archive is ready.");
});
