/* Birdsong Yoga — book.js
   Handles plan/class selection, order summary, and Stripe checkout handoff.

   PAYMENT INTEGRATION
   -------------------
   This page is wired for Stripe Checkout. To go live:

   1. Create products + prices in your Stripe Dashboard for each PLAN below
      and paste the resulting price IDs into the `stripePriceId` fields.

   2. Stand up a tiny serverless endpoint at /api/create-checkout-session
      that creates a Stripe Checkout Session from the given price ID +
      customer email, then returns { url }. (Vercel/Netlify edge function
      examples in /yoga-studio/README.md.)

   3. Set STRIPE_LIVE = true below.

   Until then, the form simulates a successful booking so the demo is
   complete end-to-end. */

(() => {
  "use strict";

  const STRIPE_LIVE = false;
  const CHECKOUT_ENDPOINT = "/api/create-checkout-session";

  /* ---------- DATA ---------- */
  const PLANS = [
    {
      id: "intro",
      name: "First Class",
      priceLabel: "$15",
      price: 15,
      desc: "New students only · single class",
      requiresClass: true,
      stripePriceId: "price_REPLACE_ME_intro"
    },
    {
      id: "dropin",
      name: "Drop-In",
      priceLabel: "$22",
      price: 22,
      desc: "Any single class",
      requiresClass: true,
      stripePriceId: "price_REPLACE_ME_dropin"
    },
    {
      id: "pack10",
      name: "10-Class Pack",
      priceLabel: "$180",
      price: 180,
      desc: "Use within 6 months",
      requiresClass: false,
      stripePriceId: "price_REPLACE_ME_pack10"
    },
    {
      id: "flock",
      name: "Flock Membership",
      priceLabel: "$149/mo",
      price: 149,
      desc: "Unlimited classes · monthly",
      requiresClass: false,
      recurring: true,
      stripePriceId: "price_REPLACE_ME_flock"
    },
    {
      id: "outdoor",
      name: "Outdoor Flow @ Arcadia",
      priceLabel: "$25",
      price: 25,
      desc: "Includes sanctuary admission",
      requiresClass: false,
      stripePriceId: "price_REPLACE_ME_outdoor"
    },
    {
      id: "spring",
      name: "Spring Migration Retreat",
      priceLabel: "$685",
      price: 685,
      desc: "May 9–11 · all-inclusive",
      requiresClass: false,
      stripePriceId: "price_REPLACE_ME_spring"
    }
  ];

  const UPCOMING_CLASSES = [
    { id: "c1", when: "Tue · 6:30 am", date: "May 19", name: "Sunrise Birdsong Flow", tag: "All levels" },
    { id: "c2", when: "Tue · 5:45 pm", date: "May 19", name: "Slow & Steady Vinyasa", tag: "All levels" },
    { id: "c3", when: "Wed · 7:15 pm", date: "May 20", name: "Restorative", tag: "All levels" },
    { id: "c4", when: "Thu · 9:00 am", date: "May 21", name: "Slow & Steady Vinyasa", tag: "All levels" },
    { id: "c5", when: "Thu · 7:30 pm", date: "May 21", name: "Candlelit Yin", tag: "All levels" },
    { id: "c6", when: "Fri · 5:30 pm", date: "May 22", name: "Wind-Down Flow", tag: "All levels" },
    { id: "c7", when: "Sat · 6:30 am", date: "May 23", name: "Sunrise Birdsong Flow", tag: "All levels" },
    { id: "c8", when: "Sat · 8:30 am", date: "May 23", name: "Outdoor Flow @ Arcadia", tag: "Outdoor" },
    { id: "c9", when: "Sun · 5:30 pm", date: "May 24", name: "Restorative & Yin", tag: "All levels" }
  ];

  /* ---------- STATE ---------- */
  const state = {
    planId: null,
    classId: null
  };

  /* ---------- DOM ---------- */
  const planList = document.getElementById("planList");
  const classStep = document.getElementById("classStep");
  const classList = document.getElementById("classList");
  const detailsStepNum = document.getElementById("detailsStepNum");
  const summaryItem = document.getElementById("summaryItem");
  const summaryPrice = document.getElementById("summaryPrice");
  const summaryClassRow = document.getElementById("summaryClassRow");
  const summaryClass = document.getElementById("summaryClass");
  const summaryTotal = document.getElementById("summaryTotal");
  const checkoutBtn = document.getElementById("checkoutBtn");
  const form = document.getElementById("bookForm");

  /* ---------- RENDER ---------- */
  const renderPlans = () => {
    planList.innerHTML = PLANS.map(
      (p) => `
        <button type="button" class="book__plan" data-plan="${p.id}">
          <span class="book__plan-name">${p.name}</span>
          <span class="book__plan-price">${p.priceLabel}</span>
          <span class="book__plan-desc">${p.desc}</span>
        </button>`
    ).join("");

    planList.querySelectorAll(".book__plan").forEach((btn) => {
      btn.addEventListener("click", () => selectPlan(btn.dataset.plan));
    });
  };

  const renderClasses = () => {
    classList.innerHTML = UPCOMING_CLASSES.map(
      (c) => `
        <button type="button" class="book__class" data-class="${c.id}">
          <span class="book__class-when">${c.when}</span>
          <span>
            <span class="book__class-name">${c.name}</span>
            <span class="book__class-tag">${c.tag}</span>
          </span>
          <span class="book__class-tag">${c.date}</span>
        </button>`
    ).join("");

    classList.querySelectorAll(".book__class").forEach((btn) => {
      btn.addEventListener("click", () => selectClass(btn.dataset.class));
    });
  };

  /* ---------- ACTIONS ---------- */
  const selectPlan = (id) => {
    state.planId = id;
    state.classId = null;
    planList.querySelectorAll(".book__plan").forEach((b) => {
      b.classList.toggle("is-selected", b.dataset.plan === id);
    });

    const plan = PLANS.find((p) => p.id === id);
    if (plan && plan.requiresClass) {
      classStep.hidden = false;
      detailsStepNum.textContent = "3";
      renderClasses();
    } else {
      classStep.hidden = true;
      detailsStepNum.textContent = "2";
    }
    updateSummary();
  };

  const selectClass = (id) => {
    state.classId = id;
    classList.querySelectorAll(".book__class").forEach((b) => {
      b.classList.toggle("is-selected", b.dataset.class === id);
    });
    updateSummary();
  };

  const updateSummary = () => {
    const plan = PLANS.find((p) => p.id === state.planId);
    if (!plan) {
      summaryItem.textContent = "No plan selected";
      summaryPrice.textContent = "—";
      summaryTotal.textContent = "$0";
      summaryClassRow.hidden = true;
      checkoutBtn.disabled = true;
      return;
    }

    summaryItem.textContent = plan.name;
    summaryPrice.textContent = plan.priceLabel;
    summaryTotal.textContent = "$" + plan.price + (plan.recurring ? "/mo" : "");

    if (plan.requiresClass) {
      const cls = UPCOMING_CLASSES.find((c) => c.id === state.classId);
      if (cls) {
        summaryClassRow.hidden = false;
        summaryClass.textContent = cls.when + " · " + cls.name;
        checkoutBtn.disabled = false;
      } else {
        summaryClassRow.hidden = true;
        checkoutBtn.disabled = true;
      }
    } else {
      summaryClassRow.hidden = true;
      checkoutBtn.disabled = false;
    }
  };

  /* ---------- CHECKOUT ---------- */
  const handleCheckout = async () => {
    if (!form.reportValidity()) return;

    const plan = PLANS.find((p) => p.id === state.planId);
    if (!plan) return;

    const data = new FormData(form);
    const payload = {
      priceId: plan.stripePriceId,
      planId: plan.id,
      classId: state.classId,
      mode: plan.recurring ? "subscription" : "payment",
      customer: {
        name: (data.get("name") || "").toString().trim(),
        email: (data.get("email") || "").toString().trim(),
        phone: (data.get("phone") || "").toString().trim(),
        firstTime: !!data.get("firsttime")
      }
    };

    checkoutBtn.disabled = true;
    checkoutBtn.textContent = "Connecting to Stripe…";

    try {
      if (STRIPE_LIVE) {
        const res = await fetch(CHECKOUT_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error("Checkout session creation failed");
        const { url } = await res.json();
        window.location.href = url;
        return;
      }

      // Demo mode — simulate a successful booking
      await new Promise((r) => setTimeout(r, 900));
      showSuccess(payload);
    } catch (err) {
      console.error(err);
      alert("Sorry, something went wrong. Please try again or call (413) 555-1234.");
    } finally {
      checkoutBtn.disabled = false;
      checkoutBtn.textContent = "Continue to secure checkout →";
    }
  };

  /* ---------- SUCCESS MODAL ---------- */
  const modal = document.getElementById("successModal");
  const successBody = document.getElementById("successBody");
  const successClose = document.getElementById("successClose");

  const showSuccess = (payload) => {
    if (successBody) {
      const first = (payload.customer.name || "").split(" ")[0] || "there";
      successBody.textContent = `${first}, a confirmation is on its way to ${payload.customer.email}. Looking forward to practicing with you.`;
    }
    if (modal) {
      modal.hidden = false;
    }
    form.reset();
    state.planId = null;
    state.classId = null;
    planList.querySelectorAll(".book__plan").forEach((b) => b.classList.remove("is-selected"));
    classStep.hidden = true;
    updateSummary();
  };

  if (successClose && modal) {
    successClose.addEventListener("click", () => {
      modal.hidden = true;
    });
    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.hidden = true;
    });
  }

  /* ---------- INIT ---------- */
  renderPlans();

  // Pre-select plan/class from URL query params (deep links from main page)
  const params = new URLSearchParams(window.location.search);
  const planParam = params.get("plan") || params.get("retreat") || params.get("workshop");
  if (planParam && PLANS.some((p) => p.id === planParam)) {
    selectPlan(planParam);
  } else if (params.get("class")) {
    selectPlan("dropin");
    // Note: the named class from the homepage doesn't always match the
    // upcoming-class IDs, but selecting drop-in surfaces the class list.
  }

  if (checkoutBtn) checkoutBtn.addEventListener("click", handleCheckout);
})();
