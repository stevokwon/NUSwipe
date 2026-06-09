# NUSwipe Email Confirmation Templates

Use these templates in your Supabase Dashboard under **Authentication > Email Templates**.

## 1. Confirm Signup (Candidate)

**Subject:** 🚀 Confirm your NUSwipe account

**Body:**
```html
<h2>Welcome to NUSwipe!</h2>

<p>Hi there,</p>

<p>Your email address <strong>{{ .Email }}</strong> has been registered with NUSwipe. We're excited to have you join our community of elite APAC graduates.</p>

<p>To start swiping and find your next opportunity, please confirm your email address by clicking the button below:</p>

<p>
  <a href="{{ .ConfirmationURL }}" style="background-color: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
    Confirm my email
  </a>
</p>

<p>Or copy and paste this link into your browser:</p>
<p>{{ .ConfirmationURL }}</p>

<p>Kind regards,<br>
The NUSwipe Team</p>

<p style="font-size: 12px; color: #666;">Need help? Just reply to this email.</p>
```

---

## 2. Confirm Signup (Employer)

**Subject:** 🏢 Verify your Employer Registration - NUSwipe

**Body:**
```html
<h2>Welcome to NUSwipe for Employers</h2>

<p>Hi,</p>

<p>Your email address <strong>{{ .Email }}</strong> has been registered as an employer with NUSwipe. To access your dashboard and start connecting with top-tier talent, please verify your email address below.</p>

<p>
  <a href="{{ .ConfirmationURL }}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
    Confirm Corporate Email
  </a>
</p>

<p>Or copy and paste this link into your browser:</p>
<p>{{ .ConfirmationURL }}</p>

<p>Verification helps us maintain a secure and high-quality marketplace for both employers and candidates.</p>

<p>Kind regards,<br>
The NUSwipe Team</p>

<p style="font-size: 12px; color: #666;">Need help? Please contact Customer Service by replying to this email.</p>
```

---

## Configuration Note

In your Supabase Dashboard, make sure to set the **Site URL** to your production URL (or `http://localhost:3000` for local development) and add `http://localhost:3000/auth/confirm` to the **Additional Redirect URLs**.
