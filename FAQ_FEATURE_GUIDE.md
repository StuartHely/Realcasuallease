# FAQ Feature - Complete Guide

## What's New

You now have a **Frequently Asked Questions (FAQ) section** on your homepage!

✅ **Public Homepage:** Shows clickable FAQ accordion
✅ **Admin Panel:** Full management interface to add/edit/delete FAQs
✅ **Easy to Use:** No coding required - manage everything through admin UI

---

## What Was Added

### 1. Database
- New `faqs` table to store FAQ questions and answers
- Includes 5 sample FAQs to get you started

### 2. Homepage Display
- FAQ section appears **below "How It Works"** on the homepage
- Clickable accordion - questions expand to show answers
- Only shows active FAQs in the order you set
- Automatically hides if no FAQs exist

### 3. Admin Management Page
- Full CRUD interface (Create, Read, Update, Delete)
- Drag-and-drop ordering (display order)
- Rich text support in answers (can use HTML)
- Toggle FAQs active/inactive without deleting

---

## How to Use

### For Admins: Managing FAQs

#### Step 1: Access Admin Panel
1. Log in as admin/mega admin
2. Go to: **`/admin/manage-faq`**
3. You'll see a list of all existing FAQs

#### Step 2: Create New FAQ
1. Click **"Add FAQ"** button
2. Fill in:
   - **Question** (max 500 characters)
   - **Answer** (can include basic HTML)
   - **Display Order** (0 = first, 1 = second, etc.)
   - **Active** (toggle on/off)
3. Click **"Save FAQ"**

#### Step 3: Edit Existing FAQ
1. Click the **Edit** button (pencil icon) on any FAQ
2. Make your changes
3. Click **"Save FAQ"**

#### Step 4: Delete FAQ
1. Click the **Trash** icon on any FAQ
2. Confirm deletion
3. FAQ is permanently removed

#### Step 5: Reorder FAQs
- Use the **Display Order** number when editing
- Lower numbers appear first (0, 1, 2, 3...)
- Drag handle (⋮⋮) is visual - set order via number

---

## Using HTML in Answers

You can make your answers look professional with basic HTML:

### Bold Text
```html
<strong>This is bold</strong>
```

### Line Breaks
```html
This is line 1<br>This is line 2
```

### Bullet Lists
```html
<ul>
  <li>First item</li>
  <li>Second item</li>
  <li>Third item</li>
</ul>
```

### Numbered Lists
```html
<ol>
  <li>Step one</li>
  <li>Step two</li>
  <li>Step three</li>
</ol>
```

### Links
```html
<a href="https://example.com">Click here</a>
```

### Example FAQ with HTML:
**Question:** What are your booking requirements?

**Answer:**
```html
To book a site, you need:<br><br>
<ul>
  <li><strong>Valid insurance</strong> - minimum $20M public liability</li>
  <li><strong>ABN or Company details</strong></li>
  <li><strong>Product category approval</strong> for the site</li>
</ul>
<br>
For more information, see our <a href="/booking-terms">booking terms</a>.
```

---

## Sample FAQs Included

Your system comes with 5 example FAQs:

1. **How do I book a site?**
2. **What payment methods do you accept?**
3. **How long does approval take?**
4. **What insurance do I need?**
5. **Can I cancel my booking?**

You can edit or delete these and replace with your own!

---

## Tips & Best Practices

### Writing Good FAQs

✅ **Keep questions short and clear**
- "How do I book a site?" ✓
- "What is the process and procedure for making a reservation?" ✗

✅ **Answer completely but concisely**
- 2-4 sentences is usually enough
- Break up long answers with bullet points

✅ **Use simple language**
- Write like you're talking to a friend
- Avoid jargon unless necessary

✅ **Group related questions**
- Use display order to group: all booking questions together, all payment questions together, etc.

### Organization

**Recommended order:**
1. Most asked questions first (0-2)
2. Booking process questions (3-5)
3. Payment/pricing questions (6-8)
4. Policy/terms questions (9-11)
5. Contact/support questions (12+)

### When to Hide vs Delete

**Hide (set inactive)** when:
- Seasonal question (may need again later)
- Testing new FAQ before showing publicly
- Temporarily not relevant

**Delete** when:
- Question is completely outdated
- Never needed again
- Duplicate of another FAQ

---

## Database Migration

To add the FAQs table to your database:

```bash
# Option 1: Using Drizzle (recommended)
npm run db:push

# Option 2: Manual SQL
psql your_database < migrations/add_faqs_table.sql
```

The migration includes:
- ✅ FAQs table structure
- ✅ Indexes for performance
- ✅ 5 sample FAQs to start with

---

## API Endpoints

For developers, here are the available endpoints:

### Public (no auth required)
- `faqs.list` - Get all active FAQs

### Admin only
- `faqs.listAll` - Get all FAQs (including inactive)
- `faqs.create` - Create new FAQ
- `faqs.update` - Update existing FAQ
- `faqs.delete` - Delete FAQ
- `faqs.reorder` - Reorder FAQs

---

## Troubleshooting

### "FAQs not showing on homepage"
1. Check if any FAQs are marked as **Active**
2. Check database migration ran successfully
3. Refresh browser cache (Ctrl+F5)

### "Can't access /admin/manage-faq"
1. Make sure you're logged in as admin
2. Check your user role is mega_admin or higher
3. Check route was added to App.tsx

### "HTML not rendering correctly"
1. Make sure you're using valid HTML tags
2. Don't use complex HTML - stick to basics
3. Test in admin preview first

---

## Quick Reference

### Admin URL
```
/admin/manage-faq
```

### Sample FAQ (copy-paste ready)
**Question:**
```
What happens after I submit a booking?
```

**Answer:**
```html
After submission:<br><br>
<ol>
  <li>We review your insurance and details</li>
  <li>Shopping centre approves or requests changes</li>
  <li>You receive email confirmation (usually within 48 hours)</li>
</ol>
<br>
<strong>Payment is authorized but not charged until approval.</strong>
```

---

## What's Next?

1. **Review sample FAQs** - Edit or delete them
2. **Add your real FAQs** - Questions your customers actually ask
3. **Test on homepage** - Make sure they look good
4. **Get feedback** - See if customers find them helpful
5. **Update regularly** - Add new questions as they come up

---

**Questions about this feature?**  
Ask me and I'll help you get it set up perfectly!
