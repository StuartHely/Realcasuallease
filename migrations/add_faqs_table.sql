-- Migration: Add FAQs table
-- Created: 2024-02-16
-- Description: Add Frequently Asked Questions table for homepage

CREATE TABLE IF NOT EXISTS faqs (
  id SERIAL PRIMARY KEY,
  question VARCHAR(500) NOT NULL,
  answer TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create index on display_order for faster ordering
CREATE INDEX idx_faqs_display_order ON faqs(display_order);

-- Create index on is_active for public queries
CREATE INDEX idx_faqs_is_active ON faqs(is_active);

-- Insert some example FAQs (you can delete these and add your own through admin)
INSERT INTO faqs (question, answer, display_order, is_active) VALUES
('How do I book a site?', 'Search for your desired location and date, select an available site, complete your details, and submit your booking request. You''ll receive confirmation once approved.', 0, true),
('What payment methods do you accept?', 'We accept credit cards through our secure Stripe payment gateway. Some approved customers may also pay by invoice.', 1, true),
('How long does approval take?', 'Most bookings are approved within 48 hours. You''ll receive an email notification once your booking is approved or if we need additional information.', 2, true),
('What insurance do I need?', 'You must have public liability insurance with minimum $20 million coverage. The policy must be current and valid for the duration of your booking.', 3, true),
('Can I cancel my booking?', 'Yes, you can cancel your booking through your account. Cancellation terms depend on when you cancel - please check your booking confirmation for specific details.', 4, true);

COMMENT ON TABLE faqs IS 'Frequently Asked Questions displayed on the homepage';
COMMENT ON COLUMN faqs.question IS 'The FAQ question (max 500 characters)';
COMMENT ON COLUMN faqs.answer IS 'The FAQ answer (supports basic HTML)';
COMMENT ON COLUMN faqs.display_order IS 'Order in which FAQs appear (lower numbers first)';
COMMENT ON COLUMN faqs.is_active IS 'Whether this FAQ is visible on the homepage';
