import { router } from "./_core/trpc";
import { systemRouter } from "./_core/systemRouter";
import { authRouter } from "./routers/auth";
import { centresRouter } from "./routers/centres";
import { sitesRouter, usageTypesRouter } from "./routers/sites";
import { bookingsRouter } from "./routers/bookings";
import { profileRouter } from "./routers/profile";
import { searchRouter } from "./routers/search";
import { adminRouter } from "./routers/admin";
import { usersRouter } from "./routers/users";
import { usageCategoriesRouter } from "./routers/usageCategories";
import { searchAnalyticsRouter } from "./routers/searchAnalytics";
import { systemConfigRouter } from "./routers/systemConfig";
import { faqsRouter } from "./routers/faqs";
import { dashboardRouter } from "./routers/dashboard";
import { budgetsRouter } from "./routers/budgets";
import { ownersRouter } from "./routers/owners";
import { adminBookingRouter } from "./routers/adminBooking";
import { portfoliosRouter } from "./routers/portfolios";
import {
  thirdLineCategoriesRouter,
  vacantShopsRouter,
  thirdLineIncomeRouter,
  assetsRouter,
  vacantShopBookingsRouter,
  thirdLineBookingsRouter,
} from "./routers/assets";

export const appRouter = router({
  system: systemRouter,
  auth: authRouter,
  centres: centresRouter,
  sites: sitesRouter,
  bookings: bookingsRouter,
  profile: profileRouter,
  usageTypes: usageTypesRouter,
  search: searchRouter,
  admin: adminRouter,
  usageCategories: usageCategoriesRouter,
  users: usersRouter,
  searchAnalytics: searchAnalyticsRouter,
  systemConfig: systemConfigRouter,
  faqs: faqsRouter,
  dashboard: dashboardRouter,
  budgets: budgetsRouter,
  thirdLineCategories: thirdLineCategoriesRouter,
  vacantShops: vacantShopsRouter,
  thirdLineIncome: thirdLineIncomeRouter,
  assets: assetsRouter,
  vacantShopBookings: vacantShopBookingsRouter,
  thirdLineBookings: thirdLineBookingsRouter,
  adminBooking: adminBookingRouter,
  owners: ownersRouter,
  portfolios: portfoliosRouter,
});

export type AppRouter = typeof appRouter;
