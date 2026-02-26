export const ENV = {
  appId: process.env.VITE_APP_ID ?? process.env.APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  // AWS configuration - using IRSA (no hardcoded credentials needed)
  awsRegion: process.env.AWS_REGION ?? "ap-southeast-2",
  awsS3Bucket: process.env.AWS_S3_BUCKET ?? "",
  awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "",
  awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "",
  // AWS Location Service - matches Terraform module output names
  amazonLocationPlaceIndex: process.env.AMAZON_LOCATION_PLACE_INDEX ?? "casuallease-place-index",
  amazonLocationRouteCalculator: process.env.AMAZON_LOCATION_ROUTE_CALCULATOR ?? "casuallease-route-calculator",
  // SMTP configuration
  smtpHost: process.env.SMTP_HOST ?? "",
  smtpPort: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587,
  smtpSecure: process.env.SMTP_SECURE === "true",
  smtpUser: process.env.SMTP_USER ?? "",
  smtpPass: process.env.SMTP_PASS ?? "",
  smtpFrom: process.env.SMTP_FROM ?? "",
  // Stripe
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || "",
  // App URL for email links (password reset, etc.)
  appUrl: process.env.APP_URL || "http://localhost:5173",
};
