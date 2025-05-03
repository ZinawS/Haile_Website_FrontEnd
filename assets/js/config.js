window.config = {
    // Backend API Configuration
    API_BASE_URL: 'http://localhost:3000', // Update with your backend URL
    
    // API Configuration
    YOUTUBE_API_KEY: 'AIzaSyCsf4HFsWzsVQsCq-ejmxp1Ylw4xe60ZpY',
    CHANNEL_ID: 'UCOatlaPSI3OZFE8Bwqb0DeQ',
    TIKTOK_ACCESS_TOKEN: 'YOUR_TIKTOK_ACCESS_TOKEN',
    
    // EmailJS Configuration
    EMAILJS_PUBLIC_KEY: 'a-pLR_CJjrNrZ_b2Y',
    EMAILJS_SERVICE_ID: 'service_tscqj68',
    EMAILJS_TEMPLATE_ID: 'template_yuz1rgo',
    
    // Stripe Configuration
    STRIPE_PUBLISHABLE_KEY:'pk_test_51RJ6NfB14OCoEGVMx95JADT1bBzP2VwKLdJYqDUcnKpS5d4Zc0FCRRSvbdts93EdJT9MFYxJ9KBJkTPeQimySw1Q00OsISc5hY',
}
  /*
    Strip test Cards:
    Use Stripe’s test cards:
        4242 4242 4242 4242 → Success
        4000 0000 0000 0002 → Failure
        5555 5555 5555 4444 → Generic card
        Check payments in Dashboard → Payments.
  */

   
// https://www.googleapis.com/youtube/v3/search?key=AIzaSyCsf4HFsWzsVQsCq-ejmxp1Ylw4xe60ZpY&channelId=UCOatlaPSI3OZFE8Bwqb0DeQ&part=snippet,id&order=date&maxResults=4