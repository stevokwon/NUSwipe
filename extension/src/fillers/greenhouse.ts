// Fills Greenhouse application form fields

export interface ApplyPayload {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  linkedin_url: string | null;
  resume_url: string;
  skills: string[];
}

function setInputValue(selector: string, value: string): void {
  const el = document.querySelector<HTMLInputElement>(selector);
  if (!el) return;
  el.value = value;
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

export function fillGreenhouseForm(payload: ApplyPayload): void {
  setInputValue("#first_name", payload.first_name);
  setInputValue("#last_name", payload.last_name);
  setInputValue("#email", payload.email);
  setInputValue("#phone", payload.phone);

  if (payload.linkedin_url) {
    setInputValue("input[name='job_application[linkedin_url]']", payload.linkedin_url);
  }
}

export async function submitGreenhouseForm(): Promise<boolean> {
  const submitBtn = document.querySelector<HTMLButtonElement>(
    "button[type='submit'], input[type='submit']"
  );
  if (!submitBtn) return false;

  submitBtn.click();

  // Wait for success indicator (URL change or success message)
  return new Promise((resolve) => {
    const startUrl = location.href;
    const check = setInterval(() => {
      const successEl = document.querySelector(".application-confirmation, .success-message");
      const urlChanged = location.href !== startUrl;
      if (successEl || urlChanged) {
        clearInterval(check);
        resolve(true);
      }
    }, 500);
    setTimeout(() => {
      clearInterval(check);
      resolve(false);
    }, 15_000);
  });
}
