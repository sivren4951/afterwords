
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
  // 03. PAGE NAVIGATION
  // -----------------------------------------------------

  const pages = $$(".page[data-page]");
  const navLinks = $$("[data-nav]");

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


  // Internal page links

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


  window.addEventListener("hashchange", navigateToHash);

  navigateToHash();


  // -----------------------------------------------------
  // 04. MOBILE NAVIGATION
  // -----------------------------------------------------

  const menuButton = $("#menu-toggle");
  const navigation = $("#site-navigation");

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
  // 05. ARCHIVE SEARCH
  // -----------------------------------------------------

  const archiveSearch = $("#archive-search");
  const archiveEntries = $$(".archive-entry");

  if (archiveSearch) {
    archiveSearch.addEventListener("input", () => {
      const query = archiveSearch.value
        .toLowerCase()
        .trim();

      archiveEntries.forEach(entry => {
        const searchableText = entry.textContent.toLowerCase();

        entry.hidden = !searchableText.includes(query);
      });
    });
  }


  // -----------------------------------------------------
  // 06. CHAPTER READER
  // -----------------------------------------------------

  const readerContent = $("#chapter-content");
  const chapterTitle = $("#chapter-title");
  const chapterNumber = $("#chapter-number");

  const previousButton = $("#previous-chapter");
  const nextButton = $("#next-chapter");
  const bookmarkButton = $("#bookmark-button");

  let currentChapter = 1;
  let chapterIsLoading = false;


  function getAvailableChapters() {
    return Object.keys(chapters)
      .map(Number)
      .sort((a, b) => a - b);
  }


  // Render paragraphs and clickable translation notes

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
          document.createTextNode(paragraph.slice(lastIndex, match.index))
        );

        const note = document.createElement("button");
        note.type = "button";
        note.className = "translation-note";
        note.textContent = match[1];
        note.dataset.note = match[2];

        element.appendChild(note);
        lastIndex = pattern.lastIndex;
      }

      element.appendChild(
        document.createTextNode(paragraph.slice(lastIndex))
      );

      readerContent.appendChild(element);
    });
  }

  // Open and close translation notes

  readerContent.addEventListener("click", event => {
    const note = event.target.closest(".translation-note");

    if (!note) {
      document.querySelectorAll(".translation-note.active")
        .forEach(item => item.classList.remove("active"));
      return;
    }

    document.querySelectorAll(".translation-note.active")
      .forEach(item => {
        if (item !== note) item.classList.remove("active");
      });

    note.classList.toggle("active");
  });

   async function openChapter(number) {
    number = Number(number);

    const chapter = chapters[number];

    if (!chapter || chapterIsLoading || !readerContent) {
      return;
    }

    chapterIsLoading = true;
    currentChapter = number;

    readerContent.innerHTML = "";

    const loadingMessage = document.createElement("p");

    loadingMessage.className = "reader-message";
    loadingMessage.textContent = "Opening the file…";

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
        "The chapter couldn't be opened. Please check that the chapter file exists in your chapters folder and that you're viewing the website through GitHub Pages.";

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
  // 07. PREVIOUS / NEXT CHAPTER
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


  updateChapterNavigation();


  // -----------------------------------------------------
  // 08. FONT SIZE
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
  // 09. READING THEMES
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
  // 10. BOOKMARKS
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
  // 11. READING PROGRESS
  // -----------------------------------------------------

  const progressBar = $("#reading-progress");

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
  // 12. STORY READING HISTORY
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


  updateStoryProgress();


  // -----------------------------------------------------
  // 13. BACK TO TOP
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
  // 14. FOOTER YEAR
  // -----------------------------------------------------

  const currentYear = $("#current-year");

  if (currentYear) {
    currentYear.textContent =
      new Date().getFullYear();
  }


  // -----------------------------------------------------
  // 15. RESTORE LAST CHAPTER
  // -----------------------------------------------------

  const savedChapter = Number(
    localStorage.getItem(STORAGE.lastChapter)
  );

  if (savedChapter && chapters[savedChapter]) {
    currentChapter = savedChapter;
    updateBookmark();
    updateChapterNavigation();
  }


  // -----------------------------------------------------
  // 16. CLICKABLE TRANSLATION NOTES
  // -----------------------------------------------------

 
  // -----------------------------------------------------
  // 17. READY
  // -----------------------------------------------------

  console.info("fanmei. — the archive is ready.");

});
