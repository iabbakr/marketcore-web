# Marketcore Web Platform

Nigeria's trusted phone verification platform — web frontend.

## 📁 Project Structure

```
marketcore/
├── index.html              ← Main landing page (checker + report + dealer CTA)
├── about.html              ← About Us
├── blog.html               ← Blog / Knowledge Hub
├── careers.html            ← Careers / Open Roles
├── contact.html            ← Contact + FAQ
├── dealers-guideline.html  ← Full dealer guide + legal agreement
├── privacy-policy.html     ← Privacy Policy
├── terms.html              ← Terms of Service
├── css/
│   └── style.css           ← All shared styles
├── js/
│   └── app.js              ← Payment flow, form logic, API calls
├── .env.example            ← All environment variable placeholders
└── README.md               ← This file
```

## 🚀 Quick Setup

### 1. Clone / unzip the project

```bash
unzip marketcore-web.zip -d marketcore
cd marketcore
```

### 2. Configure your keys

Open `index.html` and find this block near the top `<head>`:

```html
<script>
  window.MC_API_BASE     = 'https://api.marketcore.com/api/v1'; // ← your backend URL
  window.MC_PAYSTACK_KEY = 'pk_test_REPLACE_WITH_YOUR_KEY';    // ← your Paystack public key
</script>
```

Replace both values:
- **`MC_API_BASE`** — Your backend API URL (e.g. `http://localhost:5001/api/v1` for dev)
- **`MC_PAYSTACK_KEY`** — Your Paystack **public** key from [dashboard.paystack.com](https://dashboard.paystack.com/#/settings/developers)

### 3. Set up environment variables

```bash
cp .env.example .env
# Open .env and fill in ALL placeholder values
```

### 4. Deploy

This is a **static HTML site** — no build step required. Deploy to any static host:

| Host | Command / Method |
|------|-----------------|
| **Netlify** | Drag & drop the folder onto netlify.com/drop |
| **Vercel** | `vercel --prod` in the project directory |
| **cPanel** | Upload all files to `public_html/` via File Manager |
| **GitHub Pages** | Push to a repo → Settings → Pages → Deploy from branch |
| **Nginx** | Copy files to `/var/www/html/marketcore/` |

---

## 💳 Payment Flow

The site uses **Paystack Inline** for payments.

### Device Check (₦100)
1. User fills IMEI/Serial + email → clicks **Check Phone Status**
2. Payment modal appears
3. User clicks **Pay ₦100** → Paystack popup opens
4. On success → `POST /api/v1/public/device/check` with `{ paymentRef, imei/serial, email }`
5. Backend verifies payment with Paystack → queries device database → returns result
6. Result displayed on page

### Stolen Report (₦1,000)
1. User fills full form → clicks **Report Stolen Phone**
2. Payment modal appears
3. User clicks **Pay ₦1,000** → Paystack popup opens
4. On success → `POST /api/v1/public/device/report` with `{ paymentRef, ...formData }`
5. Backend verifies payment → adds to database → success confirmation shown

---

## 🔌 Backend API Endpoints Required

Your backend must implement these public endpoints:

```
POST /api/v1/public/device/check
Body: { paymentRef, imei?, serial?, email }
Response: { success: true, data: { status: "clean"|"stolen"|"flagged", ...deviceDetails } }

POST /api/v1/public/device/report
Body: { paymentRef, name, email, phone, imei?, serial, brand, model, color, description }
Response: { success: true, message: "Report submitted" }

POST /api/v1/public/contact
Body: { name, email, subject, message, reference? }
Response: { success: true }
```

All endpoints should:
1. Verify the Paystack payment reference with the Paystack API before processing
2. Return appropriate HTTP status codes
3. Never return sensitive user data

---

## 🎨 Customisation

### Brand Colors
Edit the CSS custom properties at the top of `css/style.css`:

```css
:root {
  --primary:       #1e40af;  /* Main blue */
  --primary-dark:  #1e3a8a;  /* Darker blue */
  --primary-light: #2563eb;  /* Lighter blue */
  --success:       #16a34a;  /* Green */
  --danger:        #dc2626;  /* Red */
  /* ... */
}
```

### Update App Store Links
Search for `href="#"` next to `App Store` and `Google Play` buttons and replace with your actual store URLs.

### Update Social Media Links
Find the `.footer-social` section in each page footer and replace `href="#"` with your actual profile URLs.

### Domain
Replace all occurrences of `https://marketcore.com` with your actual domain for canonical URLs and Open Graph tags.

---

## 📧 Contact Emails to Set Up

Before going live, create these email addresses:

| Email | Purpose |
|-------|---------|
| `hello@marketcore.com` | General enquiries |
| `billing@marketcore.com` | Payment issues |
| `legal@marketcore.com` | Legal and disputes |
| `dealers@marketcore.com` | Dealer support |
| `kyc@marketcore.com` | KYC issues |
| `jobs@marketcore.com` | Careers |
| `privacy@marketcore.com` | Privacy requests |
| `security@marketcore.com` | Security issues |
| `no-reply@marketcore.com` | Transactional email sender |

---

## 🔒 Security Checklist

Before launching:

- [ ] Replace all `pk_test_` Paystack keys with `pk_live_` for production
- [ ] Ensure your backend validates every Paystack payment reference before acting on it
- [ ] Set up a Paystack webhook to handle payment confirmations server-side
- [ ] Enable HTTPS on your domain (Netlify/Vercel do this automatically)
- [ ] Set `Content-Security-Policy` headers on your web server
- [ ] Add your domain to Paystack's allowed callback URLs
- [ ] Never expose `PAYSTACK_SECRET_KEY` in any frontend code
- [ ] Add `.env` to your `.gitignore`

---

## 🌐 SEO

Each page already includes:
- `<title>` and `<meta name="description">`
- Canonical URLs (`<link rel="canonical">`)
- Open Graph tags (`og:title`, `og:description`, `og:image`)
- Structured data (JSON-LD on `index.html`)
- Semantic HTML (`<nav>`, `<main>`, `<section>`, `<footer>`, `aria-*` attributes)

To complete SEO setup:
1. Replace `https://marketcore.com` with your actual domain throughout
2. Create and upload an `og-image.png` (1200×630px) for social sharing previews
3. Add a `favicon.ico` and apple touch icon
4. Submit your sitemap to Google Search Console

---

## 📞 Support

- Email: hello@marketcore.com
- Dealer support: dealers@marketcore.com