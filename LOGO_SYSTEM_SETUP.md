# Logo Management System - Setup Instructions

## Overview

Your platform now has a complete logo management system where MegaAdmin can select from 5 different logo options. The selected logo appears everywhere:

✅ Homepage header
✅ All public pages  
✅ Admin dashboard
✅ Customer dashboard
✅ Email templates
✅ PDF invoices
✅ Reports and exports

---

## Database Setup

The logo management uses your existing `system_config` table. Add these entries:

```sql
-- Set default logo selection
INSERT INTO system_config (key, value) 
VALUES ('selected_logo', 'logo_1')
ON CONFLICT (key) DO NOTHING;

-- Optional: Store custom logo URLs (if uploaded through admin)
-- These are created automatically when logos are uploaded
-- INSERT INTO system_config (key, value) VALUES ('logo_1_url', 'https://...');
-- INSERT INTO system_config (key, value) VALUES ('logo_2_url', 'https://...');
-- etc.
```

Run this SQL in your database, or it will be created automatically on first use.

---

## Logo Files Setup

You have two options for providing the 5 logo files:

### Option 1: Place Static Files (Simplest)

1. Create folder: `client/public/logos/`
2. Add 5 logo files:
   - `logo_1.png`
   - `logo_2.png`
   - `logo_3.png`
   - `logo_4.png`
   - `logo_5.png`

**Recommended specs:**
- Format: PNG with transparent background (or SVG)
- Dimensions: 400-600px wide × 100-200px tall
- File size: Under 500KB each
- High resolution for crisp display

### Option 2: Upload Through Admin (Flexible)

1. Access: `/admin/logo-management` (MegaAdmin only)
2. Click on any logo slot
3. Click "Choose File" and upload your logo
4. Logos are stored in AWS S3 at: `logos/logo_1.png`, etc.

This option allows you to change logos anytime without redeploying code.

---

## Creating Logo Files (If You Don't Have Them)

### Temporary Placeholders

Until you have your actual logos, create simple placeholder files:

**Using online tools:**
1. Go to: https://www.canva.com (free)
2. Create a "Logo" design (400 × 120px)
3. Add your company name text
4. Download as PNG with transparent background
5. Repeat 5 times with variations (colors, styles, etc.)

**Using Photoshop/GIMP:**
1. Create 400 × 120px canvas
2. Add your company name/icon
3. Export as PNG with transparency
4. Save as logo_1.png, logo_2.png, etc.

### Logo Variations Ideas

Create 5 versions of your brand:
1. **logo_1.png** - Full color standard version
2. **logo_2.png** - White version (for dark backgrounds)
3. **logo_3.png** - Monochrome/black version
4. **logo_4.png** - Icon only (no text)
5. **logo_5.png** - Horizontal layout alternative

---

## How It Works

### For Users (Public)
- Homepage and all pages display the selected logo
- Logo updates instantly when MegaAdmin changes selection
- No page reload needed (React handles updates)

### For MegaAdmin
1. Log in as MegaAdmin
2. Go to: `/admin/logo-management`
3. See all 5 logo options displayed
4. Click any logo to make it active
5. Upload new logos to any slot anytime
6. Changes apply instantly across entire platform

### For Developers
The Logo component automatically:
- Fetches current logo selection from API
- Updates when selection changes
- Works in all contexts (public, admin, PDFs)
- Caches for performance

---

## Where Logos Appear

### Frontend Pages
- ✅ Homepage (`/`)
- ✅ Search results
- ✅ Centre details
- ✅ Site details
- ✅ Booking pages
- ✅ Customer dashboard
- ✅ My Bookings
- ✅ Profile page

### Admin Dashboard
- ✅ All admin pages sidebar
- ✅ Dashboard header
- ✅ Report headers

### Documents & Emails
- ✅ Booking confirmation emails
- ✅ Rejection emails
- ✅ Invoice PDFs
- ✅ Weekly reports
- ✅ Export documents

---

## API Endpoints

### Public Endpoints
```typescript
systemConfig.getCurrentLogo()
// Returns: { selectedLogo: "logo_1" }

systemConfig.getAllLogos()
// Returns: {
//   logo_1: "/logos/logo_1.png",
//   logo_2: "/logos/logo_2.png",
//   ...
// }
```

### Admin Endpoints (MegaAdmin Only)
```typescript
systemConfig.setLogo({ logoId: "logo_2" })
// Switches active logo

systemConfig.uploadLogo({
  logoId: "logo_3",
  base64Image: "data:image/png;base64,...",
  fileName: "new-logo.png"
})
// Uploads new logo to a slot
```

---

## Usage in Code

### React Components
```tsx
import Logo from "@/components/Logo";

// Default size
<Logo />

// Custom size
<Logo width={200} height={60} />

// With custom classes
<Logo className="h-12 hover:opacity-80" />
```

### Using the Hook Directly
```tsx
import { useLogo } from "@/hooks/useLogo";

function MyComponent() {
  const { currentLogoUrl, selectedLogoId } = useLogo();
  
  return <img src={currentLogoUrl} alt="Logo" />;
}
```

### In Email Templates (Backend)
```typescript
import { getConfigValue } from "./systemConfigDb";

async function generateEmail() {
  const selectedLogo = await getConfigValue("selected_logo") || "logo_1";
  const logoUrl = await getConfigValue(`${selectedLogo}_url`) || 
                  `/logos/${selectedLogo}.png`;
  
  // Use logoUrl in email HTML
}
```

---

## Migration Checklist

- [ ] Run database setup SQL (or wait for auto-creation)
- [ ] Create `client/public/logos/` folder
- [ ] Add 5 logo files (logo_1.png through logo_5.png)
- [ ] Or use upload feature after deployment
- [ ] Test logo appears on homepage
- [ ] Log in as MegaAdmin
- [ ] Access `/admin/logo-management`
- [ ] Test selecting different logos
- [ ] Verify logo changes across pages

---

## Troubleshooting

### Logo not appearing
1. Check files exist in `client/public/logos/`
2. Check file names exactly match: `logo_1.png`, `logo_2.png`, etc.
3. Clear browser cache (Ctrl+F5)
4. Check browser console for 404 errors

### Can't access logo management page
1. Make sure logged in as `mega_admin` role
2. Check URL is exactly `/admin/logo-management`
3. Verify route added to App.tsx

### Upload not working
1. Check file size < 2MB
2. Check file type is image (PNG, JPG, SVG)
3. Check S3 storage is configured correctly
4. Check browser console for errors

### Logo looks pixelated
1. Use higher resolution source file
2. Prefer PNG or SVG over JPG
3. Recommended: 600px wide minimum
4. Use 2x resolution for retina displays

---

## Example Logo Files Structure

```
client/public/
└── logos/
    ├── logo_1.png    (400 × 120px, transparent, full color)
    ├── logo_2.png    (400 × 120px, transparent, white text)
    ├── logo_3.png    (400 × 120px, transparent, black text)
    ├── logo_4.png    (120 × 120px, transparent, icon only)
    └── logo_5.png    (600 × 150px, transparent, wide version)
```

---

## Best Practices

### Design
- Keep it simple and readable at small sizes
- Use high contrast colors
- Transparent background preferred
- Test on both light and dark backgrounds
- Ensure text is legible when scaled down

### Technical
- PNG with transparency > JPG
- SVG > PNG (scales perfectly)
- Optimize file size (use TinyPNG.com)
- Test on mobile devices
- Provide 2x version for retina

### Management
- Name variations descriptively in admin
- Upload all 5 slots even if similar
- Test each logo before making it live
- Keep source files backed up
- Document which logo is for what use case

---

## Security

- ✅ Only MegaAdmin can change logos
- ✅ Only MegaAdmin can upload new logos
- ✅ File type validation (images only)
- ✅ File size limits (2MB max)
- ✅ Secure S3 storage
- ✅ URLs are publicly readable (as needed for display)

---

## Questions?

Ask me for help with:
- Creating logo variations
- Troubleshooting display issues
- Customizing the component
- Adding logos to specific places
- PDF/email integration

---

**Ready to use!** Just add your 5 logo files and start switching between them.
