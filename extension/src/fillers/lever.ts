// Fills Lever application form fields
// Lever uses React-controlled inputs — must use nativeInputValueSetter trick

export interface ApplyPayload {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  linkedin_url: string | null;
  resume_url: string;
  skills: string[];
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

function fillField(selector: string, value: string): void {
  const el = document.querySelector<HTMLInputElement>(selector);
  if (el) setReactInputValue(el, value);
}

export function fillLeverForm(payload: ApplyPayload): void {
  fillField(".application-name input", `${payload.first_name} ${payload.last_name}`);
  fillField(".application-email input", payload.email);
  fillField(".application-phone input", payload.phone);

  if (payload.linkedin_url) {
    fillField(".application-urls input", payload.linkedin_url);
  }
}

export async function submitLeverForm(): Promise<boolean> {
  const submitBtn = document.querySelector<HTMLButtonElement>(
    "button[type='submit'][data-qa='btn-submit-application']"
  );
  if (!submitBtn) return false;

  submitBtn.click();

  return new Promise((resolve) => {
    const startUrl = location.href;
    const check = setInterval(() => {
      const successEl = document.querySelector(".confirmation-message, [class*='success']");
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
