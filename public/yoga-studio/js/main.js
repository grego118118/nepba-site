/* Birdsong Yoga — main.js
   Handles: nav scroll state, mobile menu, reveal animations,
   schedule rendering/tabs, newsletter + contact form submission. */

(() => {
  "use strict";

  /* ---------- NAV: scroll state ---------- */
  const nav = document.getElementById("nav");
  const onScroll = () => {
    if (!nav) return;
    nav.classList.toggle("is-scrolled", window.scrollY > 40);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- NAV: mobile menu ---------- */
  const toggle = document.getElementById("navToggle");
  const menu = document.getElementById("mobileMenu");
  if (toggle && menu) {
    toggle.addEventListener("click", () => {
      const open = toggle.classList.toggle("is-open");
      menu.classList.toggle("is-open", open);
      menu.hidden = !open;
      toggle.setAttribute("aria-expanded", String(open));
    });
    menu.querySelectorAll("a").forEach((a) => {
      a.addEventListener("click", () => {
        toggle.classList.remove("is-open");
        menu.classList.remove("is-open");
        menu.hidden = true;
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* ---------- REVEAL animations on scroll ---------- */
  const revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && revealEls.length) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-visible");
            io.unobserve(e.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.05 }
    );
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("is-visible"));
  }

  /* ---------- SCHEDULE ---------- */
  const SCHEDULE = {
    mon: [
      { time: "9:00 am", name: "Slow & Steady Vinyasa", level: "All levels", duration: "75 min" },
      { time: "12:15 pm", name: "Lunchtime Reset", level: "All levels", duration: "45 min" },
      { time: "5:45 pm", name: "Strong & Steady", level: "Level 2", duration: "60 min" },
      { time: "7:15 pm", name: "Yin & Sound", level: "All levels", duration: "75 min" }
    ],
    tue: [
      { time: "6:30 am", name: "Sunrise Birdsong Flow", level: "All levels", duration: "60 min" },
      { time: "9:30 am", name: "Beginners' Series", level: "New students", duration: "75 min" },
      { time: "5:45 pm", name: "Slow & Steady Vinyasa", level: "All levels", duration: "75 min" }
    ],
    wed: [
      { time: "7:00 am", name: "Morning Mobility", level: "All levels", duration: "45 min" },
      { time: "12:15 pm", name: "Lunchtime Reset", level: "All levels", duration: "45 min" },
      { time: "5:45 pm", name: "Strong & Steady", level: "Level 2", duration: "60 min" },
      { time: "7:15 pm", name: "Restorative", level: "All levels", duration: "75 min" }
    ],
    thu: [
      { time: "9:00 am", name: "Slow & Steady Vinyasa", level: "All levels", duration: "75 min" },
      { time: "5:45 pm", name: "Strong & Steady", level: "Level 2", duration: "60 min" },
      { time: "7:30 pm", name: "Candlelit Yin", level: "All levels", duration: "75 min" }
    ],
    fri: [
      { time: "7:00 am", name: "Friday Bird Walk (free)", level: "All ages", duration: "90 min" },
      { time: "9:30 am", name: "Slow & Steady Vinyasa", level: "All levels", duration: "75 min" },
      { time: "5:30 pm", name: "Wind-Down Flow", level: "All levels", duration: "60 min" }
    ],
    sat: [
      { time: "6:30 am", name: "Sunrise Birdsong Flow", level: "All levels", duration: "60 min" },
      { time: "8:30 am", name: "Outdoor Flow @ Arcadia*", level: "All levels", duration: "75 min" },
      { time: "10:30 am", name: "Slow & Steady Vinyasa", level: "All levels", duration: "75 min" }
    ],
    sun: [
      { time: "9:00 am", name: "Soft Sunday Flow", level: "All levels", duration: "75 min" },
      { time: "11:00 am", name: "Beginners' Series", level: "New students", duration: "75 min" },
      { time: "5:30 pm", name: "Restorative & Yin", level: "All levels", duration: "90 min" }
    ]
  };

  const tabs = document.querySelectorAll(".schedule__tab");
  const list = document.getElementById("scheduleList");

  const renderDay = (day) => {
    if (!list) return;
    const items = SCHEDULE[day] || [];
    list.innerHTML = items
      .map(
        (c) => `
        <div class="schedule__item">
          <div class="schedule__item-time">${c.time}</div>
          <div>
            <div class="schedule__item-title">${c.name}</div>
            <div class="schedule__item-meta">${c.duration} &middot; ${c.level}</div>
          </div>
          <div class="schedule__item-meta"></div>
          <a href="book.html?class=${encodeURIComponent(c.name)}" class="btn btn--ghost">Reserve</a>
        </div>`
      )
      .join("");
  };

  if (tabs.length && list) {
    // Default to today
    const dayKeys = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
    const today = dayKeys[new Date().getDay()];
    tabs.forEach((t) => t.classList.toggle("is-active", t.dataset.day === today));
    renderDay(today);

    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        tabs.forEach((t) => t.classList.remove("is-active"));
        tab.classList.add("is-active");
        renderDay(tab.dataset.day);
      });
    });
  }

  /* ---------- NEWSLETTER ---------- */
  const newsletter = document.getElementById("newsletterForm");
  const newsletterMsg = document.getElementById("newsletterMsg");
  if (newsletter) {
    newsletter.addEventListener("submit", (e) => {
      e.preventDefault();
      const email = newsletter.email.value.trim();
      if (!email || !/.+@.+\..+/.test(email)) {
        newsletterMsg.textContent = "Please enter a valid email.";
        return;
      }
      newsletterMsg.textContent = "Thank you. A note will arrive on Sunday.";
      newsletter.reset();
    });
  }

  /* ---------- CONTACT FORM ---------- */
  const contact = document.getElementById("contactForm");
  const contactMsg = document.getElementById("contactMsg");
  if (contact) {
    contact.addEventListener("submit", (e) => {
      e.preventDefault();
      const data = new FormData(contact);
      const name = (data.get("name") || "").toString().trim();
      const email = (data.get("email") || "").toString().trim();
      const message = (data.get("message") || "").toString().trim();
      if (!name || !email || !message) {
        contactMsg.textContent = "Please fill in name, email and message.";
        return;
      }
      contactMsg.textContent =
        "Thank you, " + name.split(" ")[0] + ". Maggie will be in touch within a day.";
      contact.reset();
    });
  }
})();
