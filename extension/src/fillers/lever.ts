// Fills Lever application form fields
// Lever uses React-controlled inputs — must use nativeInputValueSetter trick

export interface ApplyPayload {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  linkedin_url: string | null;
  resume_url: string;
  resume_base64?: string;
  resume_filename?: string;
  skills: string[];
  university?: string | null;
  grad_month_year?: string | null;
  major?: string | null;
  website_url?: string | null;
  work_authorized?: boolean;
  // Phase 1 smart form fill
  nationality?: string | null;
  degree_type?: string | null;
  current_city?: string | null;
  availability_date?: string | null;
  notice_period?: string | null;
  years_experience?: string | null;
  expected_salary_sgd?: number | null;
  expected_salary_hkd?: number | null;
  gender?: string | null;
  ethnicity?: string | null;
  disability_status?: string | null;
  veteran_status?: string | null;
  referral_source?: string | null;
  cover_letter_default?: string | null;
}

function setReactInputValue(el: HTMLInputElement, value: string): void {
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    "value"
  )?.set;
  nativeInputValueSetter?.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

/** Find an input by matching label text (case-insensitive prefix match). */
function findByLabelText(text: string): HTMLInputElement | null {
  const labels = document.querySelectorAll<HTMLLabelElement>("label");
  for (const label of labels) {
    if (label.textContent?.trim().toLowerCase().startsWith(text.toLowerCase())) {
      if (label.htmlFor) {
        const el = document.getElementById(label.htmlFor) as HTMLInputElement | null;
        if (el?.tagName === "INPUT") return el;
      }
      const parent = label.closest(".application-field, .application-question, div");
      if (parent) {
        const el = parent.querySelector<HTMLInputElement>(
          'input:not([type="hidden"]):not([type="file"])'
        );
        if (el) return el;
      }
    }
  }
  return null;
}

function findInput(
  strategies: Array<() => HTMLInputElement | null>
): HTMLInputElement | null {
  for (const s of strategies) {
    const el = s();
    if (el) return el;
  }
  return null;
}

function fillField(input: HTMLInputElement | null, value: string): void {
  if (input) setReactInputValue(input, value);
}

function attachResume(base64: string, filename: string): void {
  const fileInput = document.querySelector<HTMLInputElement>(
    ".resume-section input[type='file'], input[type='file'][name='resume'], input[type='file']"
  );
  console.log("[NUSwipe lever] attachResume: fileInput found:", !!fileInput, fileInput?.name, fileInput?.accept);
  if (!fileInput) return;

  const byteString = atob(base64);
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
  const blob = new Blob([ab], { type: "application/pdf" });
  const file = new File([blob], filename, { type: "application/pdf" });

  const dt = new DataTransfer();
  dt.items.add(file);
  fileInput.files = dt.files;
  // Dispatch both change and input — React may listen to either depending on version
  fileInput.dispatchEvent(new Event("change", { bubbles: true }));
  fileInput.dispatchEvent(new Event("input", { bubbles: true }));
  console.log("[NUSwipe lever] attachResume: dispatched change+input, files.length:", fileInput.files?.length);

  // Lever does an async upload when it detects the file — retry after 1s to confirm UI updated
  setTimeout(() => {
    const resumeSection = document.querySelector(".resume-section, [class*='resume']");
    const hasFilename = resumeSection?.textContent?.includes(filename.replace(".pdf", "")) ?? false;
    console.log("[NUSwipe lever] attachResume 1s check — resume section text:", resumeSection?.textContent?.slice(0, 80), "| filename visible:", hasFilename);
  }, 1000);
}

export function fillLeverForm(payload: ApplyPayload): void {
  console.log("[NUSwipe lever] fillLeverForm called, payload:", {
    name: `${payload.first_name} ${payload.last_name}`,
    email: payload.email,
    phone: payload.phone,
    university: payload.university,
    grad: payload.grad_month_year,
  });

  // Full name
  const nameInput = findInput([
    () => document.querySelector<HTMLInputElement>('input[name="name"]'),
    () => findByLabelText("full name"),
    () => findByLabelText("name"),
  ]);
  console.log("[NUSwipe lever] name input found:", !!nameInput, nameInput?.name, nameInput?.placeholder);
  fillField(nameInput, `${payload.first_name} ${payload.last_name}`);

  // Email
  fillField(
    findInput([
      () => document.querySelector<HTMLInputElement>('input[type="email"]'),
      () => document.querySelector<HTMLInputElement>('input[name="email"]'),
      () => findByLabelText("email"),
    ]),
    payload.email
  );

  // Phone
  fillField(
    findInput([
      () => document.querySelector<HTMLInputElement>('input[type="tel"]'),
      () => document.querySelector<HTMLInputElement>('input[name="phone"]'),
      () => findByLabelText("phone"),
    ]),
    payload.phone
  );

  // LinkedIn URL
  if (payload.linkedin_url) {
    fillField(
      findInput([
        () => findByLabelText("linkedin"),
        () => document.querySelector<HTMLInputElement>('input[placeholder*="LinkedIn" i]'),
        () => document.querySelector<HTMLInputElement>('input[name="urls[LinkedIn]"]'),
      ]),
      payload.linkedin_url
    );
  }

  // University / School
  if (payload.university) {
    fillField(
      findInput([
        () => findByLabelText("school"),
        () => findByLabelText("university"),
        () => findByLabelText("college"),
        () => document.querySelector<HTMLInputElement>('input[name*="school" i], input[name*="university" i]'),
      ]),
      payload.university
    );
  }

  // Graduation year (extract 4-digit year from "May 2025" or "2025-05")
  if (payload.grad_month_year) {
    const yearMatch = payload.grad_month_year.match(/\d{4}/);
    if (yearMatch) {
      fillField(
        findInput([
          () => findByLabelText("graduation"),
          () => findByLabelText("expected graduation"),
          () => findByLabelText("grad year"),
          () => document.querySelector<HTMLInputElement>('input[name*="grad" i]'),
        ]),
        yearMatch[0]
      );
    }
  }

  // Website / Portfolio
  if (payload.website_url) {
    fillField(
      findInput([
        () => findByLabelText("website"),
        () => findByLabelText("portfolio"),
        () => findByLabelText("personal site"),
        () => document.querySelector<HTMLInputElement>('input[name*="website" i], input[name*="portfolio" i]'),
      ]),
      payload.website_url
    );
  }

  // Location is handled by fillLeverCustomQuestions (typeahead with retry logic)

  // Nationality — try native select + typeahead
  if (payload.nationality) {
    // Native select
    const natSelects = document.querySelectorAll<HTMLSelectElement>("select");
    for (const sel of natSelects) {
      const lbl = document.querySelector<HTMLLabelElement>(`label[for="${sel.id}"]`);
      if (lbl?.textContent?.toLowerCase().includes("national")) {
        const opt = Array.from(sel.options).find((o) =>
          o.text.toLowerCase().includes(payload.nationality!.toLowerCase())
        );
        if (opt) { sel.value = opt.value; sel.dispatchEvent(new Event("change", { bubbles: true })); }
      }
    }
    // Typeahead input
    const natInput = findInput([
      () => findByLabelText("nationality"),
      () => findByLabelText("citizenship"),
      () => document.querySelector<HTMLInputElement>('input[name*="national" i]'),
    ]);
    if (natInput) {
      fillField(natInput, payload.nationality);
      setTimeout(() => {
        const suggestions = document.querySelectorAll<HTMLElement>(
          "[role='option'], [role='listbox'] li, .autocomplete-option, [class*='suggestion'], [class*='option']"
        );
        for (const s of suggestions) {
          if (s.textContent?.toLowerCase().includes(payload.nationality!.toLowerCase())) {
            s.click();
            break;
          }
        }
      }, 800);
    }
  }

  // Availability / start date
  if (payload.availability_date) {
    fillField(
      findInput([
        () => findByLabelText("start date"),
        () => findByLabelText("available"),
        () => findByLabelText("earliest start"),
        () => document.querySelector<HTMLInputElement>('input[name*="start_date" i], input[name*="available" i]'),
      ]),
      payload.availability_date
    );
  }

  // Notice period
  if (payload.notice_period) {
    fillField(
      findInput([
        () => findByLabelText("notice period"),
        () => findByLabelText("notice"),
        () => document.querySelector<HTMLInputElement>('input[name*="notice" i]'),
      ]),
      payload.notice_period
    );
    // Also try select elements
    const noticeSel = document.querySelector<HTMLSelectElement>('select[name*="notice" i]');
    if (noticeSel) {
      const opt = Array.from(noticeSel.options).find((o) =>
        o.text.toLowerCase().includes(payload.notice_period!.toLowerCase())
      );
      if (opt) { noticeSel.value = opt.value; noticeSel.dispatchEvent(new Event("change", { bubbles: true })); }
    }
  }

  // Years of experience
  if (payload.years_experience) {
    fillField(
      findInput([
        () => findByLabelText("years of experience"),
        () => findByLabelText("experience"),
        () => document.querySelector<HTMLInputElement>('input[name*="experience" i]'),
      ]),
      payload.years_experience
    );
  }

  // Expected salary — prefer SGD for SG jobs, HKD for HK jobs
  const expectedSalary = payload.expected_salary_sgd ?? payload.expected_salary_hkd;
  if (expectedSalary) {
    fillField(
      findInput([
        () => findByLabelText("expected salary"),
        () => findByLabelText("salary expectation"),
        () => findByLabelText("desired salary"),
        () => document.querySelector<HTMLInputElement>('input[name*="salary" i]'),
      ]),
      expectedSalary.toString()
    );
  }

  // How did you hear about us
  if (payload.referral_source) {
    fillField(
      findInput([
        () => findByLabelText("how did you hear"),
        () => findByLabelText("how did you find"),
        () => findByLabelText("referral"),
        () => document.querySelector<HTMLInputElement>('input[name*="referral" i], input[name*="source" i]'),
      ]),
      payload.referral_source
    );
    // Try select too
    const refSels = document.querySelectorAll<HTMLSelectElement>("select");
    for (const sel of refSels) {
      const lbl = document.querySelector<HTMLLabelElement>(`label[for="${sel.id}"]`);
      if (lbl?.textContent?.toLowerCase().includes("hear about")) {
        const opt = Array.from(sel.options).find((o) =>
          o.text.toLowerCase().includes((payload.referral_source ?? "").toLowerCase())
        );
        if (opt) { sel.value = opt.value; sel.dispatchEvent(new Event("change", { bubbles: true })); }
      }
    }
  }

  // Cover letter / additional info text areas
  if (payload.cover_letter_default) {
    const textareas = document.querySelectorAll<HTMLTextAreaElement>("textarea");
    for (const ta of textareas) {
      const id = ta.id || ta.name || "";
      const label = document.querySelector<HTMLLabelElement>(`label[for="${ta.id}"]`);
      const labelText = (label?.textContent ?? "").toLowerCase();
      if (
        labelText.includes("cover letter") ||
        labelText.includes("additional info") ||
        labelText.includes("tell us") ||
        id.toLowerCase().includes("cover") ||
        id.toLowerCase().includes("additional")
      ) {
        const nativeSetter = Object.getOwnPropertyDescriptor(
          window.HTMLTextAreaElement.prototype, "value"
        )?.set;
        nativeSetter?.call(ta, payload.cover_letter_default);
        ta.dispatchEvent(new Event("input", { bubbles: true }));
        ta.dispatchEvent(new Event("change", { bubbles: true }));
      }
    }
  }

  // EEO selects — gender, ethnicity, disability, veteran
  if (payload.gender || payload.ethnicity || payload.disability_status || payload.veteran_status) {
    const eeoSelects = document.querySelectorAll<HTMLSelectElement>("select");
    for (const sel of eeoSelects) {
      const lbl = document.querySelector<HTMLLabelElement>(`label[for="${sel.id}"]`);
      const lt = (lbl?.textContent ?? "").toLowerCase();
      let targetValue: string | null = null;
      if ((lt.includes("gender") || lt.includes("sex")) && payload.gender) targetValue = payload.gender;
      else if ((lt.includes("race") || lt.includes("ethnic")) && payload.ethnicity) targetValue = payload.ethnicity;
      else if (lt.includes("disab") && payload.disability_status) targetValue = payload.disability_status;
      else if (lt.includes("veteran") && payload.veteran_status) targetValue = payload.veteran_status;
      if (targetValue) {
        const opt = Array.from(sel.options).find((o) =>
          o.text.toLowerCase().includes(targetValue!.toLowerCase())
        );
        if (opt) { sel.value = opt.value; sel.dispatchEvent(new Event("change", { bubbles: true })); }
      }
    }
  }

  // Work authorization — try to select "Yes" on any auth-related select/checkbox
  if (payload.work_authorized !== undefined) {
    const authValue = payload.work_authorized ? "Yes" : "No";
    // Try text inputs first
    fillField(findByLabelText("authorized to work"), authValue);
    fillField(findByLabelText("legally authorized"), authValue);
    // Try select elements
    const selects = document.querySelectorAll<HTMLSelectElement>("select");
    for (const sel of selects) {
      const label = document.querySelector<HTMLLabelElement>(`label[for="${sel.id}"]`);
      const labelText = label?.textContent?.toLowerCase() ?? "";
      if (labelText.includes("authorized") || labelText.includes("work permit") || labelText.includes("eligible to work")) {
        const targetOption = Array.from(sel.options).find(
          (o) => o.text.toLowerCase().startsWith(payload.work_authorized ? "yes" : "no")
        );
        if (targetOption) {
          sel.value = targetOption.value;
          sel.dispatchEvent(new Event("change", { bubbles: true }));
        }
      }
    }
  }

  // Lever custom question dropdowns (.application-question sections)
  // These use React-rendered divs/buttons, not native <select>. We match
  // question label text to known payload values and click the matching option.
  fillLeverCustomQuestions(payload);

  if (payload.resume_base64 && payload.resume_filename) {
    attachResume(payload.resume_base64, payload.resume_filename);
  }
}

/**
 * Fills Lever's custom "Additional Questions" section.
 *
 * Strategy: label-first, not container-first.
 * Lever uses multiple DOM structures across versions/companies — scanning ALL
 * labels on the page and matching text is the most robust approach.
 */
function fillLeverCustomQuestions(payload: ApplyPayload): void {
  const referralMap: Record<string, string[]> = {
    "LinkedIn": ["linkedin"],
    "University career fair": ["university", "student club", "campus"],
    "NUSwipe": ["other"],
    "Company website": ["company career", "company website"],
    "Friend / referral": ["friend", "colleague", "referral"],
    "Job board": ["job board", "indeed", "glassdoor"],
    "Other": ["other"],
  };
  const referralKeywords = referralMap[payload.referral_source ?? ""] ?? ["other"];

  const questionMap: Array<{
    keywords: string[];
    value: string | null | undefined;
    isTypeahead?: boolean;
    optionKeywords?: string[];
  }> = [
    // Use specific phrases to avoid matching the standard "Current location" text input label
    { keywords: ["where do you currently live", "where are you currently based", "currently live"], value: payload.current_city },
    { keywords: ["nationality", "citizenship", "citizen"], value: payload.nationality },
    { keywords: ["current company", "current employer", "employer name"], value: null },
    { keywords: ["current school", "school name", "university name", "college"], value: payload.university },
    // "Source of Applicants" is Binance's label for how-did-you-hear
    { keywords: ["how did you hear", "how did you find", "how did you learn", "source of application", "source of hire", "source of applicant"], value: payload.referral_source ?? "Other", optionKeywords: referralKeywords },
    { keywords: ["notice period", "notice", "when can you start", "earliest start"], value: payload.notice_period },
    { keywords: ["years of experience", "years experience"], value: payload.years_experience },
    { keywords: ["expected salary", "salary expectation", "desired salary"], value: payload.expected_salary_sgd?.toString() ?? payload.expected_salary_hkd?.toString() },
    { keywords: ["eligible to work", "work eligibility", "authorized to work", "right to work", "work permit", "work in the country"], value: payload.work_authorized ? "Yes" : "No", optionKeywords: payload.work_authorized ? ["yes"] : ["no"] },
  ];

  // Debug: show what we're working with
  console.log("[NUSwipe lever] custom questions payload:", {
    nationality: payload.nationality,
    current_city: payload.current_city,
    work_authorized: payload.work_authorized,
    referral_source: payload.referral_source,
  });

  // ── Phase 1: Label-first scan ─────────────────────────────────────────────
  // Covers standard Lever fields (<label>) and section headings (<h4>).
  // NOTE: Lever's custom dropdown question labels ("Where do you currently
  // live?", "What is your nationality?") are rendered as plain <div> elements
  // with no class — they are NOT found here. Phase 2 handles those.
  const textEls = document.querySelectorAll<HTMLElement>(
    "label, legend, h2, h3, h4, [class*='question-label']"
  );

  console.log("[NUSwipe lever] scanning", textEls.length, "label/heading elements for custom questions");

  // Track which questions have been handled to avoid double-filling
  const handled = new Set<string>();

  for (const el of textEls) {
    const elText = el.textContent?.trim().toLowerCase() ?? "";
    if (!elText || elText.length > 200) continue; // skip empty or huge blobs

    for (const { keywords, value, isTypeahead, optionKeywords } of questionMap) {
      if (!value) {
        // Log when we match a label but have no value to fill (helps diagnose profile gaps)
        if (keywords.some((kw) => elText.includes(kw))) {
          console.log("[NUSwipe lever] skip (null value) for:", keywords[0], "| label:", elText.slice(0, 50));
        }
        continue;
      }
      if (handled.has(keywords[0])) continue;
      if (!keywords.some((kw) => elText.includes(kw))) continue;

      console.log("[NUSwipe lever] matched question:", elText.slice(0, 60), "→ filling with:", value);
      handled.add(keywords[0]);

      // Walk up to find the question's container (the nearest ancestor that
      // also contains the form control)
      const container = findQuestionContainer(el);

      // ── A. Radio group ──────────────────────────────────────────────────
      const radios = container.querySelectorAll<HTMLInputElement>('input[type="radio"]');
      if (radios.length > 0) {
        const terms = optionKeywords ?? [value.toLowerCase()];
        let picked: HTMLInputElement | null = null;
        for (const term of terms) {
          for (const r of radios) {
            const lbl = (r.labels?.[0]?.textContent ?? r.nextSibling?.textContent ?? r.value).toLowerCase();
            if (lbl.includes(term)) { picked = r; break; }
          }
          if (picked) break;
        }
        // Fallback: "Other" radio
        if (!picked) {
          for (const r of radios) {
            const lbl = (r.labels?.[0]?.textContent ?? r.value).toLowerCase();
            if (lbl.includes("other")) { picked = r; break; }
          }
        }
        if (picked) {
          picked.click();
          picked.dispatchEvent(new Event("change", { bubbles: true }));
          console.log("[NUSwipe lever] radio clicked:", picked.value);
        } else {
          console.log("[NUSwipe lever] no matching radio for:", value);
        }
        break;
      }

      // ── B. Native <select> ──────────────────────────────────────────────
      const nativeSel = container.querySelector<HTMLSelectElement>("select");
      if (nativeSel && nativeSel.options.length > 1) {
        const terms = [value.toLowerCase(), ...(optionKeywords ?? [])];
        let opt: HTMLOptionElement | undefined;
        for (const term of terms) {
          opt = Array.from(nativeSel.options).find((o) => o.text.toLowerCase().includes(term));
          if (opt) break;
        }
        if (opt) {
          const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, "value")?.set;
          setter?.call(nativeSel, opt.value);
          nativeSel.dispatchEvent(new Event("change", { bubbles: true }));
          console.log("[NUSwipe lever] native select filled:", opt.text);
          break;
        }
      }

      // ── C. Text input / typeahead (only if input is visibly rendered) ────
      // Lever's React dropdowns embed a hidden internal input (width: 0).
      // Skip those and fall through to handler D (React dropdown click).
      const textInput = container.querySelector<HTMLInputElement>(
        'input:not([type="hidden"]):not([type="radio"]):not([type="checkbox"]):not([type="submit"])'
      );
      const inputIsVisible = textInput
        ? textInput.offsetWidth > 0 || textInput.offsetHeight > 0
        : false;
      if (textInput && inputIsVisible) {
        fillField(textInput, value);
        console.log("[NUSwipe lever] text input filled:", value);
        if (isTypeahead) {
          const tryClick = (attempt: number): boolean => {
            const opts = document.querySelectorAll<HTMLElement>(
              "[role='option'], [role='listbox'] li, [class*='result'], [class*='suggestion'], [class*='autocomplete'] li"
            );
            for (const o of opts) {
              if (o.textContent?.toLowerCase().includes(value.toLowerCase())) {
                o.click();
                console.log("[NUSwipe lever] typeahead suggestion clicked (attempt", attempt, "):", o.textContent?.trim());
                return true;
              }
            }
            if (attempt >= 3) {
              textInput.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", keyCode: 40, bubbles: true }));
              setTimeout(() => textInput.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", keyCode: 13, bubbles: true })), 150);
              console.log("[NUSwipe lever] typeahead: ArrowDown+Enter fallback");
            }
            return false;
          };
          setTimeout(() => { if (!tryClick(1)) setTimeout(() => { if (!tryClick(2)) setTimeout(() => tryClick(3), 1200); }, 1200); }, 1200);
        }
        break;
      }

      // ── D. React custom dropdown (click trigger, pick option from portal) ─
      const trigger = container.querySelector<HTMLElement>(
        "[role='combobox'], [role='button'], [aria-haspopup='listbox'], " +
        "[data-qa='select-trigger'], [class*='select-trigger'], " +
        "div[tabindex='0'], span[tabindex='0'], button:not([type='submit'])"
      );
      if (trigger) {
        trigger.click();
        console.log("[NUSwipe lever] React dropdown trigger clicked for:", value);
        setTimeout(() => {
          const optSel = "[role='option'], [role='listbox'] li, [data-qa='select-option'], [class*='option'], li[data-value]";
          const opts = document.querySelectorAll<HTMLElement>(optSel);
          const terms = [value.toLowerCase(), ...(optionKeywords ?? [])];
          let found = false;
          for (const term of terms) {
            for (const opt of opts) {
              if (opt.textContent?.toLowerCase().includes(term)) {
                opt.click();
                console.log("[NUSwipe lever] React dropdown picked:", opt.textContent?.trim());
                found = true;
                break;
              }
            }
            if (found) break;
          }
          if (!found) console.log("[NUSwipe lever] React dropdown: no option matched for:", value, "| terms:", terms);
        }, 700);
        break;
      }

      console.log("[NUSwipe lever] no fillable control found for:", elText.slice(0, 60));
      break;
    }
  }

  // ── Phase 2: Deep div/span scan ───────────────────────────────────────────
  // Lever's custom dropdown question labels ("Where do you currently live?",
  // "What is your nationality?") are plain <div> elements — not <label> or
  // heading elements. We scan all short-text divs/spans within the form to
  // find them. Stagger multiple dropdowns by 1.5s to avoid portal collisions.
  const unhandledDropdowns = questionMap.filter(
    (q) => q.value && !handled.has(q.keywords[0])
  );

  if (unhandledDropdowns.length > 0) {
    console.log("[NUSwipe lever] Phase 2 deep scan for", unhandledDropdowns.length, "unhandled questions");
    const formEl = document.querySelector<HTMLElement>("form") ?? document.body;
    const deepEls = formEl.querySelectorAll<HTMLElement>("div, span");

    let dropdownDelay = 0; // stagger React dropdowns

    for (const q of unhandledDropdowns) {
      let foundEl: HTMLElement | null = null;
      for (const el of deepEls) {
        // Skip containers with many children — question labels are leaf-ish nodes
        if (el.children.length > 2) continue;
        const text = el.textContent?.trim().toLowerCase() ?? "";
        if (text.length < 4 || text.length > 120) continue;
        if (q.keywords.some((kw) => text.includes(kw))) { foundEl = el; break; }
      }

      if (!foundEl) {
        console.log("[NUSwipe lever] Phase 2: not found for", q.keywords[0]);
        continue;
      }

      const val = q.value!;
      const terms = [val.toLowerCase(), ...(q.optionKeywords ?? [])];
      console.log("[NUSwipe lever] Phase 2 found:", foundEl.textContent?.trim().slice(0, 60), "→", val);
      handled.add(q.keywords[0]);

      const container = findQuestionContainer(foundEl);

      // ── Native <select> (Lever uses .application-question select) ──────────
      const nativeSel2 = container.querySelector<HTMLSelectElement>("select");
      if (nativeSel2) {
        const fillNative = () => {
          const opts = Array.from(nativeSel2.options);
          const matched = opts.find((o) => terms.some((t) => o.text.toLowerCase().includes(t)));
          if (matched) {
            const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, "value")?.set;
            setter?.call(nativeSel2, matched.value);
            nativeSel2.dispatchEvent(new Event("change", { bubbles: true }));
            console.log("[NUSwipe lever] Phase 2 native select filled:", matched.text);
          } else {
            console.log("[NUSwipe lever] Phase 2 native select: no match for", val,
              "| first options:", opts.slice(0, 5).map((o) => o.text).join(", "));
          }
        };
        fillNative();
        setTimeout(fillNative, 600); // retry if options load asynchronously
        continue;
      }

      // ── Radio group ──────────────────────────────────────────────────────
      const radios = container.querySelectorAll<HTMLInputElement>('input[type="radio"]');
      if (radios.length > 0) {
        let picked: HTMLInputElement | null = null;
        for (const term of terms) {
          for (const r of radios) {
            const lbl = (r.labels?.[0]?.textContent ?? r.nextSibling?.textContent ?? r.value).toLowerCase();
            if (lbl.includes(term)) { picked = r; break; }
          }
          if (picked) break;
        }
        if (!picked) {
          for (const r of radios) {
            if ((r.labels?.[0]?.textContent ?? r.value).toLowerCase().includes("other")) { picked = r; break; }
          }
        }
        if (picked) {
          picked.click();
          picked.dispatchEvent(new Event("change", { bubbles: true }));
          console.log("[NUSwipe lever] Phase 2 radio clicked:", picked.value);
        }
        continue;
      }

      // ── React dropdown (staggered) ────────────────────────────────────────
      // First try: ARIA/role-based trigger in the container
      let trigger = container.querySelector<HTMLElement>(
        "[role='combobox'], [role='button'], div[tabindex='0'], span[tabindex='0'], button:not([type='submit'])"
      );

      // Fallback: Lever plain-div dropdowns have no ARIA attributes.
      // Walk up from the LABEL element and find a sibling branch containing
      // a "Select…" placeholder div (the dropdown's visual placeholder text).
      if (!trigger) {
        let anc: HTMLElement | null = foundEl;
        outer: for (let d = 0; d < 6 && anc; d++) {
          anc = anc.parentElement;
          if (!anc || anc === document.body) break;
          for (const el of anc.querySelectorAll<HTMLElement>("div, span, button")) {
            if (el.contains(foundEl)) continue; // skip the label branch
            const text = el.textContent?.trim() ?? "";
            // Match "Select...", "Select…", "Select", "Select " etc.
            if (/^Select[\s.…]{0,5}$/.test(text) && el.offsetParent !== null) {
              trigger = el;
              console.log("[NUSwipe lever] Phase 2 found 'Select' placeholder for:", val);
              break outer;
            }
          }
        }
      }

      if (trigger) {
        const trig = trigger;
        const delay = dropdownDelay;
        setTimeout(() => {
          trig.click();
          console.log("[NUSwipe lever] Phase 2 trigger clicked for:", val, "(delay:", delay, "ms)");
          setTimeout(() => {
            const opts = document.querySelectorAll<HTMLElement>(
              "[role='option'], [role='listbox'] li, [data-qa='select-option'], li[data-value]"
            );
            for (const term of terms) {
              for (const opt of opts) {
                if (opt.textContent?.toLowerCase().includes(term)) {
                  opt.click();
                  console.log("[NUSwipe lever] Phase 2 option picked:", opt.textContent?.trim());
                  return;
                }
              }
            }
            console.log("[NUSwipe lever] Phase 2: no option matched for:", val);
          }, 800);
        }, delay);
        dropdownDelay += 1500;
        continue;
      }

      // ── Text input fallback ────────────────────────────────────────────────
      const textInput = container.querySelector<HTMLInputElement>(
        'input:not([type="hidden"]):not([type="radio"]):not([type="checkbox"]):not([type="submit"])'
      );
      if (textInput) {
        fillField(textInput, val);
        console.log("[NUSwipe lever] Phase 2 text input filled:", val);
      }
    }
  }
}

/** Walk up from a label/heading to find the nearest ancestor that contains a form control. */
function findQuestionContainer(labelEl: HTMLElement): HTMLElement {
  let el: HTMLElement | null = labelEl.parentElement;
  while (el && el !== document.body) {
    const hasControl =
      el.querySelector('input, select, textarea, [role="combobox"], [role="listbox"], [role="button"]') !== null;
    if (hasControl) return el;
    el = el.parentElement;
  }
  // Fallback: use a wide section around the label
  return labelEl.closest("section, fieldset, form") ?? document.body;
}

export async function submitLeverForm(): Promise<boolean> {
  const submitBtn = document.querySelector<HTMLButtonElement>(
    [
      "button[type='submit'][data-qa='btn-submit-application']",
      "button[type='submit'].template-btn-submit",
      "button[type='submit'][class*='submit']",
      "button[type='submit']",
    ].join(", ")
  );
  if (!submitBtn) {
    console.log("[NUSwipe lever] no submit button found");
    return false;
  }

  // Lever/Binance forms use input[pattern] with regexes that Chrome validates
  // using the strict Unicode-sets `v` flag internally. This causes a SyntaxError
  // on submit-click that aborts the entire click. Since Lever uses React for
  // validation anyway (not HTML5 constraint validation), it's safe to strip
  // ALL pattern attributes before clicking.
  let patternCount = 0;
  document.querySelectorAll<HTMLInputElement>("input[pattern]").forEach((input) => {
    input.removeAttribute("pattern");
    patternCount++;
  });
  if (patternCount > 0) {
    console.log("[NUSwipe lever] stripped", patternCount, "pattern attr(s) before submit");
  }

  console.log("[NUSwipe lever] clicking submit:", submitBtn.textContent?.trim());
  submitBtn.click();

  return new Promise((resolve) => {
    const startUrl = location.href;
    // Wait 1.5s before polling — avoids false-positives from elements already
    // on the page that happen to match broad selectors (e.g. Lever's own success icons).
    setTimeout(() => {
      const check = setInterval(() => {
        // Only match specific post-submission success indicators, not generic class names
        const successEl = document.querySelector(
          ".confirmation-message, .application-confirmation, [data-qa='confirmation']"
        );
        const urlChanged = location.href !== startUrl;
        if (successEl || urlChanged) {
          console.log("[NUSwipe lever] success detected — successEl:", !!successEl, "urlChanged:", urlChanged, "newUrl:", location.href);
          clearInterval(check);
          resolve(true);
        }
        // Log any validation errors to help diagnose required fields
        const errorEls = document.querySelectorAll(
          ".application-field .error, [class*='field-error'], label.error, .lever-error"
        );
        if (errorEls.length > 0) {
          const msgs = Array.from(errorEls).map((e) => e.textContent?.trim()).filter(Boolean);
          console.log("[NUSwipe lever] validation errors:", msgs);
        }
      }, 500);
      setTimeout(() => {
        clearInterval(check);
        console.log("[NUSwipe lever] timeout — checking for any success/error state");
        // Last-chance check: if we're on a different URL, consider it success
        if (location.href !== startUrl) {
          resolve(true);
        } else {
          resolve(false);
        }
      }, 20_000);
    }, 1500);
  });
}
