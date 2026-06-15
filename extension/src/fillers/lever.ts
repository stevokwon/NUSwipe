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
  fileInput.dispatchEvent(new Event("change", { bubbles: true }));
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

  if (payload.resume_base64 && payload.resume_filename) {
    attachResume(payload.resume_base64, payload.resume_filename);
  }
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
