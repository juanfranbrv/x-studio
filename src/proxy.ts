import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { authConfig } from '@/lib/auth-config'

// Define public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  '/',
  '/privacy(.*)',
  '/terms(.*)',
  '/cookies(.*)',
  '/contact(.*)',
  '/academy(.*)',
  '/pricing(.*)',
  `${authConfig.signInPath}(.*)`,
  `${authConfig.signUpPath}(.*)`,
  `${authConfig.onboardingPath}(.*)`,
  `${authConfig.clerkWebhookPath}(.*)`,
  '/api/webhooks(.*)',
  '/api/stripe/webhook(.*)',
  '/api/dev/transactional-email(.*)',
])

export default clerkMiddleware(async (auth, request) => {
  // Protect all routes except public ones
  if (!isPublicRoute(request)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}
